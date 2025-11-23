// app/actions.ts
"use server";

// Use relative path so the module resolves at runtime
import { embedText } from "../lib/embeddings";
import { getSession } from "../lib/neo4j";
import type { Node, Record } from "neo4j-driver";

// --- INTERFACES ---

// Hasil Search Global untuk ditampilkan di page utama
export interface GlobalSearchResult {
	type: "artist" | "artwork";
	title: string;
	subtitle: string;
	linkParam: string; // parameter untuk link routing (nama artist atau id artwork)
}

// Detail Artist untuk halaman profil
export interface ArtistDetail {
	name: string;
	bio: string;
	nationality: string;
	years: string;
	wikipedia: string;
	paintings_count: number; // Total painting (dari csv atau hitungan graph)
	school?: string; // Tambahan dari info_dataset
	movements: string[];
	artworks: {
		id: string;
		title: string;
		url: string;
		year?: string;
		info?: string;
	}[];
	influencedBy: RelatedArtist[];
	influences: RelatedArtist[];
	mentors: RelatedArtist[];
	students: RelatedArtist[];
}

// Detail Artwork untuk halaman detail karya
export interface ArtworkDetail {
	id: string;
	title: string;
	url?: string;
	meta_data?: string; // Berisi data mentah "Year, Medium, Size, Location"
	artist?: {
		name: string;
		nationality?: string;
	} | null;
}

export interface RelatedArtist {
	name: string;
	wikidata_id?: string | null;
}
interface SearchOptions {
	semantic?: boolean;
}

export interface GraphNode {
	id: string;
	name: string;
	group: "artist" | "artwork" | "movement";
	val: number;
	slug?: string;
}

export interface GraphLink {
	source: string;
	target: string;
	type: string;
}

export interface ArtistGraphData {
	nodes: GraphNode[];
	links: GraphLink[];
}

type NeoNumeric = { toNumber: () => number };

function isNeoNumeric(value: unknown): value is NeoNumeric {
	return (
		typeof value === "object" &&
		value !== null &&
		"toNumber" in value &&
		typeof (value as NeoNumeric).toNumber === "function"
	);
}

function toText(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (isNeoNumeric(value)) return value.toNumber().toString();
	return String(value);
}

// --- ACTIONS / FUNCTIONS ---

/**
 * FITUR 1: SEARCH GLOBAL (ARTIST & ARTWORK)
 * Mencari nama artist atau judul artwork.
 */
export async function searchGlobal(
	keyword: string,
	options?: SearchOptions,
): Promise<GlobalSearchResult[]> {
	// Return early for empty queries
	if (!keyword || !keyword.trim()) return [];

	const session = getSession();
	try {
		// Menggunakan UNION untuk menggabungkan hasil pencarian Artist dan Artwork
		// Kita batasi total hasil dengan CALL { ... } lalu LIMIT di luar
		const cypher = `
      CALL {
        MATCH (a:Artist)
        WHERE toLower(a.name) CONTAINS toLower($keyword)
        RETURN 'artist' AS type, a.name AS title, coalesce(a.nationality, 'Artist') AS subtitle, a.name AS linkParam
        UNION
        MATCH (a:Artist)-[:CREATED]->(w:Artwork)
        WHERE toLower(w.title) CONTAINS toLower($keyword)
        RETURN 'artwork' AS type, w.title AS title, 'Artwork by ' + a.name AS subtitle, toString(w.id) AS linkParam
      }
      RETURN * LIMIT 20
    `;

		const result = await session.run(cypher, { keyword });

		const keywordResults = result.records.map((r: Record) => ({
			type: r.get("type"),
			title: r.get("title"),
			subtitle: r.get("subtitle") || "",
			linkParam: r.get("linkParam") || r.get("title"),
		}));

		let semanticResults: GlobalSearchResult[] = [];

		if (options?.semantic) {
			try {
				const embeddingVector = await embedText(keyword);
				if (embeddingVector.length > 0) {
					const semanticCypher = `
            CALL db.index.vector.queryNodes("artwork_embeddings", $limit, $embedding)
            YIELD node, score
            OPTIONAL MATCH (creator:Artist)-[:CREATED]->(node)
            RETURN node AS artwork, score, creator.name AS artistName
          `;
					const semanticResult = await session.run(semanticCypher, {
						limit: 10,
						embedding: embeddingVector,
					});
					const enriched: GlobalSearchResult[] = [];
					for (const record of semanticResult.records) {
						const artworkNode = record.get("artwork") as Node | undefined;
						if (!artworkNode) continue;
						const props = artworkNode.properties;
						const artistName = record.get("artistName") ?? "";
						const artworkId =
							toText(props.id) ||
							toText(props.title) ||
							toText(artworkNode.identity);
						if (!artworkId) continue;
						enriched.push({
							type: "artwork",
							title: props.title || "Artwork",
							subtitle: artistName
								? `Similar to ${artistName}`
								: "Similar results",
							linkParam: artworkId,
						});
					}
					semanticResults = enriched;
				}
			} catch (error) {
				console.error("Semantic Search Error:", error);
			}
		}

		const combined: GlobalSearchResult[] = [];
		const seen = new Set<string>();
		const pushUnique = (item: GlobalSearchResult) => {
			const key = `${item.type}-${item.linkParam}`;
			if (seen.has(key)) return;
			seen.add(key);
			combined.push(item);
		};

		keywordResults.forEach(pushUnique);
		semanticResults.forEach(pushUnique);

		return combined;
	} catch (error) {
		console.error("Global Search Error:", error);
		return [];
	} finally {
		await session.close();
	}
}

