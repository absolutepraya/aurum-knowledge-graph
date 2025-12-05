import "dotenv/config";
import neo4j, { int, type Session } from "neo4j-driver";
import { WBK } from "wikibase-sdk";

const WIKIDATA_INSTANCE =
	process.env.WIKIDATA_INSTANCE || "https://www.wikidata.org";
const WIKIDATA_SPARQL_ENDPOINT =
	process.env.WIKIDATA_ENDPOINT || "https://query.wikidata.org/sparql";
const USER_AGENT =
	process.env.WIKIDATA_USER_AGENT ||
	"HistoricArtKnowledgeGraph/1.0 (assignment@example.com)";
const FETCH_DELAY_MS = Number(process.env.WIKIDATA_DELAY_MS || 500);
const ARTIST_BATCH_SIZE = Number(process.env.WIKIDATA_BATCH || 10);
const RELATION_LIMIT = Number(process.env.WIKIDATA_REL_LIMIT || 5);

const wbk = WBK({
	instance: WIKIDATA_INSTANCE,
	sparqlEndpoint: WIKIDATA_SPARQL_ENDPOINT,
});

interface WikidataMatch {
	id: string;
	label: string;
}

interface RelationResult {
	id: string;
	label: string;
	type: "INFLUENCED_BY" | "STUDENT_OF";
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSparql(query: string) {
	const url = wbk.sparqlQuery(query);
	const response = await fetch(url, {
		headers: {
			Accept: "application/sparql-results+json",
			"User-Agent": USER_AGENT,
		},
	});
	if (!response.ok) {
		throw new Error(
			`Wikidata request failed (${response.status}): ${await response.text()}`,
		);
	}
	const payload = await response.json();
	await delay(FETCH_DELAY_MS);
	return payload;
}

function generateNameVariations(name: string): string[] {
	const sanitized = name.replace(/"/g, "").trim();
	const variations = new Set<string>([sanitized]);
	const words = sanitized.split(/\s+/);
	if (words.length > 1) {
		const reversed = [...words].reverse().join(" ");
		variations.add(reversed);
		const lastWord = words[words.length - 1];
		const firstWords = words.slice(0, -1).join(" ");
		if (lastWord && firstWords) {
			variations.add(`${lastWord}, ${firstWords}`);
		}
	}
	const withoutThe = sanitized.replace(/\bthe\b/gi, "").trim();
	if (withoutThe !== sanitized && withoutThe.length > 0) {
		variations.add(withoutThe);
	}
	return Array.from(variations);
}

async function fetchWikidataId(
	artistName: string,
): Promise<WikidataMatch | null> {
	const variations = generateNameVariations(artistName);
	for (let i = 0; i < variations.length; i++) {
		const searchTerm = variations[i];
		const url = wbk.searchEntities({
			search: searchTerm,
			language: "en",
			limit: 5,
		});

		const response = await fetch(url, {
			headers: { Accept: "application/json", "User-Agent": USER_AGENT },
		});

		if (!response.ok) {
			if (i < variations.length - 1) await delay(FETCH_DELAY_MS);
			continue;
		}

		const data = await response.json();
		const results = data?.search ?? [];
		if (results.length > 0) {
			const bestMatch = results[0];
			return { id: bestMatch.id, label: bestMatch.label || searchTerm };
		}
		if (i < variations.length - 1) await delay(FETCH_DELAY_MS);
	}
	return null;
}

async function fetchArtistImage(qid: string): Promise<string | null> {
	const query = `SELECT ?image WHERE { wd:${qid} wdt:P18 ?image . } LIMIT 1`;
	try {
		const data = await runSparql(query);
		const bindings = data?.results?.bindings || [];
		if (bindings.length > 0 && bindings[0].image?.value) {
			return bindings[0].image.value;
		}
	} catch (error) {
		console.error(`⚠️ Error fetching image for ${qid}:`, error);
	}
	return null;
}

async function fetchRelations(qid: string): Promise<RelationResult[]> {
	const types = [
		{ prop: "P737", rel: "INFLUENCED_BY" as const },
		{ prop: "P1066", rel: "STUDENT_OF" as const },
	];
	const all: RelationResult[] = [];

	for (const { prop, rel } of types) {
		const query = `
        SELECT ?related ?relatedLabel WHERE {
          VALUES ?subject { wd:${qid} }
          ?subject wdt:${prop} ?related .
          ?related wdt:P31 wd:Q5 . 
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        LIMIT ${RELATION_LIMIT}
      `;

		try {
			const data = await runSparql(query);
			const bindings = data?.results?.bindings || [];
			for (const binding of bindings) {
				const relatedUri = binding.related?.value;
				const relatedLabel = binding.relatedLabel?.value;
				if (!relatedUri) continue;
				const id = relatedUri.split("/").pop();
				if (!id || !/^Q\d+$/.test(id)) continue;

				all.push({
					id,
					label: relatedLabel || id,
					type: rel,
				});
			}
		} catch (error) {
			console.error(`⚠️ Error fetching ${rel} for ${qid}:`, error);
		}
	}
	return all;
}

async function fetchArtistsWithoutId(session: Session): Promise<string[]> {
	const result = await session.run(
		`
      MATCH (a:Artist)
      WHERE a.wikidata_last_sync IS NULL
      
      RETURN a.name AS name
      LIMIT $limit
    `,
		{ limit: int(ARTIST_BATCH_SIZE) },
	);
	return result.records.map((record) => record.get("name") as string);
}

async function updateArtistWikidata(
	session: Session,
	name: string,
	match: WikidataMatch,
	imageUrl: string | null,
) {
	await session.run(
		`
      MATCH (a:Artist {name: $name})
      SET a.wikidata_id = $id,
          a.wikidata_label = coalesce(a.wikidata_label, $label),
          a.image = $imageUrl
    `,
		{
			name,
			id: match.id,
			label: match.label,
			imageUrl: imageUrl,
		},
	);
}

async function ensureRelatedArtist(session: Session, related: RelationResult) {
	await session.run(
		`
        OPTIONAL MATCH (byId:Artist {wikidata_id: $id})
        OPTIONAL MATCH (byName:Artist {name: $label})
        WITH coalesce(byId, byName) as existingNode
        
        CALL {
            WITH existingNode
            WITH existingNode WHERE existingNode IS NOT NULL
            SET existingNode.wikidata_id = $id,
                existingNode.wikidata_label = coalesce(existingNode.wikidata_label, $label)
            RETURN existingNode as result
            
            UNION
            
            WITH existingNode
            WITH existingNode WHERE existingNode IS NULL
            CREATE (newNode:Artist {
                wikidata_id: $id, 
                name: $label, 
                wikidata_label: $label
            })
            RETURN newNode as result
        }
        RETURN count(result)
        `,
		{ id: related.id, label: related.label },
	);
}

async function connectRelation(
	session: Session,
	sourceId: string,
	related: RelationResult,
) {
	await session.run(
		`
      MATCH (source:Artist {wikidata_id: $sourceId})
      MATCH (target:Artist {wikidata_id: $targetId})
      MERGE (source)-[r:${related.type}]->(target)
      RETURN r
    `,
		{ sourceId, targetId: related.id },
	);
}

async function syncWikidata(session: Session, name: string) {
	try {
		const match = await fetchWikidataId(name);

		if (!match) {
			console.warn(`⚠️  No Wikidata match for ${name} (Marking complete)`);
			await session.run(
				`MATCH (a:Artist {name: $name}) 
                 SET a.wikidata_id = 'Not Found', 
                     a.wikidata_last_sync = datetime()`,
				{ name },
			);
			return;
		}

		const imageUrl = await fetchArtistImage(match.id);

		const imageValue = imageUrl || "Not Found";

		await updateArtistWikidata(session, name, match, imageValue);

		// Logging
		if (imageUrl) {
			console.log(`✓ Linked ${name} -> ${match.id} (with Image 📸)`);
		} else {
			console.log(`✓ Linked ${name} -> ${match.id} (No Image found)`);
		}

		const relations = await fetchRelations(match.id);
		for (const relation of relations) {
			await ensureRelatedArtist(session, relation);
			await connectRelation(session, match.id, relation);
			// Minimal log
			if (relations.length > 0) process.stdout.write(".");
		}
		if (relations.length > 0) console.log("");

		await session.run(
			"MATCH (a:Artist {name: $name}) SET a.wikidata_last_sync = datetime()",
			{ name },
		);
	} catch (error) {
		console.error(`❌ Error processing ${name}:`, error);
	}
}

//deduplication cleaning
async function performFinalDeduplication(session: Session) {
	console.log("🧹 Running auto-deduplication to clean up duplicates...");
	const query = `
        MATCH (a:Artist)
        WHERE a.wikidata_id IS NOT NULL AND a.wikidata_id <> 'Not Found'
        WITH a.wikidata_id as id, collect(a) as nodes
        WHERE size(nodes) > 1

        CALL {
            WITH nodes
            UNWIND nodes as n
            OPTIONAL MATCH (n)-[:CREATED]->(w:Artwork)
            WITH n, count(w) as artworkCount
            ORDER BY artworkCount DESC, n.wikipedia DESC, size(keys(n)) DESC
            RETURN collect(n) as sortedNodes
        }

        WITH head(sortedNodes) as primary, tail(sortedNodes) as duplicates
        UNWIND duplicates as duplicate

        SET primary.wikipedia = COALESCE(primary.wikipedia, duplicate.wikipedia),
            primary.image = COALESCE(primary.image, duplicate.image),
            primary.bio = COALESCE(primary.bio, duplicate.bio),
            primary.nationality = COALESCE(primary.nationality, duplicate.nationality),
            primary.wikidata_label = COALESCE(primary.wikidata_label, duplicate.wikidata_label)

        WITH primary, duplicate
        OPTIONAL MATCH (duplicate)-[r1:INFLUENCED_BY]->(target)
        FOREACH (_ IN CASE WHEN r1 IS NOT NULL THEN [1] ELSE [] END | MERGE (primary)-[:INFLUENCED_BY]->(target) DELETE r1)

        WITH primary, duplicate
        OPTIONAL MATCH (duplicate)-[r2:STUDENT_OF]->(target2)
        FOREACH (_ IN CASE WHEN r2 IS NOT NULL THEN [1] ELSE [] END | MERGE (primary)-[:STUDENT_OF]->(target2) DELETE r2)

        DETACH DELETE duplicate
    `;

	try {
		await session.run(query);
		console.log("✨ Deduplication complete. Database is clean.");
	} catch (error) {
		console.error("⚠️ Deduplication warning:", error);
	}
}

async function main() {
	const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
	const user = process.env.NEO4J_USER || "neo4j";
	const pass = process.env.NEO4J_PASSWORD || "password";

	const driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
	const session = driver.session();

	console.log("🔗 Starting Wikidata enrichment…");

	try {
		while (true) {
			const artists = await fetchArtistsWithoutId(session);
			if (!artists.length) {
				console.log("🎉 All artists already linked to Wikidata.");
				break;
			}
			for (const name of artists) {
				try {
					await syncWikidata(session, name);
				} catch (error) {
					console.error(`✗ Failed to enrich ${name}`, error);
				}
			}
		}

		//run deduplikasi
		await performFinalDeduplication(session);
	} finally {
		await session.close();
		await driver.close();
		console.log("✅ Enrichment script finished.");
	}
}

main().catch((error) => {
	console.error("Unexpected error:", error);
	process.exitCode = 1;
});
