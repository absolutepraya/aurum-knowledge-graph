import "dotenv/config";
import neo4j, { int, type Session } from "neo4j-driver";
import { embedText } from "../lib/embeddings";

const BATCH_SIZE = Number(process.env.EMBED_BATCH_SIZE || 25);
const MAX_TEXT_LENGTH = Number(process.env.EMBED_MAX_CHARS || 1000);

type ArtworkRow = {
	id: string;
	title?: string;
	meta?: string;
	artistName?: string;
};

function buildText(row: ArtworkRow) {
	const parts = [
		`Title: ${row.title || "Unknown"}`,
		row.artistName ? `Artist: ${row.artistName}` : "",
		row.meta ? `Details: ${row.meta}` : "",
	].filter(Boolean);
	const text = parts.join("\n");
	return text.length > MAX_TEXT_LENGTH
		? `${text.slice(0, MAX_TEXT_LENGTH)}`
		: text;
}

async function ensureVectorIndex(session: Session) {
	const indexCypher = `
    CREATE VECTOR INDEX artwork_embeddings IF NOT EXISTS
    FOR (w:Artwork) ON (w.embedding)
    OPTIONS {indexConfig: {
      \`vector.dimensions\`: 384,
      \`vector.similarity_function\`: 'cosine'
    }}
  `;
	await session.run(indexCypher);
}

async function fetchBatch(session: Session): Promise<ArtworkRow[]> {
	const result = await session.run(
		`
      MATCH (w:Artwork)
      WHERE w.embedding IS NULL
      OPTIONAL MATCH (a:Artist)-[:CREATED]->(w)
      RETURN toString(w.id) AS id,
             w.title AS title,
             w.meta_data AS meta,
             a.name AS artistName
      LIMIT $limit
    `,
		{ limit: int(BATCH_SIZE) },
	);
	return result.records.map((record) => ({
		id: record.get("id"),
		title: record.get("title") || "",
		meta: record.get("meta") || "",
		artistName: record.get("artistName") || "",
	}));
}

async function saveEmbedding(
	session: Session,
	id: string,
	embedding: number[],
) {
	await session.run(
		`
      MATCH (w:Artwork {id: $id})
      SET w.embedding = $embedding
    `,
		{ id, embedding },
	);
}

async function main() {
	const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
	const user = process.env.NEO4J_USER || "neo4j";
	const pass = process.env.NEO4J_PASSWORD || "password";
	const driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
	const session = driver.session();
	console.log("Embedding generation started...");
	try {
		await ensureVectorIndex(session);
		let processed = 0;
		while (true) {
			const batch = await fetchBatch(session);
			if (batch.length === 0) break;
			for (const row of batch) {
				const text = buildText(row);
				const embedding = await embedText(text);
				if (!embedding.length) continue;
				await saveEmbedding(session, row.id, embedding);
				processed += 1;
				if (processed % 10 === 0) {
					console.log(`Processed ${processed} artworks...`);
				}
			}
		}
		console.log(
			`Embedding generation completed. Total nodes updated: ${processed}.`,
		);
	} catch (error) {
		console.error("Embedding generation failed:", error);
		process.exitCode = 1;
	} finally {
		await session.close();
		await driver.close();
	}
}

main();
