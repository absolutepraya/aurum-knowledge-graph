// app/console/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Terminal } from "lucide-react";

export default function ConsolePage() {
	const [query, setQuery] = useState("MATCH (n) RETURN n LIMIT 5"); // Default query
	const [result, setResult] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);
	const [isError, setIsError] = useState(false);
	const [entered, setEntered] = useState(false);

	useEffect(() => {
		// small delay to ensure transition runs after mount
		const t = setTimeout(() => setEntered(true), 20);
		return () => clearTimeout(t);
	}, []);

	const handleRun = async () => {
		setIsLoading(true);
		setIsError(false);
		setResult("Running...");

		try {
			const resp = await fetch("/api/console", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ query }),
			});
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const res = await resp.json();

			if (res?.success) {
				setResult(JSON.stringify(res.records ?? res.data ?? res, null, 2));
			} else {
				setIsError(true);
				setResult(`Error: ${res?.message ?? JSON.stringify(res)}`);
			}
		} catch (e: unknown) {
			setIsError(true);
			const message = e instanceof Error ? e.message : String(e);
			setResult(`System error occurred: ${message}`);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div
			className={`min-h-screen bg-background text-foreground font-sans transition-all duration-[1200ms] ease-in-out selection:bg-primary/30 ${
				entered
					? "opacity-100 translate-y-0 scale-100 blur-0"
					: "opacity-0 translate-y-4 scale-95 blur-sm"
			}`}
		>
			{/* Background Elements */}
			<div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
				<div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
			</div>

			<div className="relative z-10 max-w-6xl mx-auto p-6 lg:p-12">
				{/* Header */}
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
					<div>
						<Link
							href="/"
							className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-4 group"
						>
							<ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
							BACK TO SEARCH
						</Link>
						<h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground flex items-center gap-3 tracking-tight">
							<Terminal className="w-8 h-8 text-primary" />
							Cypher Console
						</h1>
						<p className="text-muted-foreground mt-2 max-w-xl">
							Execute raw Cypher queries against the Knowledge Graph. Use with
							caution.
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Left Column: Input */}
					<div className="lg:col-span-2 space-y-6">
						<div className="bg-card/30 backdrop-blur-md border border-white/10 rounded-2xl p-1 shadow-2xl">
							<div className="bg-black/50 rounded-xl overflow-hidden">
								<div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
									<span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
										Query Editor
									</span>
									<div className="flex gap-1.5">
										<div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
										<div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
										<div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
									</div>
								</div>
								<textarea
									id="cypher-query"
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									className="w-full h-64 bg-transparent p-4 font-mono text-sm text-primary placeholder:text-muted-foreground/30 focus:outline-none resize-none leading-relaxed"
									spellCheck={false}
									placeholder="// Enter your Cypher query here..."
								/>
							</div>
						</div>

						<div className="flex justify-end">
							<button
								type="button"
								onClick={handleRun}
								disabled={isLoading}
								className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isLoading ? (
									<>
										<span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
										Executing...
									</>
								) : (
									<>
										<Terminal className="w-4 h-4" />
										Run Query
									</>
								)}
							</button>
						</div>

						{/* Result Area */}
						<div className="bg-card/30 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
							<div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/5">
								<span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
									Output
								</span>
								{isError && (
									<span className="text-xs text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
										FAILED
									</span>
								)}
								{!isError && !isLoading && result && (
									<span className="text-xs text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
										SUCCESS
									</span>
								)}
							</div>
							<div className="p-0 overflow-x-auto bg-black/50 min-h-[200px] max-h-[500px]">
								<pre
									className={`p-6 font-mono text-xs leading-relaxed ${
										isError ? "text-red-400" : "text-muted-foreground"
									}`}
								>
									{result || "// Results will appear here..."}
								</pre>
							</div>
						</div>
					</div>

					{/* Right Column: Sidebar/Cheatsheet */}
					<div className="space-y-6">
						<div className="bg-card/30 backdrop-blur-md border border-white/10 rounded-2xl p-6">
							<h3 className="font-serif font-bold text-lg text-foreground mb-4 border-b border-white/5 pb-2">
								Example Queries
							</h3>
							<div className="space-y-4">
								<div className="group">
									<p className="text-xs text-muted-foreground mb-1.5 font-medium">
										List Artists
									</p>
									<button
										type="button"
										onClick={() =>
											setQuery(
												"MATCH (a:Artist) RETURN a.name, a.nationality LIMIT 5",
											)
										}
										className="w-full text-left p-3 rounded-lg bg-black/40 border border-white/5 text-xs font-mono text-primary/80 hover:text-primary hover:border-primary/30 transition-all"
									>
										MATCH (a:Artist) RETURN a.name...
									</button>
								</div>
								<div className="group">
									<p className="text-xs text-muted-foreground mb-1.5 font-medium">
										Find Artworks by Name
									</p>
									<button
										type="button"
										onClick={() =>
											setQuery(
												"MATCH (a:Artist)-[:CREATED]->(w:Artwork) WHERE a.name CONTAINS 'Vinci' RETURN w.title",
											)
										}
										className="w-full text-left p-3 rounded-lg bg-black/40 border border-white/5 text-xs font-mono text-primary/80 hover:text-primary hover:border-primary/30 transition-all"
									>
										MATCH (a:Artist)-[:CREATED]...
									</button>
								</div>
								<div className="group">
									<p className="text-xs text-muted-foreground mb-1.5 font-medium">
										Graph Statistics
									</p>
									<button
										type="button"
										onClick={() =>
											setQuery(
												"MATCH (n) RETURN labels(n) as Label, count(n) as Total",
											)
										}
										className="w-full text-left p-3 rounded-lg bg-black/40 border border-white/5 text-xs font-mono text-primary/80 hover:text-primary hover:border-primary/30 transition-all"
									>
										MATCH (n) RETURN labels(n)...
									</button>
								</div>
							</div>
						</div>

						<div className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
							<h3 className="font-bold text-sm text-primary mb-2">Pro Tip</h3>
							<p className="text-xs text-muted-foreground leading-relaxed">
								Use <code className="text-primary">LIMIT</code> to avoid
								overwhelming the browser with too many results. The graph
								database contains thousands of nodes.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
