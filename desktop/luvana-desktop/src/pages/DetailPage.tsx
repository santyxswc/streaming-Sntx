import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Play,
  Star,
  X,
  Plus,
  Check,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { useAuthStore } from "@/store/useAuthStore";
import MovieRow from "@/components/MovieRow";
import NetflixLoader from "@/components/NetflixLoader";
import { api } from "@/config/api";
import { fetchDetail, fetchPlayer, fetchEpisodes, fetchRecommendations } from "@/api/client";

interface DetailItem {
  id: string;
  numericId?: string;
  title?: string;
  overview?: string;
  backdrop?: string;
  image?: string;
  trailer?: string;
  type?: string;
  year?: number | string;
  rating?: number;
  [key: string]: unknown;
}

interface Episode {
  _id: string;
  title?: string;
  overview?: string;
  image?: string;
}

export default function DetailPage() {
  const { type, slug } = useParams<{ type: string; slug: string }>();
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { user } = useAuthStore();

  const [item, setItem] = useState<DetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState<{ embeds?: { url: string }[] } | null>(null);
  const [selectedEmbedIndex, setSelectedEmbedIndex] = useState(0);
  const [showPlayer, setShowPlayer] = useState(false);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("1");
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [recommendations, setRecommendations] = useState<DetailItem[]>([]);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [cinemaControlsVisible, setCinemaControlsVisible] = useState(false);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [playerKey, setPlayerKey] = useState(0);
  const [isChangingEpisode, setIsChangingEpisode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPlayer && e.key === "Escape") {
        if (isCinemaMode) setIsCinemaMode(false);
        else setShowPlayer(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPlayer, isCinemaMode]);

  useEffect(() => {
    if (item) {
      fetchRecommendations(item.id, item.type || "movie").then(setRecommendations).catch(() => {});
      if (item.trailer) {
        const timer = setTimeout(() => setIsPlayingTrailer(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [item]);

  const loadDetail = async () => {
    if (!type || !slug) return;
    setLoading(true);
    setItem(null);
    setPlayerData(null);
    setEpisodes([]);
    try {
      const mediaType = type === "peliculas" ? "movie" : "series";
      const data = await fetchDetail(mediaType, slug);
      setItem(data);
      if (type === "peliculas" || data.type === "movie") {
        if (data.numericId) {
          const player = await fetchPlayer(data.numericId);
          setPlayerData(player);
          setCurrentEpisodeId(data.numericId);
        }
      } else if (data.numericId) {
        const eps = await fetchEpisodes(data.numericId, "1");
        setEpisodes(eps.posts || []);
        if (eps.seasons) setSeasons(eps.seasons);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [type, slug]);

  const loadPlayer = async (postId: string) => {
    try {
      const data = await fetchPlayer(postId);
      setPlayerData(data);
      setSelectedEmbedIndex(0);
      setCurrentEpisodeId(postId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEpisodeChange = async (postId: string) => {
    if (!postId || postId === currentEpisodeId || isChangingEpisode) return;
    setIsChangingEpisode(true);
    await Promise.all([loadPlayer(postId), new Promise((r) => setTimeout(r, 800))]);
    setIsChangingEpisode(false);
  };

  const loadEpisodes = async (showId: string, season: string) => {
    try {
      const data = await fetchEpisodes(showId, season);
      setEpisodes(data.posts || []);
      if (data.seasons) setSeasons(data.seasons);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <NetflixLoader />;
  if (!item) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-white">Contenido no encontrado</div>;

  const trailer = item.trailer as string | undefined;
  const trailerId = trailer?.includes("v=") ? trailer.split("v=")[1]?.split("&")[0] : trailer?.split("/").pop();

  return (
    <div className="min-h-screen bg-[var(--background)] text-white pb-20 overflow-x-hidden">
      <div
        className={cn(
          "relative w-full transition-all duration-700 ease-in-out",
          showPlayer ? (isCinemaMode ? "h-screen fixed inset-0 z-[100] bg-black pt-0 pb-0" : "min-h-[120vh] pt-28 pb-32") : "h-[90vh] md:h-[95vh]"
        )}
      >
        <AnimatePresence mode="wait">
          {!showPlayer ? (
            <motion.div key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative h-full w-full">
              <div className="absolute inset-0">
                {isPlayingTrailer && trailerId ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full h-full scale-[1.05]">
                    <iframe
                      src={`https://www.youtube.com/embed/${trailerId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${trailerId}`}
                      className="w-full h-full pointer-events-none brightness-[0.7]"
                      allow="autoplay; encrypted-media"
                      title="Trailer"
                    />
                  </motion.div>
                ) : (
                  <img
                    src={(item.backdrop || item.image) as string}
                    alt={item.title || ""}
                    className="w-full h-full object-cover brightness-[0.4]"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)] via-black/60 to-transparent" />
              </div>

              {isPlayingTrailer && trailerId && (
                <div className="absolute bottom-40 right-8 md:right-16 z-20">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-3 md:p-4 rounded-full border-2 border-white/20 bg-black/40 backdrop-blur-md hover:bg-black/60 transition-premium"
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                </div>
              )}

              <div className="absolute inset-0 flex flex-col justify-end pt-32 px-4 md:px-12 pb-[12vh] md:pb-[15vh]">
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-6xl z-10 w-full">
                  <h1 className="text-3xl md:text-5xl lg:text-7xl font-black mb-6 drop-shadow-2xl uppercase tracking-tighter leading-[1] max-w-full break-words italic">
                    {item.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-8 text-sm md:text-lg font-bold text-gray-300">
                    <span className="flex items-center gap-2 text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1 rounded">
                      <Star size={18} fill="currentColor" className="text-yellow-400" /> {item.rating} IMDB
                    </span>
                    <span>{item.year}</span>
                    <span className="px-2.5 py-0.5 border-2 border-[var(--primary)] text-[var(--primary)] rounded text-xs font-black uppercase tracking-widest bg-[var(--primary)]/10">
                      {item.type === "movie" ? "Película" : "Serie"}
                    </span>
                  </div>
                  <div className="relative max-w-3xl">
                    <p className={cn("text-base md:text-xl text-gray-200 mb-2 leading-relaxed font-medium drop-shadow-lg", !isExpanded && "line-clamp-3")}>
                      {item.overview}
                    </p>
                    {item.overview && (item.overview as string).length > 200 && (
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-[var(--primary)] hover:text-white font-black uppercase text-xs tracking-widest flex items-center gap-1 transition-premium mb-8"
                      >
                        {isExpanded ? <>Ver menos <ChevronUp size={14} /></> : <>Ver más <ChevronDown size={14} /></>}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-6">
                    <button
                      onClick={() => {
                        setShowPlayer(true);
                        setIsPlayingTrailer(false);
                        if (type === "series" && episodes.length > 0 && !currentEpisodeId) {
                          handleEpisodeChange(episodes[0]._id);
                        }
                      }}
                      className="flex items-center gap-3 px-8 md:px-12 py-3.5 md:py-4 bg-white text-black rounded-md font-black uppercase tracking-tighter hover:bg-gray-200 transition-premium shadow-2xl hover:scale-105 text-lg md:text-xl"
                    >
                      <Play size={24} fill="currentColor" /> Reproducir
                    </button>
                    <button
                      onClick={() => toggleFavorite(item, user?.uid)}
                      className={cn(
                        "flex items-center gap-3 px-6 md:px-10 py-3.5 md:py-4 rounded-md font-black uppercase tracking-tighter transition-premium border-[2px] backdrop-blur-md text-lg md:text-xl",
                        isFavorite(item.id)
                          ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                          : "bg-gray-600/30 border-white/20 text-white hover:bg-gray-600/50 hover:scale-105"
                      )}
                    >
                      {isFavorite(item.id) ? <Check size={24} /> : <Plus size={24} />}
                      {isFavorite(item.id) ? "En mi lista" : "Mi Lista"}
                    </button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="player"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn("flex flex-col items-center transition-all duration-700", isCinemaMode ? "px-0 pt-0 h-screen w-screen z-[100] group/cinema" : "px-4 md:px-12 pt-8")}
            >
              <div className={cn("w-full transition-all duration-700", isCinemaMode ? "max-w-none h-full" : "max-w-7xl")}>
                <div className={cn("flex items-center justify-between mb-6")}>
                  <div className={cn("flex flex-col", isCinemaMode && "absolute top-4 left-4 md:top-8 md:left-8 z-50 bg-black/60 backdrop-blur-md p-3 md:p-4 rounded-xl border border-white/10 transition-opacity duration-300 opacity-0 group-hover/cinema:opacity-100", isCinemaMode && cinemaControlsVisible && "opacity-100")}>
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter truncate max-w-full">
                      Estas viendo: <span className="text-[var(--primary)] italic">{item.title}</span>
                    </h2>
                    {type === "series" && currentEpisodeId && (
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                        Episodio: {episodes.find((e) => e._id === currentEpisodeId)?.title || "Cargando..."}
                      </p>
                    )}
                  </div>
                  <div className={cn("flex items-center gap-2", isCinemaMode && "absolute top-4 right-4 md:top-8 md:right-8 z-50 transition-opacity duration-300 opacity-0 group-hover/cinema:opacity-100", isCinemaMode && cinemaControlsVisible && "opacity-100")}>
                    <button
                      onClick={() => {
                        setIsCinemaMode(!isCinemaMode);
                        if (isCinemaMode) setCinemaControlsVisible(false);
                      }}
                      className={cn(
                        "flex items-center gap-2 text-white hover:text-[var(--primary)] transition-premium border border-white/10",
                        isCinemaMode ? "p-2 rounded-full bg-black/60 hover:bg-black/80 min-w-0" : "hidden md:flex text-[10px] md:text-xs font-black uppercase tracking-[0.2em] bg-white/5 hover:bg-white/10 px-4 md:px-6 py-2 md:py-3 rounded-lg"
                      )}
                      title={isCinemaMode ? "Salir de modo cine" : "Modo Cine"}
                    >
                      {isCinemaMode ? <Maximize2 size={18} /> : <span>Modo Cine</span>}
                    </button>
                    <button
                      onClick={() => {
                        setShowPlayer(false);
                        setIsCinemaMode(false);
                        setCinemaControlsVisible(false);
                      }}
                      className={cn(
                        "flex items-center gap-2 text-white hover:text-[var(--primary)] transition-premium border border-white/10",
                        isCinemaMode ? "p-2 rounded-full bg-black/60 hover:bg-black/80 min-w-0" : "text-[10px] md:text-xs font-black uppercase tracking-[0.2em] bg-white/5 hover:bg-white/10 px-4 md:px-6 py-2 md:py-3 rounded-lg"
                      )}
                      title="Cerrar"
                    >
                      <X size={18} />
                      {!isCinemaMode && <span>Cerrar</span>}
                    </button>
                  </div>
                </div>
                <div
                  className={cn(
                    "relative aspect-video w-full rounded-xl overflow-hidden shadow-2xl border border-white/5 bg-black transition-all duration-700",
                    isCinemaMode && "aspect-auto h-screen w-screen rounded-none border-none fixed inset-0 z-40"
                  )}
                >
                  {isChangingEpisode && (
                    <div className="absolute inset-0 z-[60]">
                      <NetflixLoader fullScreen={false} message="Cargando episodio..." />
                    </div>
                  )}
                  {playerData?.embeds && playerData.embeds.length > 0 ? (
                    <iframe
                      key={`${playerKey}-${selectedEmbedIndex}`}
                      src={playerData.embeds[selectedEmbedIndex].url}
                      className="w-full h-full"
                      allowFullScreen
                      title="Player"
                    />
                  ) : (
                    <NetflixLoader fullScreen={false} />
                  )}
                  {!isCinemaMode && <div className="absolute inset-0 pointer-events-none bg-black/20" />}
                  {isCinemaMode && (
                    <>
                      <div className="absolute top-0 left-0 right-0 h-24 cursor-pointer z-10" onClick={() => setCinemaControlsVisible((v) => !v)} aria-label="Mostrar controles" />
                      <div className="absolute bottom-0 left-0 right-0 h-24 cursor-pointer z-10" onClick={() => setCinemaControlsVisible((v) => !v)} aria-label="Mostrar controles" />
                    </>
                  )}
                </div>
                <div className="mt-6 md:mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-4 pb-12 px-2">
                  {type === "series" && (
                    <div className="w-full flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 mb-6 md:mb-8">
                      <button
                        disabled={episodes.findIndex((e) => e._id === currentEpisodeId) <= 0 || isChangingEpisode}
                        onClick={() => {
                          const idx = episodes.findIndex((e) => e._id === currentEpisodeId);
                          if (idx > 0) handleEpisodeChange(episodes[idx - 1]._id);
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg font-black uppercase text-xs tracking-widest transition-all border border-white/10"
                      >
                        <ChevronLeft size={16} /> Anterior
                      </button>
                      <button
                        disabled={episodes.findIndex((e) => e._id === currentEpisodeId) >= episodes.length - 1 || isChangingEpisode}
                        onClick={() => {
                          const idx = episodes.findIndex((e) => e._id === currentEpisodeId);
                          if (idx < episodes.length - 1) handleEpisodeChange(episodes[idx + 1]._id);
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary)]/80 disabled:opacity-30 rounded-lg font-black uppercase text-xs tracking-widest transition-all"
                      >
                        Siguiente Episodio <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                  <span className="w-full text-center text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Servidores disponibles</span>
                  {playerData?.embeds?.map((_, i) => (
                    <button
                      key={i}
                      className={cn(
                        "px-6 md:px-10 py-3 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest transition-all",
                        i === selectedEmbedIndex ? "bg-[var(--primary)] text-white shadow-lg" : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-[var(--primary)]/50"
                      )}
                      onClick={() => {
                        setSelectedEmbedIndex(i);
                        setPlayerKey((prev) => prev + 1);
                      }}
                    >
                      Opción {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {item.type === "series" && item.numericId && (
        <section className="px-6 md:px-12 py-12 mt-12 bg-gradient-to-b from-transparent to-black/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic border-l-8 border-[var(--primary)] pl-6">Temporadas</h2>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-xs font-black uppercase tracking-[0.4em]">Temporada:</span>
              <select
                value={selectedSeason}
                onChange={(e) => {
                  setSelectedSeason(e.target.value);
                  loadEpisodes(item.numericId!, e.target.value);
                }}
                className="bg-black/80 backdrop-blur-2xl px-8 py-3.5 rounded-xl outline-none border-2 border-white/10 focus:border-[var(--primary)] transition-premium cursor-pointer font-black uppercase text-base"
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>Temporada {s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {episodes.map((ep, idx) => (
              <motion.div
                key={ep._id}
                whileHover={{ y: -12, scale: 1.03 }}
                className="group cursor-pointer bg-white/5 rounded-[2rem] overflow-hidden border border-white/5 hover:border-[var(--primary)]/50 transition-all duration-500"
                onClick={() => {
                  setIsPlayingTrailer(false);
                  setShowPlayer(true);
                  handleEpisodeChange(ep._id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={(ep.image || item.image) as string}
                    className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-125 brightness-75 group-hover:brightness-100"
                    referrerPolicy="no-referrer"
                    alt={ep.title || ""}
                  />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-500 backdrop-blur-[6px]">
                    <div className="w-16 h-16 rounded-full bg-[var(--primary)] flex items-center justify-center scale-50 group-hover:scale-100 transition-all duration-700">
                      <Play size={32} className="fill-white ml-2 text-white" />
                    </div>
                  </div>
                  <div className="absolute top-4 left-4 bg-[var(--primary)] text-white px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase">
                    Episodio {idx + 1}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-black text-xl mb-3 group-hover:text-[var(--primary)] transition-colors duration-500 leading-tight">{ep.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 font-medium italic">{ep.overview || "Prepárate para vivir una experiencia inolvidable."}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
      {recommendations.length > 0 && (
        <div className="mt-40 md:mt-60 border-t border-white/5 pt-20 bg-gradient-to-t from-black/50 to-transparent">
          <div className="pb-20">
            <MovieRow title="Más Contenido Similar" items={recommendations} />
          </div>
        </div>
      )}
    </div>
  );
}
