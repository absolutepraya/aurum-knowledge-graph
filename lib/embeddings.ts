"use server";

import type { FeatureExtractionPipeline } from "@xenova/transformers";
import { pipeline } from "@xenova/transformers";

let embeddingPipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

async function getEmbeddingPipeline() {
	if (!embeddingPipelinePromise) {
		embeddingPipelinePromise = pipeline(
			"feature-extraction",
			"Xenova/all-MiniLM-L6-v2",
		);
	}
	return embeddingPipelinePromise;
}

export async function embedText(text: string): Promise<number[]> {
	const normalized = text?.trim();
	if (!normalized) return [];
	const embedder = await getEmbeddingPipeline();
	const output = await embedder(normalized, {
		pooling: "mean",
		normalize: true,
	});
	const data = "data" in output ? output.data : null;
	if (!data || typeof data.length !== "number") return [];
	return Array.from(data as Float32Array | number[]);
}
