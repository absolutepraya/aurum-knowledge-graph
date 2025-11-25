"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import { Send, Bot } from "lucide-react";
import {
	type ChangeEvent,
	type FormEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import * as motion from "framer-motion/client";
import { containerVariants, itemVariants } from "@/lib/animations";

export default function ChatPage() {
	const { messages, sendMessage, status } = useChat({
		transport: new DefaultChatTransport({
			api: "/api/chat",
		}),
	});
	const _messagesEndRef = useRef<HTMLDivElement>(null);
	const [input, setInput] = useState("");
	const isLoading = status === "submitted" || status === "streaming";

	const _handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		setInput(event.target.value);
	};

	const _handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!input.trim() || isLoading) {
			return;
		}
		await sendMessage({ text: input });
		setInput("");
	};

	const _handleSuggestionClick = (suggestion: string) => {
		if (isLoading) {
			return;
		}
		void sendMessage({ text: suggestion });
		setInput("");
	};

	const _getMessageText = (message: (typeof messages)[number]) => {
		if ("content" in message && typeof message.content === "string") {
			return message.content;
		}
		if (Array.isArray(message.parts)) {
			const text = message.parts
				.map((part) => {
					if (
						part.type === "text" &&
						"text" in part &&
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
	};

	useEffect(() => {
		_messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const suggestions = [
		"Who is Vincent van Gogh?",
		"Show me artworks by Monet",
		"Tell me about Impressionism",
		"What is The Starry Night?",
	];

	return (
		<div className="flex flex-col h-screen max-w-2xl mx-auto px-4 pt-24 pb-6">
			<div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide">
				{messages.length === 0 && (
					<motion.div
						className="h-full flex flex-col items-center justify-center text-center space-y-8"
						initial="hidden"
						animate="visible"
						variants={containerVariants}
					>
						<motion.div className="relative" variants={itemVariants}>
							<div className="w-20 h-20 rounded-2xl bg-linear-to-tr from-primary/20 to-primary/5 flex items-center justify-center rotate-3 transition-transform hover:rotate-6">
								<Bot className="w-10 h-10 text-primary" />
							</div>
							<div className="absolute -inset-1 bg-primary/20 blur-xl -z-10 rounded-full opacity-50" />
						</motion.div>

						<motion.div className="space-y-2 max-w-md" variants={itemVariants}>
							<h2 className="text-3xl font-serif font-medium tracking-tight">
								Aurum Museum Guide
							</h2>
							<p className="text-muted-foreground/80 leading-relaxed">
								Welcome to the digital collection. I can help you discover
								artists, analyze artworks, and explore art history.
							</p>
						</motion.div>

						<motion.div
							className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg pt-4"
							variants={itemVariants}
						>
							{suggestions.map((s) => (
								<button
									type="button"
									key={s}
									onClick={() => _handleSuggestionClick(s)}
									className="group p-4 text-sm text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/20 transition-all duration-300"
								>
									<span className="block text-foreground/90 group-hover:text-primary transition-colors">
										{s}
									</span>
								</button>
							))}
						</motion.div>
					</motion.div>
				)}

				{messages.map((m) => (
					<motion.div
						key={m.id}
						className={`flex gap-4 ${
							m.role === "user" ? "justify-end" : "justify-start"
						}`}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3 }}
					>
						{m.role !== "user" && (
							<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
								<Bot className="w-4 h-4 text-primary" />
							</div>
						)}
						<div
							className={`max-w-[85%] p-4 shadow-sm ${
								m.role === "user"
									? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
									: "bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm backdrop-blur-sm"
							}`}
						>
							<div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
								<ReactMarkdown>{_getMessageText(m)}</ReactMarkdown>
							</div>
						</div>
					</motion.div>
				))}

				{isLoading && (
					<motion.div
						className="flex gap-4 justify-start"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<Bot className="w-4 h-4 text-primary" />
						</div>
						<div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 flex items-center gap-1.5 h-12">
							<span
								className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"
								style={{ animationDelay: "0ms" }}
							/>
							<span
								className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"
								style={{ animationDelay: "150ms" }}
							/>
							<span
								className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"
								style={{ animationDelay: "300ms" }}
							/>
						</div>
					</motion.div>
				)}
				<div ref={_messagesEndRef} className="h-4" />
			</div>

			<div className="mt-6 relative">
				<form
					onSubmit={_handleSubmit}
					className="relative flex items-center group"
				>
					<input
						className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl pl-6 pr-14 py-4 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30 focus:bg-white/10 transition-all placeholder:text-muted-foreground/50"
						value={input || ""}
						onChange={_handleInputChange}
						placeholder="Ask about an artist or artwork..."
					/>
					<button
						type="submit"
						disabled={isLoading || !input?.trim()}
						className="absolute right-2 p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-0 disabled:scale-75 transition-all duration-200"
					>
						<Send className="w-5 h-5" />
					</button>
				</form>
				<div className="absolute inset-0 -z-10 bg-linear-to-t from-background via-background to-transparent -top-20 pointer-events-none" />
			</div>
		</div>
	);
}
