// app/console/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
			setResult(`Terjadi kesalahan sistem: ${message}`);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div
			className={`min-h-screen bg-slate-900 text-slate-200 p-8 font-mono transition-all duration-[1200ms] ease-in-out ${entered ? "opacity-100 translate-y-0 scale-100 blur-0" : "opacity-0 translate-y-4 scale-95 blur-sm"}`}
		>
			<div className="max-w-5xl mx-auto">
				{/* Header */}
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-bold text-green-400">
						&gt; KGTAU Cypher Console (KELAZOOOO)
					</h1>
					<Link
						href="/"
						className="text-sm text-slate-400 hover:text-white underline"
					>
						← Kembali ke Search UI
					</Link>
				</div>

				{/* Input Area (Terminal Box) */}
				<div className="mb-4">
					<label
						htmlFor="cypher-query"
						className="block text-xs text-slate-500 mb-2 uppercase tracking-wider"
					>
						Masukkan Query Cypher:
					</label>
					<textarea
						id="cypher-query"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="w-full h-40 bg-slate-800 border border-slate-700 rounded p-4 text-green-300 focus:outline-none focus:border-green-500 transition-colors"
						spellCheck={false}
					/>
				</div>

				{/* Action Button */}
				<div className="flex justify-end mb-8">
					<button
						type="button"
						onClick={handleRun}
						disabled={isLoading}
						className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? "Executing..." : "Run Query"}
					</button>
				</div>

				{/* Result Area */}
				<div className="bg-black rounded border border-slate-700 p-4 overflow-x-auto">
					<div className="flex justify-between mb-2 border-b border-slate-800 pb-2">
						<span className="text-xs text-slate-500">RESULT OUTPUT</span>
						{isError && (
							<span className="text-xs text-red-500 font-bold">FAILED</span>
						)}
						{!isError && !isLoading && result && (
							<span className="text-xs text-green-500 font-bold">SUCCESS</span>
						)}
					</div>
					<pre
						className={`text-sm ${isError ? "text-red-400" : "text-slate-300"}`}
					>
						{result || "// Outputnya entar di sini coy..."}
					</pre>
				</div>

				{/* Cheat Sheet (Opsional, biar dosen lihat) */}
				<div className="mt-8 p-4 bg-slate-800/50 rounded text-xs text-slate-400">
					<p className="font-bold text-slate-300 mb-2">Contoh Query:</p>
					<ul className="list-disc pl-5 space-y-1">
						<li>
							<code>MATCH (a:Artist) RETURN a.name, a.nationality LIMIT 5</code>
						</li>
						<li>
							<code>
								MATCH (a:Artist)-[:CREATED]-&gt;(w:Artwork) WHERE a.name
								CONTAINS 'Vinci' RETURN w.title
							</code>
						</li>
						<li>
							<code>
								MATCH (n) RETURN labels(n) as Label, count(n) as Total
							</code>
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
