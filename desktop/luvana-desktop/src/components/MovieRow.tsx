import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import ItemPreview from "./ItemPreview";
import type { MediaItem } from "@/store/useFavoritesStore";

interface MovieCardProps {
  item: MediaItem;
  isGrid?: boolean;
}

function MovieCard({ item, isGrid = false }: MovieCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    if (showPreview) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(10, Math.min(window.innerWidth - 360, rect.left - 50));
    const y = Math.max(10, rect.top - 120);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCoords({ x, y });
      setShowPreview(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    leaveTimerRef.current = setTimeout(() => setShowPreview(false), 300);
  };

  const detailPath = `/${item.type === "movie" ? "peliculas" : item.type === "series" ? "series" : "peliculas"}/${item.id}`;

  return (
    <>
      <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className={cn("relative", !isGrid && "flex-shrink-0")}>
        <Link to={detailPath} className="block">
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className={cn(
              "relative cursor-pointer rounded-lg overflow-hidden group shadow-lg transition-transform",
              isGrid ? "w-full aspect-[2/3]" : "w-[160px] h-[240px] md:w-[240px] md:h-[360px]"
            )}
          >
            <img
              src={item.image}
              alt={item.title || ""}
              className="w-full h-full object-cover transition-premium filter brightness-90 group-hover:brightness-100"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-premium flex flex-col justify-end p-4">
              <p className="text-sm font-bold truncate">{item.title}</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-300">
                <span>{item.year}</span>
                <span className="border border-gray-400 px-1 rounded uppercase font-bold text-[var(--primary)]">{item.rating}</span>
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
            onMouseEnter={() => {
              if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
              setShowPreview(true);
            }}
            onMouseLeave={() => setShowPreview(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

interface MovieRowProps {
  title: string;
  items: MediaItem[];
  listingType?: string;
}

export default function MovieRow({ title, items, listingType }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isMoved, setIsMoved] = useState(false);

  const handleClick = (direction: "left" | "right") => {
    setIsMoved(true);
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      rowRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  const listingUrl = listingType ? `/listing/${listingType}` : `/listing/${title.toLowerCase().replace(/ /g, "-")}`;

  return (
    <div className="px-4 md:px-12 space-y-2 group/row relative py-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-200 hover:text-white transition-premium cursor-pointer">
          {title}
        </h2>
        <Link to={listingUrl} className="text-sm text-gray-400 hover:text-white transition-premium uppercase tracking-widest font-bold opacity-0 group-hover/row:opacity-100">
          Ver todas
        </Link>
      </div>
      <div className="relative">
        <ChevronLeft
          className={cn(
            "absolute top-0 bottom-0 left-0 z-40 m-auto h-12 w-12 cursor-pointer opacity-0 group-hover/row:opacity-100 transition-premium hover:scale-125 bg-black/50 rounded-full p-2 ml-2",
            !isMoved && "hidden"
          )}
          onClick={() => handleClick("left")}
        />
        <div ref={rowRef} className="flex items-center gap-4 md:gap-6 overflow-x-scroll no-scrollbar p-2 -m-2">
          {items.map((item, idx) => (
            <MovieCard key={`${item.id}-${idx}`} item={item} />
          ))}
        </div>
        <ChevronRight
          className="absolute top-0 bottom-0 right-0 z-40 m-auto h-12 w-12 cursor-pointer opacity-0 group-hover/row:opacity-100 transition-premium hover:scale-125 bg-black/50 rounded-full p-2 mr-2"
          onClick={() => handleClick("right")}
        />
      </div>
    </div>
  );
}

MovieRow.Card = MovieCard;
