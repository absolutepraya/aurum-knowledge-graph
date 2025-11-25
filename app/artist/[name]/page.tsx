import GraphViz from "@/components/GraphViz";
import ArtworkCard from "@/components/ArtworkCard";
import { getArtistDetail, getArtistGraphData } from "../../action";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import * as motion from "framer-motion/client";
import { containerVariants, itemVariants } from "@/lib/animations";

// PENTING: Di Next.js 15, params adalah Promise
interface PageProps {
	params: Promise<{ name: string }>;
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ArtistPage({ params, searchParams }: PageProps) {
	// 1. Tunggu (await) params-nya dulu sebelum dipakai
	const resolvedParams = await params;

	// 2. Baru decode namanya
	const artistName = decodeURIComponent(resolvedParams.name);
	const resolvedSearchParams = searchParams ? await searchParams : {};
	const pageParamRaw = Array.isArray(resolvedSearchParams.page)
		? resolvedSearchParams.page[0]
		: resolvedSearchParams.page;
	const parsedPage = pageParamRaw ? Number.parseInt(pageParamRaw, 10) : 1;

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
	const artworksPerPage = 15;
	const totalArtworks = artist.artworks.length;
	const totalPages = Math.max(1, Math.ceil(totalArtworks / artworksPerPage));
	const currentPage = Math.min(
		totalPages,
		Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage,
	);
	const startIndex = (currentPage - 1) * artworksPerPage;
	const paginatedArtworks = artist.artworks.slice(
		startIndex,
		startIndex + artworksPerPage,
	);
	const displayStart = totalArtworks === 0 ? 0 : startIndex + 1;
	const displayEnd = Math.min(
		totalArtworks,
		startIndex + paginatedArtworks.length,
	);
	const getPageHref = (page: number) => ({
		pathname: `/artist/${encodeURIComponent(artist.name)}`,
		query: page > 1 ? { page: page.toString() } : undefined,
	});

	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
			{/* Header Section */}
			<div className="relative w-full bg-card border-b border-white/5 overflow-hidden">
				{/* Abstract Background Pattern */}
				<div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-primary via-background to-background" />

				<motion.div
					className="max-w-7xl mx-auto px-6 py-20 relative z-10"
					initial="hidden"
					animate="visible"
					variants={containerVariants}
				>
					<motion.div variants={itemVariants}>
						<Link
							href="/"
							className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-12 group"
						>
							<ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
							BACK TO SEARCH
						</Link>
					</motion.div>

					<div className="flex flex-col lg:flex-row gap-12 items-start">
						{/* Artist Image - Desktop (Left Column) / Mobile (Top) */}
						{artist.image && (
							<motion.div
								className="w-full lg:w-1/3 shrink-0"
								variants={itemVariants}
							>
								<div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
									<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
									{/** biome-ignore lint/performance/noImgElement: <x> */}
									<img
										src={artist.image}
										alt={artist.name}
										className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
									/>
									<div className="absolute bottom-0 left-0 right-0 p-6 z-20">
										<p className="text-white/80 text-sm font-medium italic">
											{artist.name}
										</p>
									</div>
								</div>
							</motion.div>
						)}

						<div className="flex-1">
							<motion.div
								className="flex flex-wrap items-center gap-4 mb-6"
								variants={itemVariants}
							>
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
							</motion.div>

							<motion.h1
								className="text-6xl md:text-8xl font-serif font-bold mb-6 tracking-tight text-foreground leading-none"
								variants={itemVariants}
							>
								{artist.name}
							</motion.h1>

							<motion.div
								className="flex flex-wrap gap-x-8 gap-y-2 text-lg text-muted-foreground mb-8 font-light"
								variants={itemVariants}
							>
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
							</motion.div>

							<motion.div
								className="prose prose-invert prose-lg max-w-none mb-10 text-muted-foreground/80 leading-relaxed"
								variants={itemVariants}
							>
								<p className="first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:text-primary first-letter:mr-3 first-letter:float-left">
									{artist.bio.replace(/ \(listen\)/g, "")}
								</p>
							</motion.div>

							<motion.div
								className="flex flex-wrap gap-4"
								variants={itemVariants}
							>
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
							</motion.div>
						</div>

						{/* Relations Sidebar */}
						{relationSections.length > 0 && (
							<motion.div
								className="w-full lg:w-80 shrink-0 space-y-6"
								variants={itemVariants}
							>
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
							</motion.div>
						)}
					</div>
				</motion.div>
			</div>

			{/* Artworks Section - Masonry Layout */}
			<motion.div
				className="max-w-7xl mx-auto px-6 py-24"
				initial="hidden"
				whileInView="visible"
				viewport={{ once: true, margin: "-100px" }}
				variants={containerVariants}
			>
				<motion.div
					className="flex items-end justify-between mb-12 border-b border-white/10 pb-6"
					variants={itemVariants}
				>
					<div>
						<h2 className="text-4xl font-serif font-bold text-foreground mb-2">
							Selected Works
						</h2>
						<p className="text-muted-foreground">
							A collection of {artist.artworks.length} masterpieces
						</p>
					</div>
				</motion.div>

				{artist.artworks.length > 0 ? (
					<motion.div
						className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8"
						variants={containerVariants}
					>
						{paginatedArtworks.map((work) => (
							<motion.div key={work.id || work.title} variants={itemVariants}>
								<ArtworkCard work={work} placeholder={placeholder} />
							</motion.div>
						))}
					</motion.div>
				) : (
					<div className="text-center py-20 bg-card/30 rounded-2xl border border-white/5 border-dashed">
						<p className="text-muted-foreground italic">
							No artwork images available for this artist.
						</p>
					</div>
				)}
				{artist.artworks.length > 0 && totalPages > 1 && (
					<motion.div
						className="mt-12 flex flex-col gap-4"
						variants={itemVariants}
					>
						<p className="text-sm text-muted-foreground text-center">
							Showing {displayStart}–{displayEnd} of {totalArtworks} artworks
						</p>
						<div className="flex items-center justify-center gap-4">
							{currentPage > 1 ? (
								<Link
									href={getPageHref(currentPage - 1)}
									className="px-4 py-2 rounded-full border border-white/10 text-sm font-medium hover:border-primary/50 hover:text-primary transition-colors"
								>
									Previous
								</Link>
							) : (
								<span className="px-4 py-2 rounded-full border border-white/5 text-sm text-muted-foreground/70 cursor-not-allowed">
									Previous
								</span>
							)}
							<span className="text-sm text-muted-foreground">
								Page {currentPage} of {totalPages}
							</span>
							{currentPage < totalPages ? (
								<Link
									href={getPageHref(currentPage + 1)}
									className="px-4 py-2 rounded-full border border-white/10 text-sm font-medium hover:border-primary/50 hover:text-primary transition-colors"
								>
									Next
								</Link>
							) : (
								<span className="px-4 py-2 rounded-full border border-white/5 text-sm text-muted-foreground/70 cursor-not-allowed">
									Next
								</span>
							)}
						</div>
					</motion.div>
				)}
			</motion.div>

			{/* Graph Section */}
			<motion.div
				className="bg-card border-t border-white/5 py-24"
				initial="hidden"
				whileInView="visible"
				viewport={{ once: true }}
				variants={containerVariants}
			>
				<div className="max-w-7xl mx-auto px-6">
					<motion.div
						className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12"
						variants={itemVariants}
					>
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
					</motion.div>

					<motion.div
						className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/50 h-[600px] relative"
						variants={itemVariants}
					>
						<GraphViz data={graphData} />
					</motion.div>
				</div>
			</motion.div>
		</div>
	);
}
