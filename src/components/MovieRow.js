'use client';
import { useState, useRef, useEffect, memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import ItemPreview from './ItemPreview';
import MediaImage from './MediaImage';

const MovieCard = memo(({ item, isGrid = false }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timerRef = useRef(null);
  const leaveTimerRef = useRef(null);

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

  return (
    <>
      <div 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn("relative", !isGrid && "flex-shrink-0")}
      >
        <Link 
          href={detailLink}
          className="block"
        >
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className={cn(
              "relative cursor-pointer rounded-lg overflow-hidden group shadow-lg transition-transform",
              isGrid 
                ? "w-full aspect-[2/3]" 
                : "w-[160px] h-[240px] md:w-[240px] md:h-[360px]"
            )}
          >
            <MediaImage
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover transition-premium filter brightness-90 group-hover:brightness-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-premium flex flex-col justify-end p-4">
              <p className="text-sm font-bold truncate">{item.title}</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-300">
                <span>{item.year}</span>
                <span className="border border-gray-400 px-1 rounded uppercase font-bold text-primary">{item.rating}</span>
              </div>
            </div>
          </motion.div>
        </Link>
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

const MovieRowComponent = ({ title, items, listingType }) => {
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
        <h2 className="text-xl md:text-2xl font-semibold text-gray-200 hover:text-white transition-premium cursor-pointer">
          {title}
        </h2>
        <Link 
          href={listingUrl} 
          className="text-sm text-gray-400 hover:text-white transition-premium uppercase tracking-widest font-bold opacity-0 group-hover/row:opacity-100"
        >
          Ver todas
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
          className="flex items-center gap-4 md:gap-6 overflow-x-scroll scrollbar-hide p-2 -m-2 no-scrollbar"
        >
          {items.map((item, idx) => (
            <MovieCard key={`${item.id}-${idx}`} item={item} />
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
