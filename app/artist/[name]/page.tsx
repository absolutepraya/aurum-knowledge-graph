// app/artist/[name]/page.tsx
import GraphViz from "@/components/GraphViz";
import { getArtistDetail, getArtistGraphData } from "../../action";
import Link from "next/link";

// PENTING: Di Next.js 15, params adalah Promise
interface PageProps {
	params: Promise<{ name: string }>;
}

export default async function ArtistPage({ params }: PageProps) {
	// 1. Tunggu (await) params-nya dulu sebelum dipakai
	const resolvedParams = await params;

	// 2. Baru decode namanya
	const artistName = decodeURIComponent(resolvedParams.name);

	const [artist, graphData] = await Promise.all([
		getArtistDetail(artistName),
		getArtistGraphData(artistName),
	]);

	// Jika artist tidak ditemukan
	if (!artist) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-2">Data not found 😔</h1>
					<p className="mb-4">
						Sorry, we could not find an artist with the name "{artistName}".
					</p>
					<Link href="/" className="text-blue-600 hover:underline">
						Back to Search
					</Link>
				</div>
			</div>
		);
	}

	// Placeholder to use when artwork URL is missing
	const placeholder = "https://via.placeholder.com/400x300?text=No+Image";
	const relationSections = [
		{ title: "Influenced By", items: artist.influencedBy },
		{ title: "Influenced", items: artist.influences },
		{ title: "Mentors", items: artist.mentors },
		{ title: "Students", items: artist.students },
	].filter((section) => section.items.length > 0);

	return (
		<div className="min-h-screen bg-white text-slate-900">
			{/* Header Hitam */}
			<div className="bg-slate-900 text-white py-16 px-6">
				<div className="max-w-4xl mx-auto">
					<Link
						href="/"
						className="text-slate-400 hover:text-white mb-6 inline-block text-sm font-medium"
					>
						← BACK TO SEARCH
					</Link>

					<div className="flex flex-col md:flex-row gap-8 items-start">
						<div className="flex-1">
							<h1 className="text-5xl font-bold mb-2 tracking-tight">
								{artist.name}
							</h1>
							<p className="text-xl text-slate-400 mb-4">
								{artist.years} • {artist.nationality || "Unknown"}
							</p>

							{/* Extra metadata returned from action.ts */}
							<div className="flex flex-wrap gap-4 mb-6">
								<span className="text-sm text-slate-300">
									Total artworks:{" "}
									<strong className="text-white ml-1">
										{artist.paintings_count ?? "—"}
									</strong>
								</span>
								{artist.school && (
									<span className="text-sm text-slate-300">
										School:{" "}
										<strong className="text-white ml-1">{artist.school}</strong>
									</span>
								)}
							</div>

							<div className="flex flex-wrap gap-2 mb-6">
								{artist.movements.map((m: string) => (
									<span
										key={m}
										className="bg-blue-600/20 text-blue-300 border border-blue-600/30 px-3 py-1 rounded-full text-sm"
									>
										{m}
									</span>
								))}
							</div>

							<div className="prose prose-invert max-w-none">
								<p className="text-slate-300 leading-relaxed text-lg">
									{artist.bio}
								</p>
							</div>

							{artist.wikipedia && artist.wikipedia !== "#" && (
								<a
									href={artist.wikipedia}
									target="_blank"
									rel="noopener noreferrer"
									className="mt-4 inline-block text-blue-400 hover:text-blue-300 text-sm"
								>
									Read more on Wikipedia ↗
								</a>
							)}

							{relationSections.length > 0 && (
								<div className="mt-8 w-full">
									<h3 className="text-lg font-semibold text-white mb-3">
										Wikidata Relations
									</h3>
									<div className="grid gap-4 sm:grid-cols-2">
										{relationSections.map((section) => (
											<div
												key={section.title}
												className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
											>
												<p className="text-xs uppercase tracking-wide text-slate-400 mb-3">
													{section.title}
												</p>
												<div className="flex flex-wrap gap-2">
													{section.items.map((item) => (
														<Link
															key={item.name}
															href={`/artist/${encodeURIComponent(item.name)}`}
															className="px-3 py-1 rounded-full text-sm bg-white/10 text-white border border-white/20 hover:bg-white/20"
														>
															{item.name}
														</Link>
													))}
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Grid Karya Seni */}
			<div className="max-w-6xl mx-auto px-6 py-12">
				<h2 className="text-2xl font-bold mb-8 border-b border-slate-200 pb-4 text-slate-800">
					Famous Works ({artist.artworks.length})
				</h2>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
					{artist.artworks.map((work) => (
						<div key={work.id || work.title} className="group">
							<div className="aspect-4/3 bg-slate-100 rounded-lg overflow-hidden mb-3 relative shadow-sm border border-slate-200">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								{/* biome-ignore lint/performance/noImgElement: Next.js Image component is not configured yet */}
								<img
									src={work.url || placeholder}
									alt={work.title}
									className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
									loading="lazy"
								/>
							</div>
							<h3 className="font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
								{work.title}
							</h3>
							<p className="text-xs text-slate-500 mt-1 truncate">
								{work.info}
							</p>
						</div>
					))}
				</div>

				{artist.artworks.length === 0 && (
					<p className="text-slate-500 italic text-center py-10">
						No image data available for this artist.
					</p>
				)}
			</div>

			<div className="max-w-6xl mx-auto px-6 pb-16">
				<div className="border-t border-slate-200 pt-12">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
						<h2 className="text-2xl font-bold text-slate-800">
							Relationship Graph
						</h2>
						<p className="text-sm text-slate-500">
							Click node to open detail page.
						</p>
					</div>
					<GraphViz data={graphData} />
				</div>
			</div>
		</div>
	);
}
