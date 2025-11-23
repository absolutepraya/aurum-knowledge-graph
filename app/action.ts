// app/actions.ts
"use server";

// Use relative path so the module resolves at runtime
import { getSession } from "../lib/neo4j";
import type { Record } from "neo4j-driver";

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

// --- ACTIONS / FUNCTIONS ---

/**
 * FITUR 1: SEARCH GLOBAL (ARTIST & ARTWORK)
 * Mencari nama artist atau judul artwork.
 */
export async function searchGlobal(
	keyword: string,
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
        RETURN 'artwork' AS type, w.title AS title, 'Karya oleh ' + a.name AS subtitle, toString(w.id) AS linkParam
      }
      RETURN * LIMIT 20
    `;

		const result = await session.run(cypher, { keyword });

		return result.records.map((r: Record) => ({
			type: r.get("type"),
			title: r.get("title"),
			subtitle: r.get("subtitle") || "",
			linkParam: r.get("linkParam") || r.get("title"),
		}));
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
      // Hitung jumlah artwork yang terhubung di graph
      WITH a, m, w
      // Agregasi data
      RETURN a, 
             collect(DISTINCT m.name) AS movements, 
             count(DISTINCT w) AS graph_painting_count,
             collect(DISTINCT {id: toString(w.id), title: w.title, url: w.url, info: w.meta_data}) AS artworks
    `;

		const result = await session.run(cypher, { name: artistName });

		if (result.records.length === 0) return null;

		const record = result.records[0];
		const a = record.get("a").properties;
		const artworks = record
			.get("artworks")
			.filter((art: { title: string }) => art.title); // Filter yang kosong jika ada

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
			bio: a.bio || "Biografi belum tersedia.",
			nationality: a.nationality || "Unknown",
			years: a.years || a.born_died_str || "",
			wikipedia: a.wikipedia || "#",
			paintings_count: totalPaintings,
			school: a.school,
			movements: record.get("movements"),
			artworks: artworks.slice(0, 20), // Ambil max 20 karya untuk preview
		};
	} catch (error) {
		console.error("Detail Artist Error:", error);
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
		return { error: true, message: "Query tidak boleh kosong." };
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
			summary: `Query berhasil dijalankan. Ditemukan ${result.records.length} data.`,
		};
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			error: true,
			message: message || "Terjadi error saat menjalankan query.",
		};
	} finally {
		await session.close();
	}
}
