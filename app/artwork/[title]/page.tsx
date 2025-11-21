// app/artwork/[title]/page.tsx
import { getArtworkDetail } from '../../action';
import Link from 'next/link';

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
          <h1 className="text-2xl font-bold mb-2">Data tidak ditemukan 😔</h1>
          <p className="mb-4">Maaf, kami tidak menemukan karya dengan judul "{artworkTitle}".</p>
          <Link href="/" className="text-blue-600 hover:underline">Kembali ke Pencarian</Link>
        </div>
      </div>
    );
  }

  const placeholder = 'https://via.placeholder.com/800x600?text=No+Image';

  // Helper: coba ekstrak nama museum dari `meta_data` jika ada
  const parseMuseumFromMeta = (meta?: string | null) => {
    if (!meta) return null;
    const parts = meta.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return null;

    // Cari segmen yang mengandung kata kunci umum untuk museum/galeri
    const keywords = /(museum|gallery|national|gallery|metropolitan|kunsthistorisches|private collection|museum of|museum,)/i;
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
    const parts = meta.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    const candidate = parts[0];
    if (/\d{3,4}|c\.|before|after|\bcentury\b/i.test(candidate)) return candidate;
    return null;
  };

  // Helper: buat ringkasan info dari meta_data (medium, ukuran, dll) — kecuali year & museum
  const parseInfoFromMeta = (meta?: string | null) => {
    if (!meta) return null;
    const parts = meta.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    const year = parseYearFromMeta(meta);
    const museum = parseMuseumFromMeta(meta);
    const infoParts = parts.filter((p) => p !== year && p !== museum);
    return infoParts.join(', ') || null;
  };

  const yearFromMeta = parseYearFromMeta(art.meta_data || undefined);
  const infoFromMeta = parseInfoFromMeta(art.meta_data || undefined);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="bg-slate-900 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-slate-400 hover:text-white mb-6 inline-block text-sm font-medium">
            ← KEMBALI KE PENCARIAN
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 tracking-tight">{art.title}</h1>
              <p className="text-lg text-slate-400 mb-4">{yearFromMeta ? `${yearFromMeta}` : ''} {art.artist ? `• oleh ${art.artist.name}` : ''} {museumName ? `• di ${museumName}` : ''}</p>

              <div className="prose prose-invert max-w-none">
                <p className="text-slate-300 leading-relaxed text-lg">{infoFromMeta || 'Tidak ada deskripsi tersedia.'}</p>
              </div>

              {art.artist && (
                <Link href={`/artist/${encodeURIComponent(art.artist.name)}`} className="mt-4 inline-block text-blue-400 hover:text-blue-300 text-sm">
                  Lihat profil {art.artist.name} ↗
                </Link>
              )}
            </div>

            <div className="w-full md:w-1/3">
              <div className="aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden mb-3 relative shadow-sm border border-slate-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <a href={art.url || placeholder} target="_blank" rel="noopener noreferrer" title="Buka gambar dalam tab baru" className="block w-full h-full">
                  <img
                    src={art.url || placeholder}
                    alt={art.title}
                    className="object-cover w-full h-full transform transition-transform duration-200 ease-out group-hover:scale-105 cursor-pointer"
                    loading="lazy"
                  />
                </a>

                {/* Overlay eye icon: appears on hover or when focused (accessible) */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 scale-95 transition-opacity transition-transform duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-12 h-12 text-white">
                    <title>Lihat gambar</title>
                    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
