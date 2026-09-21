import { useState, useEffect, memo } from "react";
import { Play, Info, Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { MediaItem } from "@/store/useFavoritesStore";

interface BannerProps {
  movie: MediaItem | null;
}

function Banner({ movie }: BannerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (movie?.trailer) {
      const timer = setTimeout(() => setIsPlaying(true), 3000);
      return () => clearTimeout(timer);
    }
    setIsPlaying(false);
  }, [movie?.id, movie?.trailer]);

  if (!movie) return <div className="h-[80vh] bg-[var(--background)]" />;

  const trailer = movie.trailer as string | undefined;
  const trailerId = trailer?.includes("v=")
    ? trailer.split("v=")[1]?.split("&")[0]
    : trailer?.split("/").pop();

  const detailPath = `/${movie.type === "movie" ? "peliculas" : movie.type === "series" ? "series" : "peliculas"}/${movie.id}`;

  return (
    <div className="relative w-full h-[75vh] md:h-[85vh] lg:h-[90vh] bg-black overflow-hidden group">
      <div className="absolute inset-0 w-full h-full">
        <AnimatePresence mode="wait">
          {isPlaying && trailerId ? (
            <motion.div
              key="video-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <iframe
                  src={`https://www.youtube.com/embed/${trailerId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${trailerId}&auto_play=1&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1`}
                  className="absolute w-[177.77vh] h-full min-w-full min-h-[56.25vw] pointer-events-none brightness-[0.7] transform scale-110"
                  allow="autoplay; encrypted-media"
                  title="Trailer"
                />
              </div>
            </motion.div>
          ) : (
            <motion.img
              key="backdrop-img"
              src={(movie.backdrop || movie.image) as string}
              alt={movie.title || ""}
              className="w-full h-full object-cover brightness-[0.6]"
              referrerPolicy="no-referrer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)] via-black/30 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-transparent z-10" />
        <div className="absolute bottom-0 w-full h-[40%] bg-gradient-to-t from-[var(--background)] via-[var(--background)]/40 to-transparent z-20" />
      </div>

      <div className="absolute inset-0 flex flex-col justify-end pb-[10vh] md:pb-[15vh] px-4 md:px-12 z-30 pointer-events-none">
        <div className="max-w-[95%] md:max-w-[80%] lg:max-w-[70%] space-y-4 md:space-y-6 pointer-events-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter drop-shadow-2xl leading-[0.95] uppercase italic text-white line-clamp-2"
          >
            {movie.title}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-widest text-[var(--primary)]"
          >
            <span className="bg-[var(--primary)]/20 border border-[var(--primary)]/30 px-2 py-0.5 rounded">Top 10 Global</span>
            <span className="text-white bg-white/10 px-2 py-0.5 rounded">Original</span>
          </motion.div>
          {movie.overview && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xs md:text-lg text-gray-200 line-clamp-2 md:line-clamp-3 drop-shadow-lg font-bold max-w-xl leading-relaxed"
            >
              {movie.overview as string}
            </motion.p>
          )}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3 md:gap-4 pt-2"
          >
            <Link to={detailPath}>
              <button className="flex items-center gap-2 bg-white text-black px-6 md:px-10 py-2.5 md:py-4 rounded-md hover:bg-white/90 transition-all font-black shadow-xl hover:scale-105 text-sm md:text-xl uppercase tracking-tighter">
                <Play className="fill-black w-4 h-4 md:w-6 md:h-6" /> Play
              </button>
            </Link>
            <Link to={detailPath}>
              <button className="flex items-center gap-2 bg-gray-500/50 text-white px-6 md:px-10 py-2.5 md:py-4 rounded-md hover:bg-gray-500/70 transition-all font-black glass shadow-xl hover:scale-105 border border-white/10 text-sm md:text-xl uppercase tracking-tighter">
                <Info className="w-4 h-4 md:w-6 md:h-6" /> Info
              </button>
            </Link>
          </motion.div>
        </div>
      </div>

      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-20 right-4 md:hidden z-40 p-2.5 rounded-full border border-white/20 bg-black/40 hover:bg-white/10 transition-all backdrop-blur-sm shrink-0"
      >
        {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
      </button>

      <div className="absolute bottom-[10vh] md:bottom-[15vh] right-4 md:right-0 z-40 flex items-center gap-3">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="hidden md:flex p-4 rounded-full border border-white/20 bg-black/40 hover:bg-white/10 transition-all backdrop-blur-sm shrink-0"
        >
          {isMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
        </button>
        <div className="bg-black/80 backdrop-blur-md border-l-4 border-[var(--primary)] pl-4 py-2 pr-8 md:pr-24 text-base md:text-2xl font-black text-white">
          {movie.rating}{" "}
          <span className="text-[10px] text-gray-400 block uppercase tracking-wider">IMDB Rating</span>
        </div>
      </div>
    </div>
  );
}

export default memo(Banner);