/**
 * FITUR 2: INFO BOX (DETAIL ARTIST)
 * Menampilkan bio, metadata, jumlah painting, dan galeri karya.
 */
export async function getArtistDetail(
	artistName: string,
): Promise<ArtistDetail | null> {
	const session = getSession();
	try {
		const cypher = `
      MATCH (a:Artist {name: $name})
      OPTIONAL MATCH (a)-[:BELONGS_TO]->(m:Movement)
      OPTIONAL MATCH (a)-[:CREATED]->(w:Artwork)
      OPTIONAL MATCH (a)-[:INFLUENCED_BY]->(influencer:Artist)
      OPTIONAL MATCH (influenced:Artist)-[:INFLUENCED_BY]->(a)
      OPTIONAL MATCH (a)-[:STUDENT_OF]->(mentor:Artist)
      OPTIONAL MATCH (student:Artist)-[:STUDENT_OF]->(a)
      WITH a,
           collect(DISTINCT m.name) AS movementNames,
           collect(DISTINCT w) AS artworksRaw,
           collect(DISTINCT influencer) AS influencerNodes,
           collect(DISTINCT influenced) AS influencedNodes,
           collect(DISTINCT mentor) AS mentorNodes,
           collect(DISTINCT student) AS studentNodes
      RETURN a,
             movementNames AS movements,
             size(artworksRaw) AS graph_painting_count,
             [aw IN artworksRaw WHERE aw IS NOT NULL | {id: toString(aw.id), title: aw.title, url: aw.url, info: aw.meta_data}] AS artworks,
             [node IN influencerNodes WHERE node IS NOT NULL | {name: node.name, wikidata_id: node.wikidata_id}] AS influencedBy,
             [node IN influencedNodes WHERE node IS NOT NULL | {name: node.name, wikidata_id: node.wikidata_id}] AS influences,
             [node IN mentorNodes WHERE node IS NOT NULL | {name: node.name, wikidata_id: node.wikidata_id}] AS mentors,
             [node IN studentNodes WHERE node IS NOT NULL | {name: node.name, wikidata_id: node.wikidata_id}] AS students
    `;

		const result = await session.run(cypher, { name: artistName });

		if (result.records.length === 0) return null;

		const record = result.records[0];
		const a = record.get("a").properties;
		const artworks = record.get("artworks") ?? [];

		// Logika Total Painting:
		// Prioritas 1: Dari kolom 'paintings' di CSV (jika ada)
		// Prioritas 2: Dari hitungan relasi graph
		let totalPaintings = 0;
		if (a.paintings_count !== undefined && a.paintings_count !== null) {
			totalPaintings = Number(a.paintings_count);
		} else if (a.paintings !== undefined && a.paintings !== null) {
			totalPaintings = Number(a.paintings); // Kadang properti CSV tersimpan sbg 'paintings'
		} else {
			totalPaintings = record.get("graph_painting_count").toNumber();
		}

		return {
			name: a.name,
			bio: a.bio || "Biography not available.",
			nationality: a.nationality || "Unknown",
			years: a.years || a.born_died_str || "",
			wikipedia: a.wikipedia || "#",
			paintings_count: totalPaintings,
			school: a.school,
			movements: record.get("movements"),
			artworks: artworks.slice(0, 20),
			influencedBy: record.get("influencedBy") ?? [],
			influences: record.get("influences") ?? [],
			mentors: record.get("mentors") ?? [],
			students: record.get("students") ?? [],
		};
	} catch (error) {
		console.error("Detail Artist Error:", error);
		return null;
	} finally {
		await session.close();
	}
}

