'use client';
import { useState, useRef, useEffect, memo } from 'react';
import { ChevronLeft, ChevronRight, Play, Plus, Check, Star } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import ItemPreview from '@/features/catalog/components/ItemPreview';
import MediaImage from '@/components/ui/MediaImage';
import { useFavoritesStore } from '@/features/favorites/store/useFavoritesStore';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

const MovieCard = memo(({ item, isGrid = false, rank }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timerRef = useRef(null);
  const leaveTimerRef = useRef(null);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const favorite = useFavoritesStore((s) => Boolean(s.favoriteIds?.[item.id]));
  const user = useAuthStore((s) => s.user);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const handleMouseEnter = (e) => {
    // Clear any pending leave timer
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    
    // If already showing, don't restart transition timer
    if (showPreview) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(10, Math.min(window.innerWidth - 360, rect.left - 50));
    const y = Math.max(10, rect.top - 120);
    
    // Clear any pending enter timer
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setCoords({ x, y });
      setShowPreview(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    // Clear pending enter timer
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Small delay to allow moving to preview
    leaveTimerRef.current = setTimeout(() => {
      setShowPreview(false);
    }, 300); 
  };

  const handlePreviewEnter = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    setShowPreview(true);
  };

  const handlePreviewLeave = () => {
    setShowPreview(false);
  };

  const detailLink = `/${item.type === 'movie' ? 'peliculas' : item.type === 'series' ? 'series' : 'anime'}/${item.id}`;
  const primaryGenre = Array.isArray(item.genres) ? item.genres[0] : null;
  const ratingValue = parseFloat(item.rating);
  const hasRating = Number.isFinite(ratingValue) && ratingValue > 0;

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "group relative flex flex-col rounded-xl overflow-hidden bg-card-bg ring-1 ring-white/5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:ring-primary/40 hover:shadow-[0_16px_36px_-8px_rgba(139,92,246,0.35)]",
          isGrid ? "w-full" : "flex-shrink-0 w-[150px] sm:w-[180px] md:w-[240px]"
        )}
      >
        <Link href={detailLink} className="relative block aspect-[2/3] w-full overflow-hidden">
          <MediaImage
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {rank && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-accent text-white text-[10px] font-black uppercase tracking-wide shadow-lg">
              Top {rank}
            </span>
          )}
          {hasRating && (
            <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-secondary text-[10px] font-bold font-mono">
              <Star size={10} fill="currentColor" />
              {ratingValue.toFixed(1)}
            </span>
          )}
        </Link>

        <div className="flex flex-col gap-1.5 p-2.5 bg-card-bg">
          <Link href={detailLink}>
            <p className="text-xs md:text-sm font-bold text-white truncate hover:text-primary transition-colors">
              {item.title}
            </p>
          </Link>
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wide text-gray-500">
            <span className="shrink-0">{item.year || '—'}</span>
            {primaryGenre && <span className="text-secondary truncate">{primaryGenre}</span>}
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <Link
              href={detailLink}
              className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
              title="Ver tráiler"
            >
              <Play size={12} fill="currentColor" className="ml-0.5" />
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(item, user?.uid);
              }}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
              title={favorite ? 'En mi lista' : 'Añadir a mi lista'}
            >
              {favorite ? <Check size={12} /> : <Plus size={12} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPreview && (
          <ItemPreview
            item={item}
            isVisible={showPreview}
            x={coords.x}
            y={coords.y}
            onMouseEnter={handlePreviewEnter}
            onMouseLeave={handlePreviewLeave}
          />
        )}
      </AnimatePresence>
    </>
  );
});
MovieCard.displayName = 'MovieCard';

const MovieRowComponent = ({ title, items, listingType, icon: Icon, iconColor = 'text-secondary', showRank = false }) => {
  const rowRef = useRef(null);
  const [isMoved, setIsMoved] = useState(false);

  const handleClick = (direction) => {
    setIsMoved(true);
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const listingUrl = listingType 
    ? `/listing/${listingType}` 
    : `/listing/${title.toLowerCase().replace(/ /g, '-')}`;

  return (
    <div className="px-4 md:px-12 space-y-2 group/row relative py-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="flex items-center gap-2 text-xl md:text-2xl font-semibold text-gray-200 hover:text-white transition-premium cursor-pointer">
          {Icon && <Icon size={20} className={cn(iconColor, "shrink-0")} />}
          {title}
        </h2>
        <Link
          href={listingUrl}
          className="flex items-center gap-1 text-sm text-secondary hover:text-white transition-premium uppercase tracking-widest font-bold opacity-0 group-hover/row:opacity-100"
        >
          Ver todas
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="relative">
        <ChevronLeft
          className={cn(
            "absolute top-0 bottom-0 left-0 z-40 m-auto h-12 w-12 cursor-pointer opacity-0 group-hover/row:opacity-100 transition-premium hover:scale-125 bg-black/50 rounded-full p-2 ml-2",
            !isMoved && "hidden"
          )}
          onClick={() => handleClick('left')}
        />

        <div 
          ref={rowRef}
          className="flex items-start gap-4 md:gap-6 overflow-x-scroll scrollbar-hide p-2 -m-2 no-scrollbar"
        >
          {items.map((item, idx) => (
            <MovieCard
              key={`${item.id}-${idx}`}
              item={item}
              rank={showRank && idx < 5 ? idx + 1 : undefined}
            />
          ))}
        </div>

        <ChevronRight
          className="absolute top-0 bottom-0 right-0 z-40 m-auto h-12 w-12 cursor-pointer opacity-0 group-hover/row:opacity-100 transition-premium hover:scale-125 bg-black/50 rounded-full p-2 mr-2"
          onClick={() => handleClick('right')}
        />
      </div>
    </div>
  );
};

const MovieRow = memo(MovieRowComponent);
MovieRow.displayName = 'MovieRow';
MovieRow.Card = MovieCard;
export default MovieRow;
