import ArtworkImageViewer from "@/components/ArtworkImageViewer";
import { getArtworkDetail } from "../../action";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import * as motion from "framer-motion/client";
import { containerVariants, itemVariants } from "@/lib/animations";

interface PageProps {
	params: Promise<{ title: string }>;
}

export default async function ArtworkPage({ params }: PageProps) {
	const resolved = await params;
	const artworkTitle = decodeURIComponent(resolved.title);

	const art = await getArtworkDetail(artworkTitle);

	if (!art) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background text-foreground">
				<div className="text-center p-8 bg-card border border-border rounded-xl shadow-2xl">
					<h1 className="text-3xl font-serif font-bold mb-4 text-primary">
						Artwork Not Found
					</h1>
					<p className="mb-6 text-muted-foreground">
						Sorry, we could not find an artwork with the title &quot;
						{artworkTitle}&quot;.
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

	const placeholder = "https://via.placeholder.com/800x600?text=No+Image";

	// Helper: coba ekstrak nama museum dari `meta_data` jika ada
	const parseMuseumFromMeta = (meta?: string | null) => {
		if (!meta) return null;
		const parts = meta
			.split(",")
			.map((p) => p.trim())
			.filter(Boolean);
		if (parts.length === 0) return null;

		// Cari segmen yang mengandung kata kunci umum untuk museum/galeri
		const keywords =
			/(museum|gallery|national|gallery|metropolitan|kunsthistorisches|private collection|museum of|museum,)/i;
		for (let i = parts.length - 1; i >= 0; i--) {
			const seg = parts[i];
			if (keywords.test(seg)) return seg;
		}

		// Jika tidak ditemukan, kembalikan segmen terakhir sebagai fallback (lokasi)
		return parts[parts.length - 1] || null;
	};

	const museumName = parseMuseumFromMeta(art.meta_data || art.meta_data);
	// Helper: ekstrak year (segmen pertama jika mengandung angka atau kata seperti 'c.'/'before')
	const parseYearFromMeta = (meta?: string | null) => {
		if (!meta) return null;
		const parts = meta
			.split(",")
			.map((p) => p.trim())
			.filter(Boolean);
		if (parts.length === 0) return null;
		const candidate = parts[0];
		if (/\d{3,4}|c\.|before|after|\bcentury\b/i.test(candidate))
			return candidate;
		return null;
	};

	// Helper: buat ringkasan info dari meta_data (medium, ukuran, dll) — kecuali year & museum
	const parseInfoFromMeta = (meta?: string | null) => {
		if (!meta) return null;
		const parts = meta
			.split(",")
			.map((p) => p.trim())
			.filter(Boolean);
		if (parts.length === 0) return null;
		const year = parseYearFromMeta(meta);
		const museum = parseMuseumFromMeta(meta);
		const infoParts = parts.filter((p) => p !== year && p !== museum);
		return infoParts.join(", ") || null;
	};

	const yearFromMeta = parseYearFromMeta(art.meta_data || undefined);
	const infoFromMeta = parseInfoFromMeta(art.meta_data || undefined);

	const toTitleCase = (str: string) => {
		return str.replace(
			/\w\S*/g,
			(txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
		);
	};

	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 flex flex-col">
			{/* Blurred Background */}
			<div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
				<div
					className="absolute inset-0 bg-cover bg-center opacity-10 blur-3xl scale-110"
					style={{
						backgroundImage: `url('${art.url || placeholder}')`,
					}}
				/>
				<div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
			</div>

			<motion.div
				className="relative z-10 max-w-7xl mx-auto w-full px-6 py-12 lg:py-20 flex-1 flex flex-col"
				initial="hidden"
				animate="visible"
				variants={containerVariants}
			>
				<motion.div variants={itemVariants}>
					<Link
						href="/"
						className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-12 group w-fit"
					>
						<ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
						BACK TO SEARCH
					</Link>
				</motion.div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
					{/* Left Column: Artwork Image */}
					<motion.div
						className="w-full lg:sticky lg:top-24"
						variants={itemVariants}
					>
						<div className="relative group rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-card/5 backdrop-blur-sm">
							<ArtworkImageViewer
								src={art.url}
								alt={art.title}
								placeholder={placeholder}
							/>
						</div>
						<p className="text-center text-xs text-muted-foreground mt-4 opacity-60">
							Click image to zoom
						</p>
					</motion.div>

					{/* Right Column: Details */}
					<div className="flex flex-col space-y-8">
						<motion.div variants={itemVariants}>
							<div className="flex items-center gap-3 mb-4">
								<span className="px-3 py-1 rounded-full border border-primary/30 text-primary text-xs uppercase tracking-widest font-bold bg-primary/5">
									Artwork
								</span>
								{yearFromMeta && (
									<span className="px-3 py-1 rounded-full border border-white/10 text-muted-foreground text-xs uppercase tracking-widest bg-white/5">
										{yearFromMeta}
									</span>
								)}
							</div>

							<h1 className="text-5xl md:text-6xl font-serif font-bold mb-6 tracking-tight text-foreground leading-tight">
								{toTitleCase(art.title)}
							</h1>

							{art.artist && (
								<Link
									href={`/artist/${encodeURIComponent(art.artist.name)}`}
									className="inline-flex items-center gap-2 text-xl text-muted-foreground hover:text-primary transition-colors border-b border-transparent hover:border-primary/50 pb-0.5"
								>
									By <span className="text-foreground">{art.artist.name}</span>
									<ExternalLink className="w-4 h-4" />
								</Link>
							)}
						</motion.div>

						<motion.div
							className="h-px w-full bg-white/10"
							variants={itemVariants}
						/>

						<motion.div
							className="grid grid-cols-1 md:grid-cols-2 gap-6"
							variants={itemVariants}
						>
							{museumName && (
								<div>
									<h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">
										Location
									</h3>
									<p className="text-foreground font-medium">
										{toTitleCase(museumName)}
									</p>
								</div>
							)}
							{infoFromMeta && (
								<div className="col-span-1 md:col-span-2">
									<h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">
										Details
									</h3>
									<p className="text-foreground/80 leading-relaxed">
										{toTitleCase(infoFromMeta)}
									</p>
								</div>
							)}
						</motion.div>

						<motion.div
							className="h-px w-full bg-white/10"
							variants={itemVariants}
						/>

						{/* Additional Actions or Info could go here */}
						<motion.div
							className="bg-card/30 border border-white/5 rounded-xl p-6 backdrop-blur-md"
							variants={itemVariants}
						>
							<h3 className="font-serif font-bold text-lg mb-2 text-primary">
								About this Piece
							</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">
								This artwork is part of our extensive collection. Explore more
								works by {art.artist?.name || "this artist"} to understand the
								context and movement it belongs to.
							</p>
						</motion.div>
					</div>
				</div>
			</motion.div>
		</div>
	);
}