export async function getArtistGraphData(
	artistName: string,
): Promise<ArtistGraphData | null> {
	if (!artistName) return null;
	const session = getSession();
	try {
		const cypher = `
      MATCH (artist:Artist {name: $name})
      OPTIONAL MATCH (artist)-[:CREATED]->(artwork:Artwork)
      OPTIONAL MATCH (artist)-[:BELONGS_TO]->(movement:Movement)
      OPTIONAL MATCH (movement)<-[:BELONGS_TO]-(related:Artist)
      WHERE related IS NULL OR related <> artist
      WITH artist,
           collect(DISTINCT artwork) AS artworks,
           collect(DISTINCT movement) AS movements,
           collect(DISTINCT CASE WHEN related IS NOT NULL THEN {movement: movement, artist: related} END) AS relatedPairs
      RETURN artist, artworks, movements, relatedPairs
    `;
		const result = await session.run(cypher, { name: artistName });
		if (result.records.length === 0) return null;
		const record = result.records[0];
		const artistNode = record.get("artist") as Node | undefined;
		if (!artistNode) return null;
		const nodes = new Map<string, GraphNode>();
		const links: GraphLink[] = [];
		const addNode = (
			id: string,
			name: string,
			group: GraphNode["group"],
			val: number,
			slug?: string,
		) => {
			if (!id || nodes.has(id)) return;
			nodes.set(id, { id, name, group, val, slug });
		};
		const addLink = (source: string, target: string, type: string) => {
			if (!source || !target) return;
			links.push({ source, target, type });
		};
		const centerRawId =
			toText(artistNode.properties.id) ||
			artistNode.properties.name ||
			artistName;
		const centerName = String(artistNode.properties.name || artistName);
		const centerId = `artist-${centerRawId}`;
		addNode(centerId, centerName, "artist", 20, centerName);
		const artworks = (
			(record.get("artworks") as Node[] | undefined) ?? []
		).filter(Boolean);
		for (const artworkNode of artworks.slice(0, 20)) {
			const rawId =
				toText(artworkNode.properties.id) ||
				toText(artworkNode.properties.title) ||
				toText(artworkNode.identity);
			if (!rawId) continue;
			const nodeId = `artwork-${rawId}`;
			const name = String(
				artworkNode.properties.title || artworkNode.properties.name || rawId,
			);
			addNode(nodeId, name, "artwork", 8, rawId);
			addLink(centerId, nodeId, "CREATED");
		}
		const movements = (
			(record.get("movements") as Node[] | undefined) ?? []
		).filter(Boolean);
		for (const movementNode of movements) {
			const rawId =
				toText(movementNode.properties.id) ||
				toText(movementNode.properties.name) ||
				toText(movementNode.identity);
			if (!rawId) continue;
			const nodeId = `movement-${rawId}`;
			const name = String(
				movementNode.properties.name || movementNode.properties.title || rawId,
			);
			addNode(nodeId, name, "movement", 10);
			addLink(centerId, nodeId, "BELONGS_TO");
		}
		type RelatedPair = { movement: Node; artist: Node } | null;
		const pairs = (
			(record.get("relatedPairs") as RelatedPair[] | undefined) ?? []
		).filter(Boolean) as { movement: Node; artist: Node }[];
		const seenRelated = new Set<string>();
		for (const pair of pairs) {
			const relatedNode = pair.artist;
			const movementNode = pair.movement;
			if (!relatedNode) continue;
			const relatedRawId =
				toText(relatedNode.properties.id) ||
				toText(relatedNode.properties.name) ||
				toText(relatedNode.identity);
			if (!relatedRawId || seenRelated.has(relatedRawId)) continue;
			seenRelated.add(relatedRawId);
			const relatedId = `artist-${relatedRawId}`;
			const relatedName = String(
				relatedNode.properties.name ||
					relatedNode.properties.title ||
					relatedRawId,
			);
			addNode(relatedId, relatedName, "artist", 12, relatedName);
			addLink(relatedId, centerId, "RELATED");
			if (movementNode) {
				const movementRawId =
					toText(movementNode.properties.id) ||
					toText(movementNode.properties.name) ||
					toText(movementNode.identity);
				if (movementRawId) {
					const movementId = `movement-${movementRawId}`;
					const movementName = String(
						movementNode.properties.name ||
							movementNode.properties.title ||
							movementRawId,
					);
					addNode(movementId, movementName, "movement", 10);
					addLink(relatedId, movementId, "BELONGS_TO");
				}
			}
			if (seenRelated.size >= 5) break;
		}
		return { nodes: Array.from(nodes.values()), links };
	} catch (error) {
		console.error("Artist Graph Error:", error);
		return null;
	} finally {
		await session.close();
	}
}

