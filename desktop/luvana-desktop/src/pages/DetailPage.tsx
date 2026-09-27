import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Play, Star, X, Plus, Check, Volume2, VolumeX, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { useAuthStore } from "@/store/useAuthStore";
import MovieRow from "@/components/MovieRow";
import NetflixLoader from "@/components/NetflixLoader";
import { fetchDetail, fetchTrailers, fetchEpisodes, fetchRecommendations, type Trailer } from "@/api/client";

interface DetailItem {
  id: string;
  numericId?: string;
  title?: string;
  overview?: string;
  backdrop?: string;
  image?: string;
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

const LANGUAGE_LABEL: Record<string, string> = { es: "Español", en: "Inglés" };

function youtubeEmbedUrl(id: string, params: Record<string, string | number> = {}) {
  const query = new URLSearchParams({ rel: "0", modestbranding: "1" });
  Object.entries(params).forEach(([k, v]) => query.set(k, String(v)));
  return `https://www.youtube-nocookie.com/embed/${id}?${query}`;
}

export default function DetailPage() {
  const { type, slug } = useParams<{ type: string; slug: string }>();
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const user = useAuthStore((s) => s.user);

  const [item, setItem] = useState<DetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [trailersLoading, setTrailersLoading] = useState(false);
  const [selectedTrailer, setSelectedTrailer] = useState(0);
  const [showTheater, setShowTheater] = useState(false);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("1");
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [recommendations, setRecommendations] = useState<DetailItem[]>([]);
  const [heroTrailerOn, setHeroTrailerOn] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showTheater && e.key === "Escape") {
        if (isCinemaMode) setIsCinemaMode(false);
        else setShowTheater(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showTheater, isCinemaMode]);

  useEffect(() => {
    if (!item) return;
    const mediaType = item.type === "series" ? "series" : "movie";
    fetchRecommendations(item.id, mediaType).then(setRecommendations).catch(() => {});
    setTrailersLoading(true);
    fetchTrailers(mediaType, item.id)
      .then(setTrailers)
      .catch(() => setTrailers([]))
      .finally(() => setTrailersLoading(false));
  }, [item?.id, item?.type]);

  const heroTrailer = trailers[0];
  useEffect(() => {
    if (!heroTrailer || showTheater) return;
    const timer = setTimeout(() => setHeroTrailerOn(true), 3000);
    return () => clearTimeout(timer);
  }, [heroTrailer, showTheater]);

