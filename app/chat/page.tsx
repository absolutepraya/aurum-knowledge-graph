"use client";

import { useChat } from "ai/react";
import { Send, Bot, User } from "lucide-react";
import { useEffect, useRef } from "react";

export default function ChatPage() {
	const {
		messages,
		input,
		handleInputChange,
		handleSubmit,
		isLoading,
		append,
	} = useChat();
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const suggestions = [
		"Who is Vincent van Gogh?",
		"Show me artworks by Monet",
		"Tell me about Impressionism",
		"What is The Starry Night?",
	];

	return (
		<div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto p-4">
			<div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
				{messages.length === 0 && (
					<div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-80">
						<div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
							<Bot className="w-8 h-8 text-primary" />
						</div>
						<div>
							<h2 className="text-2xl font-serif font-bold">
								Aurum Museum Guide
							</h2>
							<p className="text-muted-foreground">
								Ask me anything about our collection.
							</p>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
							{suggestions.map((s) => (
								<button
									type="button"
									key={s}
									onClick={() => append({ role: "user", content: s })}
									className="p-3 text-sm text-left rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
								>
									{s}
								</button>
							))}
						</div>
					</div>
				)}

				{messages.map((m) => (
					<div
						key={m.id}
						className={`flex gap-3 ${
							m.role === "user" ? "justify-end" : "justify-start"
						}`}
					>
						{m.role !== "user" && (
							<div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
								<Bot className="w-5 h-5 text-primary" />
							</div>
						)}
						<div
							className={`max-w-[80%] p-3 rounded-2xl px-4 ${
								m.role === "user"
									? "bg-primary text-primary-foreground rounded-br-sm"
									: "bg-white/10 border border-white/10 rounded-bl-sm"
							}`}
						>
							<p className="whitespace-pre-wrap text-sm leading-relaxed">
								{m.content}
							</p>
						</div>
						{m.role === "user" && (
							<div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
								<User className="w-5 h-5" />
							</div>
						)}
					</div>
				))}

				{isLoading && (
					<div className="flex gap-3 justify-start">
						<div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
							<Bot className="w-5 h-5 text-primary" />
						</div>
						<div className="bg-white/10 border border-white/10 rounded-2xl rounded-bl-sm p-3 px-4 flex items-center gap-1">
							<span
								className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
								style={{ animationDelay: "0ms" }}
							/>
							<span
								className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
								style={{ animationDelay: "150ms" }}
							/>
							<span
								className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
								style={{ animationDelay: "300ms" }}
							/>
						</div>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			<form onSubmit={handleSubmit} className="mt-4 flex gap-2">
				<input
					className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
					value={input}
					onChange={handleInputChange}
					placeholder="Ask about an artist or artwork..."
				/>
				<button
					type="submit"
					disabled={isLoading || !input.trim()}
					className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
				>
					<Send className="w-5 h-5" />
				</button>
			</form>
		</div>
	);
}