/**
 * FITUR 3: DETAIL ARTWORK
 * Menampilkan gambar dan metadata (meta_data) dari CSV.
 */
export async function getArtworkDetail(
	artworkId: string,
): Promise<ArtworkDetail | null> {
	const session = getSession();
	try {
		// Menggunakan ID untuk pencarian yang lebih akurat
		const cypher = `
      MATCH (w:Artwork {id: $id})
      OPTIONAL MATCH (creator:Artist)-[:CREATED]->(w)
      RETURN w, creator
    `;

		// Pastikan parameter ID dikirim dengan tipe yang sesuai (string di URL -> string/int di DB)
		// Di seed data biasanya ID artwork disimpan sebagai string atau integer.
		// Kita coba casting di cypher atau kirim apa adanya.
		const result = await session.run(cypher, { id: artworkId });

		// Fallback search by Title if ID not found (just in case)
		if (result.records.length === 0) {
			// Opsional: Implementasi fallback search by title jika diperlukan
			return null;
		}

		const record = result.records[0];
		const w = record.get("w").properties;
		const creatorNode = record.get("creator");

		return {
			id: w.id,
			title: w.title,
			url: w.url || "",
			meta_data: w.meta_data || w["picture data"] || "", // Sesuai kolom CSV
			artist: creatorNode
				? {
						name: creatorNode.properties.name,
						nationality: creatorNode.properties.nationality,
					}
				: null,
		};
	} catch (error) {
		console.error("Artwork Detail Error:", error);
		return null;
	} finally {
		await session.close();
	}
}

/**
 * FITUR 4: EXECUTE CYPHER QUERY (ADVANCE FEATURE)
 * Fitur bebas untuk menjalankan query Cypher mentah dari frontend.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any

// biome-ignore lint/suspicious/noExplicitAny: <X>
export async function executeCypherQuery(cypherQuery: string): Promise<any> {
	if (!cypherQuery || !cypherQuery.trim()) {
		return { error: true, message: "Query cannot be empty." };
	}

	const session = getSession();
	try {
		const result = await session.run(cypherQuery);

		// Format hasil agar mudah dibaca JSON-nya di frontend
		const formattedRecords = result.records.map((record: Record) => {
			// biome-ignore lint/suspicious/noExplicitAny: <X>
			const row: { [key: string]: any } = {};
			record.keys.forEach((key, index) => {
				let value = record.get(index);

				// Jika value adalah Node atau Relationship Neo4j, ambil propertinya saja
				if (value && typeof value === "object") {
					if (value.properties) {
						// Ini adalah Node/Relationship
						value = {
							...value.properties,
							_id: value.identity?.toString(),
							_labels: value.labels || value.type,
						};
					} else if (typeof value.toNumber === "function") {
						// Ini adalah Integer Neo4j
						value = value.toNumber();
					}
				}
				row[key as string] = value;
			});
			return row;
		});

		return {
			success: true,
			records: formattedRecords,
			summary: `Query executed successfully. Found ${result.records.length} records.`,
		};
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			error: true,
			message: message || "An error occurred while executing the query.",
		};
	} finally {
		await session.close();
	}
}
