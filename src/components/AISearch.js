'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, X, Send, Loader2, Play, Info, ArrowRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

export default function AISearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] bg-[#141414] rounded-[2rem] md:rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 md:p-8 flex items-center justify-between border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                  <Sparkles size={24} className="text-white fill-white/20" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Asistente streaming-Sntx</h2>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Encuentra películas y series cuando no recuerdas el nombre</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10">
              {/* Descripción clara */}
              <div className="mb-4 md:mb-6 p-4 md:p-5 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-sm md:text-base text-gray-300 leading-relaxed font-medium">
                  ¿No recuerdas el nombre de una película o serie? <span className="text-white font-bold">Cuéntame lo que sí recuerdas</span>: un actor, un personaje, una escena, el género, el año aproximado o cualquier detalle. Te ayudaré a encontrarla.
                </p>
              </div>

              {/* Input Area */}
              <form onSubmit={handleSubmit} className="relative mb-6 md:mb-12">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ej: película con Leonardo DiCaprio en un barco, serie de un profesor que fabrica metanfetamina..."
                  className="w-full bg-white/5 border-2 border-white/10 focus:border-primary/50 rounded-2xl py-4 md:py-6 px-6 md:px-8 text-lg md:text-xl outline-none transition-all placeholder:text-gray-600 font-medium pr-14 md:pr-16 shadow-inner"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-primary rounded-xl text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                </button>
              </form>

              {/* Results Display */}
              <div className="min-h-[300px] flex flex-col items-center justify-center">
                {loading ? (
                  <div className="text-center space-y-6">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" size={32} />
                    </div>
                    <div className="space-y-2">
                       <p className="text-xl font-bold tracking-tight">Analizando tu memoria...</p>
                       <p className="text-sm text-gray-500 italic max-w-xs mx-auto">Consultando todos los rincones del catálogo para encontrar esa producción especial.</p>
                    </div>
                  </div>
                ) : result ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full flex flex-col md:flex-row gap-8 bg-white/5 p-6 rounded-[2rem] border border-white/10"
                  >
                    <div className="w-full md:w-1/3 aspect-[2/3] relative rounded-2xl overflow-hidden shadow-2xl group">
                      <Image
                        src={result.image}
                        alt={result.title || "Póster de producción"}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-1000 group-hover:scale-110"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center py-4">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/30">Match Encontrado</span>
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">• {result.type === 'movie' ? 'Película' : 'Serie'}</span>
                      </div>
                      <h3 className="text-2xl md:text-5xl font-black uppercase tracking-tighter mb-4 italic leading-tight">{result.title}</h3>
                      <div className="bg-white/5 border-l-4 border-primary p-3 md:p-4 rounded-r-xl mb-4 md:mb-6 italic">
                        <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                          {'\u201C'}
                          {result.explanation}
                          {'\u201D'}
                        </p>
                      </div>
                      <p className="text-gray-400 text-xs md:text-sm line-clamp-2 md:line-clamp-3 mb-6 md:mb-8 leading-relaxed font-medium">{result.overview}</p>
                      
                      <div className="flex flex-wrap gap-3 md:gap-4 mt-auto">
                        <Link 
                          href={result.link} 
                          onClick={onClose}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[10px] md:text-sm hover:bg-gray-200 transition-all shadow-xl shadow-white/5"
                        >
                          <Play size={18} fill="currentColor" /> Ver Ahora
                        </Link>
                        <Link 
                          href={result.link} 
                          onClick={onClose}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[10px] md:text-sm hover:bg-white/20 transition-all border border-white/10"
                        >
                          <Info size={18} /> Detalles
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ) : infoMessage ? (
                  <div className="text-center space-y-6 max-w-lg px-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary border border-primary/20">
                       <Star size={40} className="fill-primary/20" />
                    </div>
                    <div className="space-y-4">
                      <p className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-white leading-tight">{infoMessage}</p>
                      <button 
                        onClick={() => { setInfoMessage(null); setQuery(''); inputRef.current?.focus(); }}
                        className="text-primary font-bold uppercase tracking-widest text-xs hover:underline"
                      >
                        Intentar con otra búsqueda
                      </button>
                    </div>
                  </div>
                ) : error ? (
                  <div className="text-center space-y-6 max-w-md">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-500/20">
                       <X size={40} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-black uppercase italic tracking-tight text-white">{error}</p>
                      <p className="text-gray-500 text-sm leading-relaxed font-medium">Prueba con más detalles: actores, personajes, escenas memorables, género o año aproximado. Cuanto más me cuentes, mejor podré ayudarte a encontrarla.</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-8">
                     <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Ejemplos de lo que puedes preguntar</p>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl mx-auto">
                        {[
                          'Película con Tom Hanks en una isla desierta',
                          'Serie del profesor que cocina droga',
                          'Película de robots que destruyen el mundo',
                          'Serie de dragones y tronos de hierro',
                          'Película de Leonardo DiCaprio en un barco hundido',
                          'Serie donde un niño tiene poderes y va a una escuela'
                        ].map((q, i) => (
                           <button
                             key={i}
                             type="button"
                             onClick={() => { setQuery(q); inputRef.current?.focus(); }}
                             className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 hover:border-primary/30 text-left text-xs md:text-sm font-medium text-gray-400 hover:text-white transition-all leading-snug"
                           >
                              {q}
                           </button>
                        ))}
                     </div>
                     <div className="flex flex-col items-center gap-2">
                        <Sparkles size={48} className="text-gray-800 animate-pulse" />
                        <p className="text-gray-600 font-bold uppercase tracking-[0.2em] text-[10px]">Escribe o elige un ejemplo para buscar</p>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
