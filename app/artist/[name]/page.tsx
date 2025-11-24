// app/artist/[name]/page.tsx
import GraphViz from "@/components/GraphViz";
import { getArtistDetail, getArtistGraphData } from "../../action";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

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
			<div className="min-h-screen flex items-center justify-center text-foreground">
				<div className="text-center p-8 bg-card border border-border rounded-xl shadow-2xl">
					<h1 className="text-3xl font-serif font-bold mb-4 text-primary">
						Artist Not Found
					</h1>
					<p className="mb-6 text-muted-foreground">
						We could not find an artist with the name &quot;{artistName}&quot;.
					</p>
					<Link
						href="/"
						className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
					>
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
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
			{/* Header Section */}
			<div className="relative w-full bg-card border-b border-white/5 overflow-hidden">
				{/* Abstract Background Pattern */}
				<div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-primary via-background to-background" />

				<div className="max-w-7xl mx-auto px-6 py-20 relative z-10">
					<Link
						href="/"
						className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-12 group"
					>
						<ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
						BACK TO SEARCH
					</Link>

					<div className="flex flex-col lg:flex-row gap-12 items-start">
						<div className="flex-1">
							<div className="flex flex-wrap items-center gap-4 mb-6">
								<span className="px-3 py-1 rounded-full border border-primary/30 text-primary text-xs uppercase tracking-widest font-bold bg-primary/5">
									Artist
								</span>
								{artist.movements.map((m: string) => (
									<span
										key={m}
										className="px-3 py-1 rounded-full border border-white/10 text-muted-foreground text-xs uppercase tracking-widest bg-white/5"
									>
										{m}
									</span>
								))}
							</div>

							<h1 className="text-6xl md:text-8xl font-serif font-bold mb-6 tracking-tight text-foreground leading-none">
								{artist.name}
							</h1>

							<div className="flex flex-wrap gap-x-8 gap-y-2 text-lg text-muted-foreground mb-8 font-light">
								<span>
									<strong className="text-foreground font-medium">Born:</strong>{" "}
									{artist.years}
								</span>
								<span>
									<strong className="text-foreground font-medium">
										Nationality:
									</strong>{" "}
									{artist.nationality || "Unknown"}
								</span>
								{artist.school && (
									<span>
										<strong className="text-foreground font-medium">
											School:
										</strong>{" "}
										{artist.school.charAt(0).toUpperCase() +
											artist.school.slice(1)}
									</span>
								)}
							</div>

							<div className="prose prose-invert prose-lg max-w-none mb-10 text-muted-foreground/80 leading-relaxed">
								<p className="first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:text-primary first-letter:mr-3 first-letter:float-left">
									{artist.bio.replace(/ \(listen\)/g, "")}
								</p>
							</div>

							<div className="flex flex-wrap gap-4">
								{artist.wikipedia && artist.wikipedia !== "#" && (
									<a
										href={artist.wikipedia}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all hover:border-primary/50 hover:text-primary"
									>
										{/** biome-ignore lint/performance/noImgElement: <x> */}
										<img
											src="/wikipedia.webp"
											alt="Wikipedia"
											width={20}
											height={20}
										/>
										Read on Wikipedia <ExternalLink className="w-4 h-4" />
									</a>
								)}
							</div>
						</div>

						{/* Relations Sidebar */}
						{relationSections.length > 0 && (
							<div className="w-full lg:w-80 shrink-0 space-y-6">
								<h3 className="text-xl font-serif font-bold text-foreground border-b border-white/10 pb-4">
									Connections
								</h3>
								{relationSections.map((section) => (
									<div key={section.title}>
										<p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-bold">
											{section.title}
										</p>
										<div className="flex flex-wrap gap-2">
											{section.items.map((item) => (
												<Link
													key={item.name}
													href={`/artist/${encodeURIComponent(item.name)}`}
													className="px-3 py-1.5 rounded-md text-sm bg-card border border-white/10 hover:border-primary/50 hover:text-primary transition-all shadow-sm"
												>
													{item.name}
												</Link>
											))}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Artworks Section - Masonry Layout */}
			<div className="max-w-7xl mx-auto px-6 py-24">
				<div className="flex items-end justify-between mb-12 border-b border-white/10 pb-6">
					<div>
						<h2 className="text-4xl font-serif font-bold text-foreground mb-2">
							Selected Works
						</h2>
						<p className="text-muted-foreground">
							A collection of {artist.artworks.length} masterpieces
						</p>
					</div>
				</div>

				{artist.artworks.length > 0 ? (
					<div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8">
						{artist.artworks.map((work) => {
							const toTitleCase = (str: string) => {
								return str.replace(
									/\w\S*/g,
									(txt) =>
										txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
								);
							};

							return (
								<Link
									key={work.id || work.title}
									href={`/artwork/${encodeURIComponent(work.id)}`}
									className="break-inside-avoid group relative bg-card rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 block"
								>
									<div className="relative">
										{/* eslint-disable-next-line @next/next/no-img-element */}
										{/* biome-ignore lint/performance/noImgElement: Next.js Image component is not configured yet */}
										<img
											src={work.url || placeholder}
											alt={work.title}
											className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
											loading="lazy"
										/>
										<div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
											<h3 className="text-xl font-bold text-white mb-1 font-serif">
												{toTitleCase(work.title)}
											</h3>
											<p className="text-sm text-gray-300 line-clamp-2">
												{work.info ? toTitleCase(work.info) : ""}
											</p>
										</div>
									</div>
									{/* Mobile/Default view info (visible when not hovering on desktop, or always visible) */}
									<div className="p-4 bg-card border-t border-white/5 lg:hidden">
										<h3 className="font-bold text-foreground">
											{toTitleCase(work.title)}
										</h3>
										<p className="text-xs text-muted-foreground mt-1">
											{work.info ? toTitleCase(work.info) : ""}
										</p>
									</div>
								</Link>
							);
						})}
					</div>
				) : (
					<div className="text-center py-20 bg-card/30 rounded-2xl border border-white/5 border-dashed">
						<p className="text-muted-foreground italic">
							No artwork images available for this artist.
						</p>
					</div>
				)}
			</div>

			{/* Graph Section */}
			<div className="bg-card border-t border-white/5 py-24">
				<div className="max-w-7xl mx-auto px-6">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
						<div>
							<h2 className="text-3xl font-serif font-bold text-foreground mb-2">
								Knowledge Graph
							</h2>
							<p className="text-muted-foreground max-w-xl">
								Explore the connections and influences surrounding {artist.name}
								. Click on nodes to navigate.
							</p>
						</div>
						<div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 px-4 py-2 rounded-full border border-white/10">
							<span className="w-2 h-2 rounded-full bg-[#D4AF37]" /> Artist
							<span className="w-2 h-2 rounded-full bg-[#ededed] ml-2" />{" "}
							Artwork
						</div>
					</div>

					<div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/50 h-[600px] relative">
						<GraphViz data={graphData} />
					</div>
				</div>
			</div>
		</div>
	);
}
