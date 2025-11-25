"use server";

import { embedText } from "./embeddings";

/**
 * Calculates the cosine similarity between two vectors.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
	if (vecA.length !== vecB.length) return 0;
	let dot = 0;
	for (let i = 0; i < vecA.length; i++) {
		dot += vecA[i] * vecB[i];
	}
	// Assuming vectors are already normalized by embedText
	return dot;
}

/**
 * Reranks a list of documents based on their semantic similarity to a query.
 * Uses the existing Bi-Encoder model from embeddings.ts to avoid downloading new models.
 * Returns an array of scores corresponding to the documents.
 */
export async function rerank(
	query: string,
	documents: string[],
): Promise<number[]> {
	if (!query || !documents.length) return [];

	try {
		// 1. Embed the query once
		const queryVector = await embedText(query);
		if (!queryVector.length) return new Array(documents.length).fill(0);

		// 2. Embed all documents (in parallel for speed)
		const docVectors = await Promise.all(
			documents.map((doc) => embedText(doc)),
		);

		// 3. Calculate cosine similarity for each document
		const scores = docVectors.map((docVector) => {
			if (!docVector.length) return 0;
			return cosineSimilarity(queryVector, docVector);
		});

		return scores;
	} catch (error) {
		console.error("Reranking error:", error);
		// Return 0s in case of failure so the app doesn't crash
		return new Array(documents.length).fill(0);
	}
}
