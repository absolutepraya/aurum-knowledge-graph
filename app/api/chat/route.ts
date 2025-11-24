import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { getChatContext } from "@/lib/retrieval";

export const maxDuration = 30;

export async function POST(req: Request) {
	try {
		const body = await req.json();
		console.log("Request body:", JSON.stringify(body, null, 2));

		const { messages } = body || {};

		if (!messages) {
			console.error("Messages is missing from request body");
			return new Response(
				JSON.stringify({ error: "Messages array is required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		if (!Array.isArray(messages)) {
			console.error("Messages is not an array:", typeof messages, messages);
			return new Response(
				JSON.stringify({ error: "Messages must be an array" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		if (messages.length === 0) {
			console.error("Messages array is empty");
			return new Response(
				JSON.stringify({ error: "At least one message is required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		console.log("Messages received:", messages.length, "messages");
		console.log("First message sample:", JSON.stringify(messages[0], null, 2));

		const lastUserMessage = messages
			.slice()
			.reverse()
			.find((message) => message.role === "user");

		const messagesWithoutId = messages.map(({ id, ...message }) => message);

		const context = await getChatContext(
			typeof lastUserMessage?.content === "string"
				? lastUserMessage.content
				: "User sent a multimedia message.",
		);

		const systemPrompt = `
You are an expert Museum Guide for the Aurum Art Gallery.
You have access to a knowledge graph of information about historical artworks and artists.

CONTEXT FROM DATABASE:
${context || "No specific database matches found."}

INSTRUCTIONS:
1. Answer the user's question based on the CONTEXT provided above.
2. If the context contains relevant artworks or artists, mention them specifically.
3. If the context is empty or irrelevant, use your general knowledge but mention that you couldn't find specific details in the gallery database.
4. Be polite, educational, and engaging.
5. Keep answers concise but informative.
`;

		console.log(
			"chat-request",
			JSON.stringify({
				lastUserMessage: lastUserMessage?.content ?? null,
				contextPreview: context.slice(0, 200),
				messageCount: messagesWithoutId.length,
			}),
		);

		const result = await streamText({
			model: google("gemini-2.5-pro"),
			system: systemPrompt,
			messages: messagesWithoutId,
		});

		return result.toUIMessageStreamResponse();
	} catch (error) {
		console.error("Chat API error:", error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Internal server error",
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}
