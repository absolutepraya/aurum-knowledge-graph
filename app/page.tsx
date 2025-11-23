// app/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { searchGlobal, type GlobalSearchResult } from "./action";
import {
	Terminal,
	Search,
	User,
	Palette,
	Sparkles,
	ListFilter,
	ArrowDownNarrowWide,
} from "lucide-react";

import { Suspense } from "react";
import Link from "next/link";

function SearchContent() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<GlobalSearchResult[]>([]);
	const [hasSearched, setHasSearched] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [lastSearchedQuery, setLastSearchedQuery] = useState("");

	// Filter & Sort State
	const [filter, setFilter] = useState<"all" | "artist" | "artwork">("all");
	const [sort, setSort] = useState<"relevance" | "az" | "za">("relevance");

	const searchParams = useSearchParams();
	const qParam = searchParams.get("q") || "";
	const [lastQueried, setLastQueried] = useState("");
	const router = useRouter();
	const [useAiSearch, setUseAiSearch] = useState(false);

	const performSearch = useCallback(
		async (
			q: string,
			semantic: boolean,
			currentFilter: "all" | "artist" | "artwork" = "all",
			currentSort: "relevance" | "az" | "za" = "relevance",
		) => {
			if (!q || !q.trim()) {
				setResults([]);
				setHasSearched(true);
				setLastSearchedQuery(q || "");
				return;
			}
			setIsLoading(true);
			try {
				const data = await searchGlobal(q, {
					semantic,
					filter: currentFilter,
					sort: currentSort,
				});
				setResults(data);
				setHasSearched(true);
				setLastSearchedQuery(q);
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	useEffect(() => {
		if (!qParam) return;
		const signature = `${qParam}|${useAiSearch ? "1" : "0"}|${filter}|${sort}`;
		if (signature === lastQueried) return;
		setQuery(qParam);
		performSearch(qParam, useAiSearch, filter, sort);
		setLastQueried(signature);
	}, [qParam, useAiSearch, filter, sort, lastQueried, performSearch]);

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		await performSearch(query, useAiSearch, filter, sort);
	};

	return (
		<div className="w-full max-w-5xl relative z-10 px-6 pt-32 pb-16 flex flex-col items-center">
			{/* Hero Title */}
			<h1 className="text-6xl md:text-8xl font-serif font-bold text-center mb-4 tracking-tight text-transparent bg-clip-text bg-linear-to-b from-white to-white/60 drop-shadow-2xl">
				Aurum Art Gallery
			</h1>
			<p className="text-center text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl font-light tracking-wide">
				Discover the masterpieces of history. Search for artists, movements, and
				timeless artworks.
			</p>

			{/* Search Bar */}
			<form onSubmit={handleSearch} className="w-full max-w-4xl mb-16">
				<div className="relative group">
					<div className="absolute -inset-1 bg-linear-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
					<div className="relative flex items-center bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/5 focus-within:ring-primary/50 transition-all pr-1 py-0.5">
						<Search className="absolute left-5.5 w-6 h-6 text-muted-foreground" />
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search for 'Van Gogh', 'Impressionism'..."
							className="flex-1 bg-transparent pl-16 pr-6 py-5 text-lg text-foreground placeholder:text-muted-foreground/50 outline-none"
						/>
						<button
							type="submit"
							disabled={isLoading}
							className="px-8 py-5 bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors border-l border-white/5 rounded-xl"
						>
							{isLoading ? (
								<span className="animate-pulse">Searching...</span>
							) : (
								"Search"
							)}
						</button>
					</div>
				</div>

				{/* Filters & Options */}
				<div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 px-2">
					<div className="flex items-center gap-4">
						{/* Filter Dropdown */}
						<div className="flex items-center gap-2 bg-card/30 backdrop-blur-md border border-white/10 rounded-lg p-1 pl-3">
							<ListFilter className="w-4 h-4 text-muted-foreground" />
							<div className="h-4 w-px bg-white/10 mx-1" />
							{(["all", "artist", "artwork"] as const).map((f) => (
								<button
									key={f}
									type="button"
									onClick={() => {
										setFilter(f);
										if (query) performSearch(query, useAiSearch, f, sort);
									}}
									className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
										filter === f
											? "bg-primary/20 text-primary shadow-sm"
											: "text-muted-foreground hover:text-foreground hover:bg-white/5"
									}`}
								>
									{f.charAt(0).toUpperCase() + f.slice(1)}
								</button>
							))}
						</div>

						{/* Sort Dropdown */}
						<div className="flex items-center gap-2 bg-card/30 backdrop-blur-md border border-white/10 rounded-lg p-1 pl-3">
							<ArrowDownNarrowWide className="w-4 h-4 text-muted-foreground" />
							<div className="h-4 w-px bg-white/10 mx-1" />
							{(["relevance", "az", "za"] as const).map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => {
										setSort(s);
										if (query) performSearch(query, useAiSearch, filter, s);
									}}
									className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
										sort === s
											? "bg-primary/20 text-primary shadow-sm"
											: "text-muted-foreground hover:text-foreground hover:bg-white/5"
									}`}
								>
									{s === "relevance" ? "Relevance" : s === "az" ? "A-Z" : "Z-A"}
								</button>
							))}
						</div>
					</div>

					<label className="flex items-center gap-3 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors bg-card/30 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg">
						<div className="relative flex items-center">
							<input
								type="checkbox"
								checked={useAiSearch}
								onChange={(e) => {
									setUseAiSearch(e.target.checked);
									if (query)
										performSearch(query, e.target.checked, filter, sort);
								}}
								className="peer sr-only"
							/>
							<div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
						</div>
						<span className="flex items-center gap-2">
							<Sparkles className="w-4 h-4 text-primary" />
							AI Semantic Search
						</span>
					</label>
				</div>
			</form>

			{/* Results Grid */}
			<div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{results.map((item) => (
					<Link
						key={`${item.type}-${item.linkParam}`}
						href={
							item.type === "artist"
								? `/artist/${encodeURIComponent(item.linkParam)}`
								: `/artwork/${encodeURIComponent(item.linkParam)}`
						}
						className="group relative bg-card/40 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden hover:bg-card/60 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5"
					>
						<div className="p-6 flex items-start gap-4">
							<div
								className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-full text-xl border border-white/10 ${
									item.type === "artist"
										? "bg-blue-500/10 text-blue-400"
										: "bg-orange-500/10 text-orange-400"
								}`}
							>
								{item.type === "artist" ? (
									<User className="w-6 h-6" />
								) : (
									<Palette className="w-6 h-6" />
								)}
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between gap-2 mb-1">
									<span
										className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
											item.type === "artist"
												? "border-blue-500/20 text-blue-400"
												: "border-orange-500/20 text-orange-400"
										}`}
									>
										{item.type === "artist" ? "Artist" : "Artwork"}
									</span>
								</div>
								<h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors truncate">
									{item.title}
								</h2>
								<p className="text-sm text-muted-foreground mt-1 line-clamp-2">
									{item.subtitle}
								</p>
							</div>
						</div>
					</Link>
				))}
			</div>

			{hasSearched && results.length === 0 && !isLoading && (
				<div className="w-full max-w-md text-center py-16 px-6 bg-card/30 backdrop-blur-sm border border-white/5 rounded-2xl">
					<p className="text-xl text-muted-foreground mb-2">No results found</p>
					<p className="text-sm text-muted-foreground/60">
						We couldn&apos;t find anything matching &quot;
						{lastSearchedQuery || query}&quot;. Try a different keyword.
					</p>
				</div>
			)}

			<div className="mt-24 text-center">
				<p className="text-xs text-muted-foreground/40 uppercase tracking-widest">
					Property of KGTAU
				</p>
			</div>
		</div>
	);
}

export default function Home() {
	return (
		<main className="relative min-h-screen flex flex-col items-center justify-start bg-background text-foreground font-sans">
			{/* Background Animation */}
			<div className="absolute top-0 left-0 w-full h-screen z-0 overflow-hidden pointer-events-none">
				<div
					className="absolute inset-0 bg-cover bg-center opacity-20 animate-pan-slow"
					style={{
						backgroundImage:
							"url('https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg')",
					}}
				/>
				<div className="absolute inset-0 bg-linear-to-b from-background via-background/20 to-background" />
			</div>

			<Suspense fallback={<div>Loading...</div>}>
				<SearchContent />
			</Suspense>
		</main>
	);
}