  const loadDetail = async () => {
    if (!type || !slug) return;
    setLoading(true);
    setItem(null);
    setTrailers([]);
    setSelectedTrailer(0);
    setShowTheater(false);
    setHeroTrailerOn(false);
    setEpisodes([]);
    try {
      const mediaType = type === "peliculas" ? "movie" : "series";
      const data = await fetchDetail(mediaType, slug);
      setItem(data);
      if (data.type === "series" && data.numericId) {
        loadEpisodes(String(data.numericId), "1");
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

  const loadEpisodes = async (showId: string, season: string) => {
    try {
      const data = await fetchEpisodes(showId, season);
      setEpisodes(data.posts || []);
      if (data.seasons) setSeasons(data.seasons);
    } catch {
      setEpisodes([]);
    }
  };

  if (loading) return <NetflixLoader />;
  if (!item) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-white">Contenido no encontrado</div>;

  const hasTrailer = trailers.length > 0;
  const currentTrailer = trailers[selectedTrailer] || trailers[0];

  return (
    <div className="min-h-screen bg-[var(--background)] text-white pb-20 overflow-x-hidden">
      <div
        className={cn(
          "relative w-full transition-all duration-700 ease-in-out",
          showTheater ? (isCinemaMode ? "h-screen fixed inset-0 z-[100] bg-black" : "min-h-screen pt-28 pb-16") : "h-[90vh] md:h-[95vh]"
        )}
      >
        <AnimatePresence mode="wait">
          {!showTheater || !hasTrailer ? (
            <motion.div key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative h-full w-full">
              <div className="absolute inset-0">
                {heroTrailerOn && heroTrailer ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full h-full scale-[1.05]">
                    <iframe
                      src={youtubeEmbedUrl(heroTrailer.key, { autoplay: 1, mute: isMuted ? 1 : 0, controls: 0, loop: 1, playlist: heroTrailer.key })}
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

              {heroTrailerOn && heroTrailer && (
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
                      <Star size={18} fill="currentColor" className="text-yellow-400" /> {item.rating}
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
                        setHeroTrailerOn(false);
                        setShowTheater(true);
                      }}
                      disabled={!hasTrailer}
                      className="flex items-center gap-3 px-8 md:px-12 py-3.5 md:py-4 bg-white text-black rounded-md font-black uppercase tracking-tighter hover:bg-gray-200 transition-premium shadow-2xl hover:scale-105 text-lg md:text-xl disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                    >
                      <Play size={24} fill="currentColor" />
                      {trailersLoading ? "Buscando tráiler…" : hasTrailer ? "Ver tráiler" : "Tráiler no disponible"}
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
              key="theater"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(isCinemaMode ? "h-screen w-screen" : "px-4 md:px-12 pt-8")}
            >
              <div className={cn("w-full mx-auto", isCinemaMode ? "h-full" : "max-w-7xl")}>
                <div className={cn("flex items-center justify-between gap-4 mb-6", isCinemaMode && "absolute top-4 inset-x-4 z-50 mb-0")}>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight truncate">
                    Tráiler: <span className="text-[var(--primary)]">{item.title}</span>
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsCinemaMode(!isCinemaMode)}
                      className="flex items-center gap-2 px-3 md:px-5 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest transition-premium"
                      title={isCinemaMode ? "Salir de modo cine" : "Modo cine"}
                    >
                      {isCinemaMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    <button
                      onClick={() => {
                        setShowTheater(false);
                        setIsCinemaMode(false);
                      }}
                      className="flex items-center gap-2 px-3 md:px-5 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest transition-premium"
                      title="Cerrar"
                    >
                      <X size={16} /> Cerrar
                    </button>
                  </div>
                </div>
                <div className={cn("relative w-full overflow-hidden bg-black", isCinemaMode ? "h-full" : "aspect-video rounded-xl border border-white/5 shadow-2xl")}>
                  {currentTrailer && (
                    <iframe
                      key={currentTrailer.key}
                      src={youtubeEmbedUrl(currentTrailer.key, { autoplay: 1 })}
                      className="w-full h-full border-0"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      title={`Tráiler de ${item.title}`}
                    />
                  )}
                </div>
                {trailers.length > 1 && !isCinemaMode && (
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    <span className="w-full text-center text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Otras versiones</span>
                    {trailers.map((t, i) => (
                      <button
                        key={t.key}
                        className={cn(
                          "px-4 md:px-6 py-2.5 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest transition-all max-w-xs truncate",
                          i === selectedTrailer ? "bg-[var(--primary)] text-white shadow-lg" : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-[var(--primary)]/50"
                        )}
                        onClick={() => setSelectedTrailer(i)}
                      >
                        {t.name || `Tráiler ${i + 1}`}
                        {LANGUAGE_LABEL[t.language] ? ` · ${LANGUAGE_LABEL[t.language]}` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {item.type === "series" && episodes.length > 0 && (
        <section className="px-6 md:px-12 py-12 mt-12 bg-gradient-to-b from-transparent to-black/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter border-l-8 border-[var(--primary)] pl-6">Temporadas</h2>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-xs font-black uppercase tracking-[0.4em]">Temporada:</span>
              <select
                value={selectedSeason}
                onChange={(e) => {
                  setSelectedSeason(e.target.value);
                  loadEpisodes(String(item.numericId), e.target.value);
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
              <article key={ep._id} className="bg-white/5 rounded-[2rem] overflow-hidden border border-white/5">
                <div className="relative aspect-video overflow-hidden">
                  <img src={(ep.image || item.image) as string} className="w-full h-full object-cover brightness-90" referrerPolicy="no-referrer" alt={ep.title || ""} />
                  <div className="absolute top-4 left-4 bg-[var(--primary)] text-white px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase">
                    Episodio {idx + 1}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-black text-xl mb-3 leading-tight">{ep.title}</h3>
                  {ep.overview && <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 font-medium">{ep.overview}</p>}
                </div>
              </article>
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
