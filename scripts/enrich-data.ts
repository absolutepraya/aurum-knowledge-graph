"use server";

import "dotenv/config";
import neo4j, { int, type Session } from "neo4j-driver";

const WIKIDATA_ENDPOINT =
	process.env.WIKIDATA_ENDPOINT || "https://query.wikidata.org/sparql";
const USER_AGENT =
	process.env.WIKIDATA_USER_AGENT ||
	"HistoricArtKnowledgeGraph/1.0 (assignment@example.com)";
const FETCH_DELAY_MS = Number(process.env.WIKIDATA_DELAY_MS || 1200);
const ARTIST_BATCH_SIZE = Number(process.env.WIKIDATA_BATCH || 10);
const RELATION_LIMIT = Number(process.env.WIKIDATA_REL_LIMIT || 5);

type SparqlBinding = {
	[key: string]: { type: string; value: string } | undefined;
};

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
	const url = `${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
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

async function fetchWikidataId(
	artistName: string,
): Promise<WikidataMatch | null> {
	const sanitized = artistName.replace(/"/g, "");
	const query = `
      SELECT ?artist ?artistLabel ?statements WHERE {
        SERVICE wikibase:mwapi {
          bd:serviceParam wikibase:api "Search" ;
                          wikibase:endpoint "www.wikidata.org" ;
                          mwapi:srsearch "${sanitized}" ;
                          mwapi:language "en" ;
                          mwapi:srlimit 5 .
          ?artist wikibase:mwapiItem ?title .
        }
        OPTIONAL { ?artist wikibase:statements ?statements. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      ORDER BY DESC(?statements)
      LIMIT 1
    `;

	const data = await runSparql(query);
	const bindings: SparqlBinding[] = data?.results?.bindings ?? [];
	if (!bindings.length) return null;
	const binding = bindings[0];
	const uri = binding.artist?.value;
	const label = binding.artistLabel?.value || sanitized;
	if (!uri) return null;
	const id = uri.split("/").pop();
	if (!id) return null;
	return { id, label };
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
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        LIMIT ${RELATION_LIMIT}
      `;
		const data = await runSparql(query);
		const bindings: SparqlBinding[] = data?.results?.bindings ?? [];
		for (const row of bindings) {
			const uri = row.related?.value;
			const label = row.relatedLabel?.value;
			if (!uri) continue;
			const id = uri.split("/").pop();
			if (!id) continue;
			all.push({
				id,
				label: label || id,
				type: rel,
			});
		}
	}
	return all;
}

async function fetchArtistsWithoutId(session: Session): Promise<string[]> {
	const result = await session.run(
		`
      MATCH (a:Artist)
      WHERE a.wikidata_id IS NULL
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
) {
	await session.run(
		`
      MATCH (a:Artist {name: $name})
      SET a.wikidata_id = $id,
          a.wikidata_label = coalesce(a.wikidata_label, $label)
    `,
		{
			name,
			id: match.id,
			label: match.label,
		},
	);
}

async function ensureRelatedArtist(session: Session, related: RelationResult) {
	await session.run(
		`
      MERGE (a:Artist {wikidata_id: $id})
      ON CREATE SET a.name = $label
      SET a.name = coalesce(a.name, $label),
          a.wikidata_label = coalesce(a.wikidata_label, $label)
    `,
		{
			id: related.id,
			label: related.label,
		},
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
		{
			sourceId,
			targetId: related.id,
		},
	);
}

async function syncWikidata(session: Session, name: string) {
	const match = await fetchWikidataId(name);
	if (!match) {
		console.warn(`⚠️  No Wikidata match for ${name}`);
		return;
	}
	await updateArtistWikidata(session, name, match);
	console.log(`✓ Linked ${name} -> ${match.id}`);

	const relations = await fetchRelations(match.id);
	for (const relation of relations) {
		await ensureRelatedArtist(session, relation);
		await connectRelation(session, match.id, relation);
		console.log(`   • ${relation.type} -> ${relation.label}`);
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
