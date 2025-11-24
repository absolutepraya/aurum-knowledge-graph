import { google } from "@ai-sdk/google";
import { convertToModelMessages, generateText, streamText } from "ai";
import { getChatContext } from "@/lib/retrieval";

export const maxDuration = 30;

async function classifyRetrievalIntent(
	message: string,
): Promise<"retrieve" | "skip"> {
	const normalized = message.trim();
	if (!normalized) {
		return "retrieve";
	}
	try {
		const classification = await generateText({
			model: google("gemini-1.5-flash"),
			temperature: 0,
			system:
				"You decide whether the Aurum Museum assistant must consult its knowledge graph. Respond with only retrieve or skip. Use retrieve for any request about artworks, artists, art history, or gallery data. Respond skip for greetings, chit-chat, or messages with no museum-specific question.",
			prompt: normalized,
		});
		const decision = classification.text.trim().toLowerCase();
		if (decision.startsWith("skip")) {
			return "skip";
		}
		return "retrieve";
	} catch (error) {
		console.error("Intent classifier error:", error);
		return "retrieve";
	}
}

function getMessageText(message: {
	content?: unknown;
	parts?: Array<{ type: string; text?: string }>;
}): string {
	if (typeof message.content === "string") {
		return message.content;
	}
	if (Array.isArray(message.parts)) {
		const text = message.parts
			.map((part) => {
				if (
					part?.type === "text" &&
					typeof (part as { text?: unknown }).text === "string"
				) {
					return (part as { text: string }).text;
				}
				return "";
			})
			.join("");
		return text || "";
	}
	return "";
}

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

		const modelMessages = convertToModelMessages(
			messages.map(({ id, ...message }) => message),
		);

		const lastUserText = lastUserMessage ? getMessageText(lastUserMessage) : "";
		const fallbackUserText = lastUserText || "User sent a multimedia message.";
		const retrievalIntent = lastUserText
			? await classifyRetrievalIntent(lastUserText)
			: "retrieve";
		const context =
			retrievalIntent === "retrieve"
				? await getChatContext(fallbackUserText)
				: "Classifier marked this turn as small talk; gallery context was not fetched.";

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
				lastUserMessage: lastUserText || null,
				contextPreview: context.slice(0, 200),
				messageCount: modelMessages.length,
				retrievalIntent,
			}),
		);

		const result = await streamText({
			model: google("gemini-2.5-pro"),
			system: systemPrompt,
			messages: modelMessages,
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
