import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getChatContext } from "@/lib/retrieval";

export const maxDuration = 30;

export async function POST(req: Request) {
	const { messages } = await req.json();
	const lastMessage = messages[messages.length - 1];

	const context = await getChatContext(lastMessage.content);

	const systemPrompt = `
You are an expert Museum Guide for the Aurum Art Gallery.
You have access to a knowledge graph of artists and artworks.

CONTEXT FROM DATABASE:
${context || "No specific database matches found."}

INSTRUCTIONS:
1. Answer the user's question based on the CONTEXT provided above.
2. If the context contains relevant artworks or artists, mention them specifically.
3. If the context is empty or irrelevant, use your general knowledge but mention that you couldn't find specific details in the gallery database.
4. Be polite, educational, and engaging.
5. Keep answers concise but informative.
`;

	const result = await streamText({
		model: openai("gpt-4o"),
		system: systemPrompt,
		messages,
	});

	return result.toDataStreamResponse();
}
