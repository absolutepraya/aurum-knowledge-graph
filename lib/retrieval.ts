import { embedText } from "./embeddings";
import { getSession } from "./neo4j";

export interface ContextItem {
	type: "artist" | "artwork";
	title: string;
	content: string;
	score?: number;
}

export async function getChatContext(query: string): Promise<string> {
	const session = getSession();
	try {
		const embedding = await embedText(query);
		const contextItems: ContextItem[] = [];

		// 1. Vector Search on Artworks
		if (embedding.length > 0) {
			const vectorCypher = `
        CALL db.index.vector.queryNodes("artwork_embeddings", 5, $embedding)
        YIELD node, score
        MATCH (creator:Artist)-[:CREATED]->(node)
        RETURN node, score, creator
      `;
			const vectorResult = await session.run(vectorCypher, { embedding });

			for (const record of vectorResult.records) {
				const artwork = record.get("node").properties;
				const creator = record.get("creator").properties;
				const score = record.get("score");

				contextItems.push({
					type: "artwork",
					title: artwork.title,
					content: `Title: ${artwork.title}\nArtist: ${creator.name}\nMedium/Info: ${
						artwork.meta_data || "N/A"
					}\nDescription: ${artwork.info || "N/A"}`,
					score,
				});
			}
		}

		// 2. Keyword Search for Artists
		const artistCypher = `
      MATCH (a:Artist)
      WHERE toLower(a.name) CONTAINS toLower($query)
      OPTIONAL MATCH (a)-[:BELONGS_TO]->(m:Movement)
      RETURN a, collect(m.name) as movements LIMIT 3
    `;
		const artistResult = await session.run(artistCypher, { query });

		for (const record of artistResult.records) {
			const artist = record.get("a").properties;
			const movements = record.get("movements");
			contextItems.push({
				type: "artist",
				title: artist.name,
				content: `Artist Name: ${artist.name}\nBio: ${
					artist.bio || "N/A"
				}\nNationality: ${artist.nationality}\nMovements: ${
					movements.join(", ") || "N/A"
				}`,
				score: 1.0, // Keyword match is high relevance
			});
		}

		// Deduplicate and Format
		const uniqueItems = new Map<string, ContextItem>();
		contextItems.forEach((item) => {
			uniqueItems.set(`${item.type}-${item.title}`, item);
		});

		if (uniqueItems.size === 0) return "";

		return Array.from(uniqueItems.values())
			.map((item) => `[${item.type.toUpperCase()}] ${item.content}`)
			.join("\n\n---\n\n");
	} catch (error) {
		console.error("Error fetching chat context:", error);
		return "";
	} finally {
		await session.close();
	}
}
