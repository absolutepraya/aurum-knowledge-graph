// app/artwork/[title]/page.tsx
import ArtworkImageViewer from "@/components/ArtworkImageViewer";
import { getArtworkDetail } from "../../action";
import Link from "next/link";

interface PageProps {
	params: Promise<{ title: string }>;
}

export default async function ArtworkPage({ params }: PageProps) {
	const resolved = await params;
	const artworkTitle = decodeURIComponent(resolved.title);

	const art = await getArtworkDetail(artworkTitle);

	if (!art) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-2">Data not found 😔</h1>
					<p className="mb-4">
						Sorry, we could not find an artwork with the title &quot;
						{artworkTitle}&quot;.
					</p>
					<Link href="/" className="text-blue-600 hover:underline">
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

	return (
		<div className="min-h-screen bg-white text-slate-900">
			<div className="bg-slate-900 text-white py-16 px-6">
				<div className="max-w-4xl mx-auto">
					<Link
						href="/"
						className="text-slate-400 hover:text-white mb-6 inline-block text-sm font-medium"
					>
						← BACK TO SEARCH
					</Link>

					<div className="flex flex-col gap-8 items-start">
						<div className="w-full">
							<h1 className="text-4xl font-bold mb-2 tracking-tight">
								{art.title}
							</h1>
							<p className="text-lg text-slate-400 mb-4">
								{yearFromMeta ? `${yearFromMeta}` : ""}{" "}
								{art.artist ? `• by ${art.artist.name}` : ""}{" "}
								{museumName ? `• at ${museumName}` : ""}
							</p>

							<div className="prose prose-invert max-w-none">
								<p className="text-slate-300 leading-relaxed text-lg">
									{infoFromMeta || "No description available."}
								</p>
							</div>

							{art.artist && (
								<Link
									href={`/artist/${encodeURIComponent(art.artist.name)}`}
									className="mt-4 inline-block text-blue-400 hover:text-blue-300 text-sm"
								>
									View {art.artist.name}&apos;s profile ↗
								</Link>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-6xl mx-auto px-6 py-12">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
					<h2 className="text-2xl font-bold text-slate-800">Artwork Preview</h2>
					<p className="text-sm text-slate-500">Click image to enlarge.</p>
				</div>
				<ArtworkImageViewer
					src={art.url}
					alt={art.title}
					placeholder={placeholder}
				/>
			</div>
		</div>
	);
}
