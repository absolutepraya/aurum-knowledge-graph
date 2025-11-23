// app/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { searchGlobal, type GlobalSearchResult } from "./action"; // Import fungsi baru (fixed path)
import Link from "next/link";

export default function Home() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<GlobalSearchResult[]>([]);
	const [hasSearched, setHasSearched] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	// Track the exact term that was last searched (prevents live-updating "not found" text while typing)
	const [lastSearchedQuery, setLastSearchedQuery] = useState("");

	const searchParams = useSearchParams();
	const qParam = searchParams.get("q") || "";
	const [lastQueried, setLastQueried] = useState(""); // track last param we searched for
	const router = useRouter();
	const [useAiSearch, setUseAiSearch] = useState(false);

	const performSearch = useCallback(async (q: string, semantic: boolean) => {
		if (!q || !q.trim()) {
			setResults([]);
			setHasSearched(true);
			setLastSearchedQuery(q || "");
			return;
		}
		setIsLoading(true);
		try {
			const data = await searchGlobal(q, { semantic });
			setResults(data);
			setHasSearched(true);
			setLastSearchedQuery(q);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// run search when ?q= changes, but only if it's a new q value
	useEffect(() => {
		if (!qParam) return;
		const signature = `${qParam}|${useAiSearch ? "1" : "0"}`;
		if (signature === lastQueried) return;
		setQuery(qParam);
		performSearch(qParam, useAiSearch);
		setLastQueried(signature);
	}, [qParam, useAiSearch, lastQueried, performSearch]);

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		await performSearch(query, useAiSearch);
	};

	const handleConsoleClick = () => {
		router.push("/console");
	};

	return (
		<main className="relative min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 font-sans py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
			<div className="w-full max-w-3xl relative">
				<h1 className="text-4xl font-extrabold text-center mb-2 text-slate-800 opacity-9">
					PROPERTY OF KGTAU
				</h1>
				<h1 className="text-4xl font-extrabold text-center mb-2 text-slate-800">
					🏛️ Art History Gallery
				</h1>
				<p className="text-center text-slate-500 mb-8">
					Search Artists or Artworks (Example: "Mona Lisa" or "Picasso")
				</p>

				<div className="flex justify-end mb-4">
					<button
						type="button"
						onClick={handleConsoleClick}
						className="inline-flex items-center gap-3 px-4 py-2 rounded-xl font-bold text-sm text-white shadow-lg bg-linear-to-r from-green-400 to-blue-500 hover:scale-105 hover:-translate-y-1 transition-all"
						aria-label="Open Cypher Console"
					>
						🖥 Console
					</button>
				</div>

				<form onSubmit={handleSearch} className="flex flex-col gap-3 mb-10">
					<div className="flex gap-3">
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Type keywords to search..."
							className="flex-1 p-4 rounded-xl border border-slate-300 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
						/>
						<button
							type="submit"
							disabled={isLoading}
							className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-colors"
						>
							{isLoading ? "..." : "🔍︎"}
						</button>
					</div>
					<label className="flex items-center gap-2 text-sm text-slate-600">
						<input
							type="checkbox"
							checked={useAiSearch}
							onChange={(e) => setUseAiSearch(e.target.checked)}
							className="w-4 h-4 accent-blue-600"
						/>
						Use AI Search (beta)
					</label>
				</form>

				<div className="grid gap-4">
					{results.map((item) => (
						<Link
							key={`${item.type}-${item.linkParam}`}
							href={
								item.type === "artist"
									? `/artist/${encodeURIComponent(item.linkParam)}`
									: `/artwork/${encodeURIComponent(item.linkParam)}`
							}
							className="block bg-white p-5 rounded-lg border border-slate-200 hover:shadow-md transition-all hover:border-blue-300 group"
						>
							<div className="flex items-center gap-4">
								{/* Ikon Pembeda Tipe */}
								<div
									className={`w-12 h-12 flex items-center justify-center rounded-full text-xl 
                  ${item.type === "artist" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}
								>
									{item.type === "artist" ? "👤" : "🎨"}
								</div>

								<div>
									<div className="flex items-center gap-2">
										<h2 className="text-lg font-bold text-slate-800 group-hover:text-blue-600">
											{item.title}
										</h2>
										{/* Badge Tipe */}
										<span
											className={`text-xs px-2 py-0.5 rounded border ${item.type === "artist" ? "border-blue-200 text-blue-600" : "border-orange-200 text-orange-600"}`}
										>
											{item.type === "artist" ? "Artist" : "Artwork"}
										</span>
									</div>
									<p className="text-slate-500 text-sm mt-1">{item.subtitle}</p>
								</div>
							</div>
						</Link>
					))}

					{hasSearched && results.length === 0 && !isLoading && (
						<div className="text-center text-slate-400 py-10 bg-white rounded-lg border border-dashed border-slate-300">
							No results found for "{lastSearchedQuery || query}".
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
