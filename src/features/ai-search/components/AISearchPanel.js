'use client';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Send, Loader2, Play, Info, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { MAX_QUERY_LENGTH } from '@/lib/aiSearch';

const EXAMPLE_QUERIES = [
  'Una película donde viajan en un tren en la nieve con conflicto social',
  'Serie de un profesor que fabrica metanfetamina',
  'Película de robots que destruyen el mundo',
  'Serie de dragones y tronos de hierro',
  'Película de Leonardo DiCaprio en un barco hundido',
  'Serie donde un niño tiene poderes y va a una escuela',
];

export default function AISearchPanel({ onResultNavigate, autoFocus = false, className }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setInfoMessage(null);

    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setResult(data.data);
      } else if (data.message) {
        setInfoMessage(data.message);
      } else {
        setError('No pude encontrar lo que buscas. ¿Podrías darme más detalles?');
      }
    } catch (err) {
      setError('Hubo un error al conectar con la IA. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <form onSubmit={handleSubmit} className="relative mb-4 md:mb-6">
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          type="text"
          maxLength={MAX_QUERY_LENGTH}
          placeholder="Ej: una película donde viajan en un tren en la nieve con conflicto social..."
          className="w-full bg-card-bg border-2 border-white/10 focus:border-primary/60 rounded-2xl py-4 md:py-5 px-5 md:px-7 text-base md:text-lg outline-none transition-all placeholder:text-gray-600 font-medium pr-14 md:pr-16 shadow-inner"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-gradient-to-r from-primary to-secondary rounded-xl text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
        </button>
      </form>

      {!result && !loading && !error && !infoMessage && (
        <div className="flex flex-wrap gap-2 mb-2">
          {EXAMPLE_QUERIES.slice(0, 3).map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setQuery(q); inputRef.current?.focus(); }}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 hover:border-primary/30 text-xs font-medium text-gray-400 hover:text-white transition-all text-left"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="text-center space-y-4 py-10">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" size={22} />
          </div>
          <p className="text-sm text-gray-400 italic">Buscando en el catálogo...</p>
        </div>
      )}

      {!loading && result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full flex flex-col sm:flex-row gap-5 md:gap-6 bg-card-bg p-4 md:p-6 rounded-2xl border border-white/10 mt-2"
        >
          <div className="w-full sm:w-32 md:w-40 aspect-[2/3] relative rounded-xl overflow-hidden shadow-2xl shrink-0 mx-auto sm:mx-0">
            <Image
              src={result.image}
              alt={result.title || 'Póster de producción'}
              fill
              sizes="160px"
              className="object-cover"
              unoptimized
            />
          </div>

          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-primary/15 text-secondary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/30">
                Match encontrado
              </span>
              <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                {result.type === 'movie' ? 'Película' : 'Serie'}
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-2 leading-tight text-white">{result.title}</h3>
            {result.explanation && (
              <div className="bg-white/5 border-l-2 border-primary pl-3 py-1.5 mb-3 italic">
                <p className="text-gray-300 text-xs md:text-sm leading-relaxed">{result.explanation}</p>
              </div>
            )}
            {result.overview && (
              <p className="text-gray-400 text-xs md:text-sm line-clamp-2 mb-4 leading-relaxed">{result.overview}</p>
            )}

            <div className="flex flex-wrap gap-3">
              <Link
                href={result.link}
                onClick={() => onResultNavigate?.()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-200 transition-all"
              >
                <Play size={14} fill="currentColor" /> Ver tráiler
              </Link>
              <Link
                href={result.link}
                onClick={() => onResultNavigate?.()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-white/20 transition-all border border-white/10"
              >
                <Info size={14} /> Detalles
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {!loading && infoMessage && (
        <div className="text-center space-y-3 max-w-lg mx-auto py-6">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary border border-primary/20">
            <Star size={26} className="fill-primary/20" />
          </div>
          <p className="text-base md:text-lg font-bold text-white leading-snug">{infoMessage}</p>
          <button
            onClick={() => { setInfoMessage(null); setQuery(''); inputRef.current?.focus(); }}
            className="text-primary font-bold uppercase tracking-widest text-xs hover:underline"
          >
            Intentar con otra búsqueda
          </button>
        </div>
      )}

      {!loading && error && (
        <div className="text-center space-y-2 max-w-md mx-auto py-6">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-500/20">
            <X size={26} />
          </div>
          <p className="text-base font-bold text-white">{error}</p>
          <p className="text-gray-500 text-xs leading-relaxed">
            Prueba con más detalles: actores, personajes, escenas memorables, género o año aproximado.
          </p>
        </div>
      )}
    </div>
  );
}
