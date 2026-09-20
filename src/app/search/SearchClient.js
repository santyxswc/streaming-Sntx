'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MovieRow from '@/components/MovieRow';
import NetflixLoader from '@/components/NetflixLoader';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

function SourceBadge({ source }) {
  if (source === 'tmdb') {
    return <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-black uppercase tracking-wider border border-blue-500/30">TMDB</span>;
  }
  if (source === 'omdb') {
    return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px] font-black uppercase tracking-wider border border-yellow-500/30">IMDb</span>;
  }
  return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px] font-black uppercase tracking-wider border border-green-500/30">Catálogo</span>;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [results, setResults] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const fetchResults = async () => {
      if (!query) {
        setResults([]);
        setSources([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/media/multi-search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.success) {
          setResults(data.data);
          setSources(data.sources || []);
        }
      } catch (error) {
        if (error.name !== 'AbortError') console.error('Search error:', error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchResults();
    return () => controller.abort();
  }, [query]);

  return (
    <div className="pt-32 px-4 md:px-12 pb-20">
      <header className="mb-12">
        <div className="flex items-center gap-4 mb-2">
          <Search className="text-primary w-8 h-8 md:w-10 md:h-10" />
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">Resultados</h1>
        </div>
        <p className="text-gray-400 text-lg">
          {loading ? 'Buscando en múltiples fuentes...' : `Se han encontrado ${results.length} resultados para "${query}"`}
        </p>
        {!loading && sources.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Fuentes:</span>
            {sources.map((s) => (
              <SourceBadge key={s} source={s} />
            ))}
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-40">
           <NetflixLoader />
        </div>
      ) : results.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8"
        >
          {results.map((item) => (
            <div key={item.id} className="w-full relative">
              <MovieRow.Card item={item} isGrid />
              <div className="absolute top-2 right-2 z-10">
                <SourceBadge source={item.source} />
              </div>
            </div>
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 text-gray-500">
          <Search size={64} className="mb-4 opacity-20" />
          <p className="text-xl">No hay coincidencias para tu búsqueda.</p>
          <p className="text-sm mt-2">Intenta con otras palabras clave o explora las categorías en el menú.</p>
        </div>
      )}
    </div>
  );
}

export default function SearchClient() {
  return (
    <main className="min-h-screen bg-background text-white">
      <Navbar />
      <Suspense fallback={<NetflixLoader />}>
        <SearchResults />
      </Suspense>
    </main>
  );
}
