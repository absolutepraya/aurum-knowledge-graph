// app/page.tsx
"use client"

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { searchGlobal, GlobalSearchResult } from './action'; // Import fungsi baru (fixed path)
import Link from 'next/link';
 
export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Track the exact term that was last searched (prevents live-updating "not found" text while typing)
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
 
  const searchParams = useSearchParams();
  const qParam = searchParams.get('q') || '';
  const [lastQueried, setLastQueried] = useState(''); // track last param we searched for
  const router = useRouter();
  const [isAnimatingConsole, setIsAnimatingConsole] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
 
  const performSearch = async (q: string) => {
    if (!q || !q.trim()) {
      setResults([]);
      setHasSearched(true);
      setLastSearchedQuery(q || '');
      return;
    }
    setIsLoading(true);
    const data = await searchGlobal(q);
    setResults(data);
    setHasSearched(true);
    setLastSearchedQuery(q);
    setIsLoading(false);
  };
 
  // run search when ?q= changes, but only if it's a new q value
  useEffect(() => {
    if (!qParam) return;
    if (qParam === lastQueried) return;
    setQuery(qParam);
    performSearch(qParam);
    setLastQueried(qParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam]);
 
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSearch(query);
  };

  const handleConsoleClick = async () => {
    setIsAnimatingConsole(true);

    const el = mainRef.current;
    if (el) {
      const onEnd = (e: any) => {
        if (e.propertyName && e.propertyName.indexOf('opacity') === -1 && e.propertyName.indexOf('transform') === -1) return;
        el.removeEventListener('transitionend', onEnd);
        router.push('/console');
      };
      el.addEventListener('transitionend', onEnd);
      // safety fallback
      setTimeout(() => {
        try { el.removeEventListener('transitionend', onEnd); } catch {}
        router.push('/console');
      }, 1300);
    } else {
      setTimeout(() => router.push('/console'), 1300);
    }
  };
 
  return (
    <main ref={mainRef} className={`relative min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 font-sans py-8 px-4 sm:py-12 sm:px-6 lg:px-8 transition-all duration-[1200ms] ease-in-out ${isAnimatingConsole ? 'opacity-0 scale-90 -translate-y-8 blur-sm pointer-events-none' : 'opacity-100 scale-100 translate-y-0 blur-0'}`}>
      {/* subtle dark overlay to reinforce fade */}
      <div className={`pointer-events-none fixed inset-0 bg-black transition-opacity duration-[1200ms] ease-in-out ${isAnimatingConsole ? 'opacity-60' : 'opacity-0'}`} />

      <div className="w-full max-w-3xl relative">
        <h1 className="text-4xl font-extrabold text-center mb-2 text-slate-800 opacity-9">PROPERTY OF KGTAU</h1>
        <h1 className="text-4xl font-extrabold text-center mb-2 text-slate-800">🏛️ Galeri Sejarah Seni</h1>
        <p className="text-center text-slate-500 mb-8">Cari Seniman atau Karya Seni (Contoh: "Mona Lisa" atau "Picasso")</p>
        
        <div className="flex justify-end mb-4">
          <button
            onClick={handleConsoleClick}
            className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl font-bold text-sm text-white shadow-lg bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-[1200ms] ease-out transform ${isAnimatingConsole ? 'opacity-0 scale-75 -translate-y-2' : 'hover:scale-105 hover:-translate-y-1'}`}
            aria-label="Open Cypher Console"
          >
            🖥 Console
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3 mb-10">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik kata kunci bukan kata-kata yang kau miliki..."
            className="flex-1 p-4 rounded-xl border border-slate-300 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button 
            type="submit"
            disabled={isLoading} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-colors"
          >
            {isLoading ? '...' : '🔍︎'}
          </button>
        </form>

        <div className="grid gap-4">
          {results.map((item, idx) => (
            <Link 
              key={idx}
              href={item.type === 'artist' ? `/artist/${encodeURIComponent(item.linkParam)}` : `/artwork/${encodeURIComponent(item.linkParam)}`}
              className="block bg-white p-5 rounded-lg border border-slate-200 hover:shadow-md transition-all hover:border-blue-300 group"
            >
              <div className="flex items-center gap-4">
                {/* Ikon Pembeda Tipe */}
                <div className={`w-12 h-12 flex items-center justify-center rounded-full text-xl 
                  ${item.type === 'artist' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                  {item.type === 'artist' ? '👤' : '🎨'}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-800 group-hover:text-blue-600">
                      {item.title}
                    </h2>
                    {/* Badge Tipe */}
                    <span className={`text-xs px-2 py-0.5 rounded border ${item.type === 'artist' ? 'border-blue-200 text-blue-600' : 'border-orange-200 text-orange-600'}`}>
                      {item.type === 'artist' ? 'Artist' : 'Artwork'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mt-1">{item.subtitle}</p>
                </div>
              </div>
            </Link>
          ))}
          
          {hasSearched && results.length === 0 && !isLoading && (
            <div className="text-center text-slate-400 py-10 bg-white rounded-lg border border-dashed border-slate-300">
              Tidak ditemukan hasil untuk "{lastSearchedQuery || query}".
            </div>
          )}
        </div>
      </div>
    </main>
  );
}