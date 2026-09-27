'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Star, Plus, Check, Share2, Volume2, VolumeX, ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import MediaImage from '@/components/ui/MediaImage';
import MovieRow from '@/features/catalog/components/MovieRow';
import PageLoader from '@/components/ui/PageLoader';
import TrailerTheater from '@/features/trailers/components/TrailerTheater';
import { useFavoritesStore } from '@/features/favorites/store/useFavoritesStore';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useTrailers } from '@/features/trailers/hooks/useTrailers';
import { youtubeEmbedUrl } from '@/lib/youtube';
import { cn } from '@/lib/utils';

const ShareModal = dynamic(() => import('@/features/catalog/components/ShareModal'), { ssr: false, loading: () => null });
const CatalogChatPopup = dynamic(() => import('@/features/chat/components/CatalogChatPopup'), { ssr: false, loading: () => null });
const AuthModal = dynamic(() => import('@/features/auth/components/AuthModal'), { ssr: false, loading: () => null });

const HERO_TRAILER_DELAY_MS = 3000;

export default function DetailClient() {
  const { type, slug } = useParams();
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { user } = useAuthStore();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('1');
  const [episodes, setEpisodes] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showTheater, setShowTheater] = useState(false);
  const [heroTrailerOn, setHeroTrailerOn] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  const { trailers, loading: trailersLoading } = useTrailers(item);
  const heroTrailer = trailers[0];

  const fetchEpisodes = useCallback(async (showId, season) => {
    if (showId == null || showId === '') return;
    try {
      const res = await fetch(`/api/media/episodes?showId=${encodeURIComponent(showId)}&season=${season}`);
      const data = await res.json();
      if (data.success) {
        setEpisodes(data.data.posts || []);
        if (data.data.seasons) setSeasons(data.data.seasons);
      } else {
        setEpisodes([]);
      }
    } catch (err) {
      console.error(err);
      setEpisodes([]);
    }
  }, []);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const mediaType = type === 'peliculas' ? 'movie' : 'series';
        const res = await fetch(`/api/media/detail?type=${mediaType}&slug=${slug}`);
        const data = await res.json();
        if (data.success) {
          setItem(data.data);
          if (data.data.type === 'series') fetchEpisodes(data.data.numericId, '1');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    setItem(null);
    setEpisodes([]);
    setSeasons([]);
    setSelectedSeason('1');
    setShowTheater(false);
    setHeroTrailerOn(false);
    fetchDetail();
  }, [type, slug, fetchEpisodes]);

  useEffect(() => {
    if (!item) return;
    fetch(`/api/media/recommendations?itemId=${encodeURIComponent(item.id)}&type=${item.type || 'movie'}`)
      .then((res) => res.json())
      .then((data) => data.success && setRecommendations(data.data))
      .catch(console.error);
  }, [item]);

  // Tráiler silenciado de fondo en el hero, como en las plataformas de streaming.
  useEffect(() => {
    if (!heroTrailer || showTheater) return;
    const timer = setTimeout(() => setHeroTrailerOn(true), HERO_TRAILER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [heroTrailer, showTheater]);

  const openTheater = () => {
    setHeroTrailerOn(false);
    setShowTheater(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeTheater = useCallback(() => setShowTheater(false), []);

  const handleShare = () => {
    const url = window.location.href;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      navigator.share({ title: item.title, text: item.overview, url }).catch(console.error);
    } else {
      setIsShareModalOpen(true);
    }
  };

  if (loading) return <PageLoader />;
  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-white">
        Contenido no encontrado
      </div>
    );
  }

  const hasTrailer = trailers.length > 0;

  return (
    <main className="min-h-screen bg-background text-white pb-20 overflow-x-hidden">
      <Navbar />

      {isShareModalOpen && (
        <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} item={item} />
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authModalMode} />

      <CatalogChatPopup
        key={`chat-${item.id}`}
        mediaId={item.id}
        episodeKey={null}
        contentTitle={item.title}
        playerMode={showTheater}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode || 'login');
          setAuthModalOpen(true);
        }}
      />

      <div
        className={cn(
          'relative w-full transition-all duration-700 ease-in-out',
          showTheater ? 'min-h-screen pt-28 pb-16 px-4 md:px-12' : 'h-[90vh] md:h-[95vh]'
        )}
      >
        <AnimatePresence mode="wait">
          {showTheater && hasTrailer ? (
            <motion.div key="theater" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <TrailerTheater title={item.title} trailers={trailers} onClose={closeTheater} />
            </motion.div>
          ) : (
            <motion.div key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative h-full w-full">
              <div className="absolute inset-0">
                {heroTrailerOn && heroTrailer ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full h-full scale-[1.05]">
                    <iframe
                      src={youtubeEmbedUrl(heroTrailer.key, {
                        autoplay: 1,
                        mute: isMuted ? 1 : 0,
                        controls: 0,
                        loop: 1,
                        playlist: heroTrailer.key,
                        iv_load_policy: 3,
                      })}
                      title={`Tráiler de ${item.title}`}
                      className="w-full h-full pointer-events-none brightness-[0.7]"
                      allow="autoplay; encrypted-media"
                    />
                  </motion.div>
                ) : (
                  <MediaImage src={item.backdrop || item.image} alt={item.title} className="w-full h-full object-cover brightness-[0.4]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-black/60 to-transparent" />
              </div>

              {heroTrailerOn && heroTrailer && (
                <div className="absolute bottom-40 right-8 md:right-16 z-20">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    title={isMuted ? 'Activar sonido' : 'Silenciar'}
                    className="p-3 md:p-4 rounded-full border-2 border-white/20 bg-black/40 backdrop-blur-md hover:bg-black/60 transition-premium shadow-2xl"
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                </div>
              )}

              <div className="absolute inset-0 flex flex-col justify-end pt-32 px-4 md:px-12 pb-[12vh] md:pb-[15vh]">
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-6xl z-10 w-full">
                  <h1 className="text-3xl md:text-5xl lg:text-7xl font-black mb-6 drop-shadow-2xl tracking-tight leading-[1] max-w-full break-words">
                    {item.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-8 text-sm md:text-lg font-bold text-gray-300">
                    {Number(item.rating) > 0 && (
                      <span className="flex items-center gap-2 text-primary bg-primary/10 px-3 py-1 rounded">
                        <Star size={18} fill="currentColor" className="text-yellow-400" /> {item.rating}
                      </span>
                    )}
                    {item.year && <span>{item.year}</span>}
                    <span className="px-2.5 py-0.5 border-2 border-primary text-primary rounded text-xs font-black uppercase tracking-widest bg-primary/10">
                      {item.type === 'movie' ? 'Película' : 'Serie'}
                    </span>
                  </div>

                  <div className="relative max-w-3xl">
                    <p className={cn('text-base md:text-xl text-gray-200 mb-2 leading-relaxed font-medium drop-shadow-lg', !isExpanded && 'line-clamp-3')}>
                      {item.overview}
                    </p>
                    {item.overview?.length > 200 && (
                      <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-primary hover:text-white font-black uppercase text-xs tracking-widest flex items-center gap-1 transition-premium mb-8"
                      >
                        {isExpanded ? <>Ver menos <ChevronUp size={14} /></> : <>Ver más <ChevronDown size={14} /></>}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-6">
                    <button
                      type="button"
                      onClick={openTheater}
                      disabled={!hasTrailer}
                      className="flex items-center gap-3 px-8 md:px-12 py-3.5 md:py-4 bg-white text-black rounded-md font-black uppercase tracking-tight hover:bg-gray-200 transition-premium shadow-2xl hover:scale-105 text-lg md:text-xl disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                    >
                      <Play size={24} fill="currentColor" />
                      {trailersLoading ? 'Buscando tráiler…' : hasTrailer ? 'Ver tráiler' : 'Tráiler no disponible'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(item, user?.uid)}
                      className={cn(
                        'flex items-center gap-3 px-6 md:px-10 py-3.5 md:py-4 rounded-md font-black uppercase tracking-tight transition-premium border-[2px] backdrop-blur-md text-lg md:text-xl',
                        isFavorite(item.id)
                          ? 'bg-primary border-primary text-white'
                          : 'bg-gray-600/30 border-white/20 text-white hover:bg-gray-600/50 hover:scale-105'
                      )}
                    >
                      {isFavorite(item.id) ? <Check size={24} /> : <Plus size={24} />}
                      {isFavorite(item.id) ? 'En mi lista' : 'Mi Lista'}
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      title="Compartir"
                      className="p-3.5 md:p-4 bg-gray-600/30 text-white rounded-full font-bold hover:bg-gray-600/50 transition-premium backdrop-blur-md border-[2px] border-white/20"
                    >
                      <Share2 size={24} />
                    </button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {item.type === 'series' && episodes.length > 0 && (
        <section className="px-6 md:px-12 py-12 mt-12 bg-gradient-to-b from-transparent to-black/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight border-l-8 border-primary pl-6">Temporadas</h2>
            <div className="flex items-center gap-4">
              <label htmlFor="season-select" className="text-gray-400 text-xs font-black uppercase tracking-[0.4em]">
                Temporada:
              </label>
              <select
                id="season-select"
                value={selectedSeason}
                onChange={(e) => {
                  setSelectedSeason(e.target.value);
                  fetchEpisodes(item.numericId, e.target.value);
                }}
                className="bg-black/80 backdrop-blur-2xl px-8 py-3.5 rounded-xl outline-none border-2 border-white/10 focus:border-primary transition-premium cursor-pointer font-black uppercase text-base shadow-2xl"
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>Temporada {s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {episodes.map((ep, idx) => (
              <article key={ep._id} className="bg-white/5 rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl">
                <div className="relative aspect-video overflow-hidden">
                  <MediaImage src={ep.image || item.image} alt={ep.title} className="w-full h-full object-cover brightness-90" />
                  <div className="absolute top-4 left-4 bg-primary text-white px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase shadow-2xl">
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
            <MovieRow title="Más contenido similar" items={recommendations} />
          </div>
        </div>
      )}
    </main>
  );
}
