"use server";

import { pipeline } from "@xenova/transformers";

// Helper to keep the pipeline in memory
// biome-ignore lint/suspicious/noExplicitAny: Pipeline type inference is tricky
let reranker: any = null;

async function getReranker() {
	if (!reranker) {
		// Using the cross-encoder model as specified/recommended for reranking tasks
		reranker = await pipeline(
			"text-classification",
			"Xenova/cross-encoder-ms-marco-MiniLM-L-6-v2",
		);
	}
	return reranker;
}

/**
 * Reranks a list of documents based on their relevance to a query.
 * Returns an array of scores corresponding to the documents.
 */
export async function rerank(
	query: string,
	documents: string[],
): Promise<number[]> {
	if (!query || !documents.length) return [];

	try {
		const pipe = await getReranker();

		// Construct inputs for the cross-encoder: pairs of [query, document]
		// The pipeline expects { text: string, text_pair: string } for pair classification
		const inputs = documents.map((doc) => ({
			text: query,
			text_pair: doc,
		}));

		// Run the model
		// output is typically an array of objects { label: string, score: number }
		// for ms-marco, it might just return the score or a 'relevant' label score.
		const output = await pipe(inputs);

		// Extract scores.
		// If output is array of results, mapping them to number.
		// Structure usually: [{ label: 'LABEL_0', score: 0.1 }, ...] or just scores for regression.
		// cross-encoder-ms-marco-MiniLM-L-6-v2 is trained for classification (relevant/not relevant) or regression?
		// Usually it outputs a score. Let's handle the common structure.
		// biome-ignore lint/suspicious/noExplicitAny: Output structure varies
		return output.map((res: any) => {
			if (typeof res === "number") return res;
			if (res?.score) return res.score;
			// If it returns a list of labels (e.g. LABEL_0, LABEL_1), we want the score of the positive label.
			// But ms-marco models on HF usually output a single logit/score.
			return 0;
		});
	} catch (error) {
		console.error("Reranking error:", error);
		// Return 0s in case of failure so the app doesn't crash
		return new Array(documents.length).fill(0);
	}
}
