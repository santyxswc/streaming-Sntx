'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { youtubeEmbedUrl } from '@/lib/youtube';
import { enterCinemaPresentation, exitCinemaPresentation } from '@/lib/cinemaOrientation';

const LANGUAGE_LABEL = { es: 'Español', en: 'Inglés' };

function trailerLabel(trailer, index) {
  const lang = LANGUAGE_LABEL[trailer.language];
  const base = trailer.name || `Tráiler ${index + 1}`;
  return lang ? `${base} · ${lang}` : base;
}

/**
 * Reproductor de tráilers de YouTube con selector de versión y modo cine.
 */
export default function TrailerTheater({ title, trailers, onClose }) {
  const [selected, setSelected] = useState(0);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const wasCinemaRef = useRef(false);

  useEffect(() => {
    if (wasCinemaRef.current && !isCinemaMode) exitCinemaPresentation();
    wasCinemaRef.current = isCinemaMode;
  }, [isCinemaMode]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (isCinemaMode) setIsCinemaMode(false);
      else onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCinemaMode, onClose]);

  const toggleCinema = async () => {
    if (isCinemaMode) {
      setIsCinemaMode(false);
      return;
    }
    setIsCinemaMode(true);
    await enterCinemaPresentation();
  };

  const current = trailers[selected] || trailers[0];

  return (
    <div className={cn('w-full', isCinemaMode ? 'fixed inset-0 z-[100] bg-black' : 'max-w-7xl mx-auto')}>
      <div
        className={cn(
          'flex items-center justify-between gap-4 mb-6',
          isCinemaMode && 'absolute top-4 inset-x-4 z-50 mb-0'
        )}
      >
        <h2 className="text-xl md:text-2xl font-bold tracking-tight truncate">
          Tráiler: <span className="text-primary">{title}</span>
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleCinema}
            title={isCinemaMode ? 'Salir de modo cine' : 'Modo cine'}
            className="flex items-center gap-2 px-3 md:px-5 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-premium"
          >
            {isCinemaMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span className="hidden sm:inline">{isCinemaMode ? 'Salir' : 'Modo cine'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Cerrar"
            className="flex items-center gap-2 px-3 md:px-5 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-premium"
          >
            <X size={16} />
            <span className="hidden sm:inline">Cerrar</span>
          </button>
        </div>
      </div>

      <div
        className={cn(
          'relative w-full overflow-hidden bg-black',
          isCinemaMode ? 'h-full' : 'aspect-video rounded-xl border border-white/5 shadow-2xl'
        )}
      >
        {current && (
          <iframe
            key={current.key}
            src={youtubeEmbedUrl(current.key, { autoplay: 1 })}
            title={`Tráiler de ${title}`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>

      {trailers.length > 1 && !isCinemaMode && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span className="w-full text-center text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">
            Otras versiones
          </span>
          {trailers.map((trailer, i) => (
            <button
              key={trailer.key}
              type="button"
              onClick={() => setSelected(i)}
              className={cn(
                'px-4 md:px-6 py-2.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all max-w-xs truncate',
                i === selected
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-primary/50'
              )}
            >
              {trailerLabel(trailer, i)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
