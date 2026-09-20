'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MediaImage from '@/components/MediaImage';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Play, Info, Star, Calendar, Clock, ChevronRight, ChevronLeft, X, Heart, Share2, Plus, Check, Volume2, VolumeX, ChevronDown, ChevronUp, Users, Pause, RefreshCw, Maximize2 } from 'lucide-react';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useAuthStore } from '@/store/useAuthStore';
import MovieRow from '@/components/MovieRow';
import NetflixLoader from '@/components/NetflixLoader';
import { createParty, subscribeToParty, updatePartyState, getParty } from '@/services/party';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  enterCinemaPresentation,
  exitCinemaPresentation,
} from '@/lib/cinemaOrientation';

const ShareModal = dynamic(() => import('@/components/ShareModal'), { ssr: false, loading: () => null });
const PartyOverlay = dynamic(() => import('@/components/PartyOverlay'), { ssr: false, loading: () => null });
const CatalogChatPopup = dynamic(() => import('@/components/CatalogChatPopup'), { ssr: false, loading: () => null });
const AuthModal = dynamic(() => import('@/components/AuthModal'), { ssr: false, loading: () => null });

export default function DetailClient() {
  const { type, slug } = useParams();
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { user } = useAuthStore();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState(null);
  const [selectedEmbedIndex, setSelectedEmbedIndex] = useState(0);
  const [showPlayer, setShowPlayer] = useState(false);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('1');
  const [episodes, setEpisodes] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [cinemaControlsVisible, setCinemaControlsVisible] = useState(false);
  const [currentEpisodeId, setCurrentEpisodeId] = useState(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Watch Party State
  const [partyId, setPartyId] = useState(searchParams.get('party'));
  const [partyData, setPartyData] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [playerKey, setPlayerKey] = useState(0);
  const [syncTime, setSyncTime] = useState(0);
  const [showSyncNeeded, setShowSyncNeeded] = useState(false);
  const [isChangingEpisode, setIsChangingEpisode] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  const chatEpisodeKey =
    type === 'series' && currentEpisodeId ? String(currentEpisodeId) : null;

  const prevCinemaRef = useRef(false);
  useEffect(() => {
    if (prevCinemaRef.current && !isCinemaMode) {
      exitCinemaPresentation();
    }
    prevCinemaRef.current = isCinemaMode;
  }, [isCinemaMode]);

  const handleCinemaToggle = async (e) => {
    e.stopPropagation();
    if (isCinemaMode) {
      setIsCinemaMode(false);
      setCinemaControlsVisible(false);
      return;
    }
    setIsCinemaMode(true);
    setCinemaControlsVisible(false);
    await enterCinemaPresentation();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showPlayer) {
        if (e.key === 'Escape') {
          if (isCinemaMode) {
            setIsCinemaMode(false);
          } else {
            setShowPlayer(false);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPlayer, isCinemaMode]);

  // Watch Party Subscription
  useEffect(() => {
    if (!partyId) return;

    const unsubscribe = subscribeToParty(partyId, (data) => {
      if (data) {
        setPartyData(data);
        // If not host, sync local time with party time
        if (!isHost) {
          // If first time or big jump, suggest sync.
          // Uses the functional form because this closure is only recreated when
          // partyId/isHost change, so a captured `localTime` would stay stale
          // (always 0) instead of reflecting local playback progress.
          setLocalTime((prev) => {
            if (prev === 0) {
              setSyncTime(data.currentTime);
              return data.currentTime;
            }
            return prev;
          });
          // If the party started and we aren't playing, we should start
          if (data.isPlaying && !showPlayer) {
            setShowPlayer(true);
          }
        }
      } else {
        setPartyId(null);
        setPartyData(null);
      }
    });

    return () => unsubscribe();
  }, [partyId, isHost]);

  // Wall clock sync for everyone
  useEffect(() => {
    if (partyId && showPlayer && partyData?.isPlaying) {
      const interval = setInterval(() => {
        setLocalTime(prev => {
          const newTime = prev + 1;
          // Escribe a Firestore cada 4s en vez de cada segundo: no se pierde
          // precisión de sync (los invitados igual interpolan localmente)
          // y se reducen ~4x las escrituras.
          if (isHost && newTime % 4 === 0) {
            updatePartyState(partyId, true, newTime);
          }
          return newTime;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isHost, partyId, showPlayer, partyData?.isPlaying]);

  useEffect(() => {
    if (item) {
      fetch(`/api/media/recommendations?itemId=${encodeURIComponent(item.id)}&type=${item.type || 'movie'}`)
        .then((res) => res.json())
        .then((data) => data.success && setRecommendations(data.data));

      if (item.trailer) {
        const timer = setTimeout(() => setIsPlayingTrailer(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [item]);

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile && navigator.share) {
      navigator.share({
        title: item.title,
        text: item.overview,
        url: url,
      }).catch(console.error);
    } else {
      setIsShareModalOpen(true);
    }
  };

  const handleStartParty = async () => {
    const id = await createParty(slug, type === 'peliculas' ? 'movie' : 'series', currentEpisodeId);
    setPartyId(id);
    setIsHost(true);
    // Add party to URL without refreshing
    const newUrl = `${window.location.pathname}?party=${id}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleTogglePlayParty = () => {
    if (isHost && partyId) {
      const newState = !partyData?.isPlaying;
      updatePartyState(partyId, newState, localTime);
    }
  };

  const handleManualSync = (time) => {
    const targetTime = time !== undefined ? time : (partyData?.currentTime || 0);
    if (isHost && partyId) {
      setLocalTime(targetTime);
      setSyncTime(targetTime);
      updatePartyState(partyId, partyData?.isPlaying, targetTime);
      setPlayerKey(prev => prev + 1);
    } else if (!isHost && partyData) {
      setLocalTime(targetTime);
      setSyncTime(targetTime);
      setPlayerKey(prev => prev + 1); // Force reload iframe
    }
  };

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const mediaType = type === 'peliculas' ? 'movie' : 'series';
        const res = await fetch(`/api/media/detail?type=${mediaType}&slug=${slug}`);
        const data = await res.json();
        if (data.success) {
          setItem(data.data);
          if (type === 'peliculas' || data.data.type === 'movie') {
            fetchPlayer(data.data.numericId);
          } else {
            fetchEpisodes(data.data.numericId, '1');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    setItem(null);
    setPlayerData(null);
    setEpisodes([]);
    fetchDetail();
  }, [type, slug]);

  const fetchPlayer = async (postId) => {
    if (postId == null || postId === '') {
      setPlayerData(null);
      return;
    }
    const res = await fetch(`/api/media/player?postId=${postId}`);
    const data = await res.json();
    if (data.success) {
      setPlayerData(data.data);
      setSelectedEmbedIndex(0);
      setCurrentEpisodeId(postId);
    } else {
      setPlayerData(null);
    }
  };

  const handleEpisodeChange = async (postId) => {
    if (!postId || postId === currentEpisodeId || isChangingEpisode) return;
    setIsChangingEpisode(true);
    const minDelay = new Promise(r => setTimeout(r, 1200));
    await Promise.all([fetchPlayer(postId), minDelay]);
    setIsChangingEpisode(false);
  };

  const fetchEpisodes = async (showId, season) => {
    if (showId == null || showId === '') {
      setEpisodes([]);
      return;
    }
    const res = await fetch(`/api/media/episodes?showId=${showId}&season=${season}`);
    const data = await res.json();
    if (data.success) {
      setEpisodes(data.data.posts);
      if (data.data.seasons) setSeasons(data.data.seasons);
      const posts = data.data.posts;
      if (posts?.length && posts[0]._id) {
        await fetchPlayer(posts[0]._id);
      }
    }
  };

  if (loading) return <NetflixLoader />;
  if (!item) return <div className="min-h-screen bg-background flex items-center justify-center text-white">Contenido no encontrado</div>;

  const trailerId = item.trailer?.includes('v=') 
    ? item.trailer.split('v=')[1]?.split('&')[0] 
    : item.trailer?.split('/').pop();

  return (
    <main className="min-h-screen bg-background text-white pb-20 overflow-x-hidden">
      <Navbar />
      
      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          item={item}
        />
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {item?.id && (
        <CatalogChatPopup
          key={`chat-${item.id}-${chatEpisodeKey ?? 'all'}`}
          mediaId={item.id}
          episodeKey={chatEpisodeKey}
          contentTitle={item.title}
          playerMode={showPlayer}
          onOpenAuth={(mode) => {
            setAuthModalMode(mode || 'login');
            setAuthModalOpen(true);
          }}
        />
      )}

      <div className={cn(
        "relative w-full transition-all duration-700 ease-in-out",
        showPlayer 
          ? (isCinemaMode ? "h-screen fixed inset-0 z-[100] bg-black pt-0 pb-0" : "min-h-[120vh] pt-28 pb-32") 
          : "h-[90vh] md:h-[95vh]"
      )}>
        <AnimatePresence mode="wait">
          {!showPlayer ? (
            <motion.div 
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative h-full w-full"
            >
              <div className="absolute inset-0">
                {isPlayingTrailer && trailerId ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative w-full h-full scale-[1.05]"
                  >
                    <iframe
                      src={`https://www.youtube.com/embed/${trailerId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${trailerId}&auto_play=1&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1`}
                      className="w-full h-full pointer-events-none brightness-[0.7]"
                      allow="autoplay; encrypted-media"
                    />
                  </motion.div>
                ) : (
                  <MediaImage
                    src={item.backdrop || item.image}
                    alt={item.title}
                    className="w-full h-full object-cover brightness-[0.4]"
                  />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-background via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-black/60 to-transparent" />
              </div>

              {isPlayingTrailer && trailerId && (
                <div className="absolute bottom-40 right-8 md:right-16 z-20">
                   <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-3 md:p-4 rounded-full border-2 border-white/20 bg-black/40 backdrop-blur-md hover:bg-black/60 transition-premium shadow-2xl"
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                </div>
              )}

              <div className="absolute inset-0 flex flex-col justify-end pt-32 px-4 md:px-12 pb-[12vh] md:pb-[15vh]">
                <motion.div 
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="max-w-6xl z-10 w-full"
                >
                  <h1 className="text-3xl md:text-5xl lg:text-7xl font-black mb-6 drop-shadow-2xl uppercase tracking-tighter leading-[1] max-w-full break-words italic">
                    {item.title}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-8 text-sm md:text-lg font-bold text-gray-300">
                    <span className="flex items-center gap-2 text-primary bg-primary/10 px-3 py-1 rounded">
                      <Star size={18} fill="currentColor" className="text-yellow-400" /> {item.rating} IMDB
                    </span>
                    <span className="flex items-center gap-2">
                       {item.year}
                    </span>
                    <span className="px-2.5 py-0.5 border-2 border-primary text-primary rounded text-xs font-black uppercase tracking-widest bg-primary/10">
                      {item.type === 'movie' ? 'Película' : 'Serie'}
                    </span>
                  </div>
                  
                  <div className="relative group max-w-3xl">
                    <p className={cn(
                      "text-base md:text-xl text-gray-200 mb-2 leading-relaxed font-medium drop-shadow-lg transition-all duration-500",
                      !isExpanded && "line-clamp-3"
                    )}>
                      {item.overview}
                    </p>
                    {item.overview?.length > 200 && (
                      <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-primary hover:text-white font-black uppercase text-xs tracking-widest flex items-center gap-1 transition-premium mb-8"
                      >
                        {isExpanded ? (
                          <>Ver menos <ChevronUp size={14} /></>
                        ) : (
                          <>Ver más <ChevronDown size={14} /></>
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-6">
                    <button 
                      onClick={() => {
                        setShowPlayer(true);
                        setIsPlayingTrailer(false);
                        if (type === 'series' && episodes.length > 0 && !currentEpisodeId) {
                          handleEpisodeChange(episodes[0]._id);
                        }
                      }}
                      className="flex items-center gap-3 px-8 md:px-12 py-3.5 md:py-4 bg-white text-black rounded-md font-black uppercase tracking-tighter hover:bg-gray-200 transition-premium shadow-2xl hover:scale-105 text-lg md:text-xl shadow-white/10"
                    >
                      <Play size={24} fill="currentColor" /> Reproducir
                    </button>
                    <button 
                      onClick={() => toggleFavorite(item, user?.uid)}
                      className={cn(
                        "flex items-center gap-3 px-6 md:px-10 py-3.5 md:py-4 rounded-md font-black uppercase tracking-tighter transition-premium border-[2px] backdrop-blur-md text-lg md:text-xl",
                        isFavorite(item.id) 
                          ? "bg-primary border-primary text-white" 
                          : "bg-gray-600/30 border-white/20 text-white hover:bg-gray-600/50 hover:scale-105"
                      )}
                    >
                      {isFavorite(item.id) ? <Check size={24} /> : <Plus size={24} />} 
                      {isFavorite(item.id) ? 'En mi lista' : 'Mi Lista'}
                    </button>
                    <button 
                      onClick={handleShare}
                      className="p-3.5 md:p-4 bg-gray-600/30 text-white rounded-full font-bold hover:bg-gray-600/50 transition-premium backdrop-blur-md border-[2px] border-white/20"
                    >
                      <Share2 size={24} />
                    </button>
                    {/* 
                    <button 
                      onClick={handleStartParty}
                      className="flex items-center gap-3 px-6 md:px-10 py-3.5 md:py-4 rounded-md font-black uppercase tracking-tighter transition-premium border-[2px] bg-indigo-600/20 border-indigo-500/50 text-indigo-400 hover:bg-indigo-600/40 hover:scale-105 text-lg md:text-xl"
                    >
                      <Users size={24} /> Ver con amigos
                    </button> 
                    */}
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
              className={cn(
                "flex flex-col items-center transition-all duration-700",
                isCinemaMode ? "px-0 pt-0 h-screen w-screen z-[100] group/cinema" : "px-4 md:px-12 pt-8"
              )}
            >
              <div className={cn("w-full transition-all duration-700", isCinemaMode ? "max-w-none h-full" : "max-w-7xl")}>
                <div className="flex items-center justify-between mb-6" onClick={(e) => e.stopPropagation()}>
                  <div className={cn("flex flex-col", isCinemaMode && "absolute top-4 left-4 md:top-8 md:left-8 z-50 bg-black/60 backdrop-blur-md p-3 md:p-4 rounded-xl border border-white/10 transition-opacity duration-300 opacity-0 group-hover/cinema:opacity-100", isCinemaMode && cinemaControlsVisible && "opacity-100")}>
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter truncate max-w-full">
                      Estas viendo: <span className="text-primary italic">{item.title}</span>
                    </h2>
                    {type === 'series' && currentEpisodeId && (
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                        Episodio: {episodes.find(e => e._id === currentEpisodeId)?.title || 'Cargando...'}
                      </p>
                    )}
                    {playerData?.trailerOnly && (
                      <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 w-fit rounded bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-[10px] font-black uppercase tracking-widest">
                        Tráiler / Ficha informativa (sin enlaces de reproducción locales)
                      </span>
                    )}
                    {playerData?.isFallback && (
                      <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 w-fit rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                        {playerData?.embeds?.[selectedEmbedIndex]?.isTrailer
                          ? 'Tráiler oficial · Puedes alternar a los servidores de streaming en las opciones'
                          : 'Servidores de streaming externos · Puedes alternar con el tráiler oficial'}
                      </span>
                    )}
                  </div>
                  <div className={cn(
                    "flex items-center gap-2",
                    isCinemaMode && "absolute top-4 right-4 md:top-8 md:right-8 z-50 transition-opacity duration-300 opacity-0 group-hover/cinema:opacity-100",
                    isCinemaMode && cinemaControlsVisible && "opacity-100"
                  )}>
                    {partyId && (
                      <PartyOverlay 
                        partyId={partyId}
                        isPlaying={partyData?.isPlaying}
                        currentTime={localTime}
                        isHost={isHost}
                        onTogglePlay={handleTogglePlayParty}
                        onSyncManual={handleManualSync}
                        onClose={() => { setPartyId(null); router.push(window.location.pathname); }}
                        item={item}
                      />
                    )}
                    <button 
                      type="button"
                      onClick={handleCinemaToggle}
                      className={cn(
                        "flex items-center gap-2 text-white hover:text-primary transition-premium border border-white/10",
                        isCinemaMode 
                          ? "p-2 rounded-full bg-black/60 hover:bg-black/80 min-w-0" 
                          : "flex text-[10px] md:text-xs font-black uppercase tracking-[0.2em] bg-white/5 hover:bg-white/10 px-3 md:px-6 py-2 md:py-3 rounded-lg"
                      )}
                      title={isCinemaMode ? 'Salir de modo cine' : 'Modo cine (apaisado en móvil)'}
                    >
                      {isCinemaMode ? <Maximize2 size={18} /> : <span>Modo Cine</span>}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowPlayer(false); setIsCinemaMode(false); setCinemaControlsVisible(false); }}
                      className={cn(
                        "flex items-center gap-2 text-white hover:text-primary transition-premium border border-white/10",
                        isCinemaMode 
                          ? "p-2 rounded-full bg-black/60 hover:bg-black/80 min-w-0" 
                          : "text-[10px] md:text-xs font-black uppercase tracking-[0.2em] bg-white/5 hover:bg-white/10 px-4 md:px-6 py-2 md:py-3 rounded-lg"
                      )}
                      title="Cerrar"
                    >
                      <X size={isCinemaMode ? 18 : 18} />
                      {!isCinemaMode && <span>Cerrar</span>}
                    </button>
                  </div>
                </div>
                                <div className={cn(
                  "relative aspect-video w-full rounded-xl overflow-hidden shadow-2xl border border-white/5 bg-black transition-all duration-700",
                  isCinemaMode && "aspect-auto h-screen w-screen rounded-none border-none fixed inset-0 z-40"
                )}>
                  {isChangingEpisode && (
                    <div className="absolute inset-0 z-[60]">
                      <NetflixLoader fullScreen={false} message="Cargando episodio..." />
                    </div>
                  )}
                  {playerData && playerData.embeds && playerData.embeds.length > 0 ? (
                    <>
                      {(() => {
                        const currentEmbed = playerData.embeds[selectedEmbedIndex] || playerData.embeds[0];
                        const baseUrl = currentEmbed?.url || '';
                        const iframeSrc = (syncTime > 0)
                          ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${syncTime}`
                          : baseUrl;
                        return (
                          <iframe
                            key={`${playerKey}-${selectedEmbedIndex}`}
                            src={iframeSrc}
                            className="w-full h-full border-0"
                            referrerPolicy="origin"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        );
                      })()}
                      
                      {/* Party Pause Overlay */}
                      {partyId && partyData && !partyData.isPlaying && (
                        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                          <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white/5 border border-white/10 p-12 rounded-[3rem] shadow-2xl"
                          >
                            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6 mx-auto">
                              <Pause size={48} className="text-primary fill-primary" />
                            </div>
                            <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Sala Pausada</h3>
                            <p className="text-gray-400 font-medium max-w-xs">El anfitrión ha pausado la reproducción para todos.</p>
                          </motion.div>
                        </div>
                      )}

                      {/* Sync Needed Notification */}
                      {!isHost && partyId && partyData && Math.abs(localTime - partyData.currentTime) > 10 && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
                          <button 
                            onClick={() => handleManualSync()}
                            className="flex items-center gap-3 px-8 py-4 bg-green-500 text-white rounded-full font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 transition-premium"
                          >
                            <RefreshCw size={18} /> Sincronizar con el Host ({Math.abs(localTime - partyData.currentTime)}s)
                          </button>
                        </div>
                      )}
                    </>
                  ) : <NetflixLoader fullScreen={false} />}
                  
                  {/* Lights Off overlay when not in cinema mode but player is open */}
                  {!isCinemaMode && <div className="absolute inset-0 pointer-events-none bg-black/20" />}
                  {/* Tap overlay in cinema mode - solo bordes para no bloquear play/pause del reproductor */}
                  {isCinemaMode && (
                    <>
                      <div 
                        className="absolute top-0 left-0 right-0 h-24 cursor-pointer z-10"
                        onClick={() => setCinemaControlsVisible(v => !v)}
                        aria-label="Mostrar/ocultar controles"
                      />
                      <div 
                        className="absolute bottom-0 left-0 right-0 h-24 cursor-pointer z-10"
                        onClick={() => setCinemaControlsVisible(v => !v)}
                        aria-label="Mostrar/ocultar controles"
                      />
                    </>
                  )}
                </div>

                <div className="mt-6 md:mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-4 pb-12 px-2">
                  {type === 'series' && (
                    <div className="w-full flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 mb-6 md:mb-8">
                       <button 
                        disabled={episodes.findIndex(e => e._id === currentEpisodeId) <= 0 || isChangingEpisode}
                        onClick={() => {
                          const idx = episodes.findIndex(e => e._id === currentEpisodeId);
                          if (idx > 0) handleEpisodeChange(episodes[idx - 1]._id);
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg font-black uppercase text-xs tracking-widest transition-all duration-200 border border-white/10 active:scale-95 active:bg-white/15"
                      >
                        <ChevronLeft size={16} />
                        Anterior
                      </button>
                      <button 
                        disabled={episodes.findIndex(e => e._id === currentEpisodeId) >= episodes.length - 1 || isChangingEpisode}
                        onClick={() => {
                          const idx = episodes.findIndex(e => e._id === currentEpisodeId);
                          if (idx < episodes.length - 1) handleEpisodeChange(episodes[idx + 1]._id);
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/80 disabled:opacity-30 rounded-lg font-black uppercase text-xs tracking-widest transition-all duration-200 active:scale-95 active:bg-primary/90"
                      >
                        Siguiente Episodio
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                  
                  <span className="w-full text-center text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Servidores disponibles</span>
                  {playerData?.embeds?.map((server, i) => {
                    const isTrailer = server.isTrailer || server.label?.toLowerCase().includes('tráiler');
                    return (
                      <button 
                        key={i} 
                        className={cn(
                          "px-6 md:px-10 py-3 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest transition-all", 
                          i === selectedEmbedIndex 
                            ? "bg-primary text-white shadow-lg shadow-primary/20" 
                            : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-primary/50",
                          isTrailer && i !== selectedEmbedIndex && "border-red-500/40 text-red-400 hover:border-red-500 hover:text-red-300"
                        )}
                        onClick={() => { 
                          setSelectedEmbedIndex(i);
                          setPlayerKey(prev => prev + 1);
                        }}
                      >
                        {isTrailer ? 'Ver Tráiler Oficial' : (server.label || server.server || server.name || `Opción ${i + 1}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {item.type === 'series' && (
        <section className="px-6 md:px-12 py-12 mt-12 bg-gradient-to-b from-transparent to-black/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic border-l-8 border-primary pl-6">Temporadas</h2>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-xs font-black uppercase tracking-[0.4em]">Temporada:</span>
              <select value={selectedSeason} onChange={(e) => { setSelectedSeason(e.target.value); fetchEpisodes(item.numericId, e.target.value); }} className="bg-black/80 backdrop-blur-2xl px-8 py-3.5 rounded-xl outline-none border-2 border-white/10 focus:border-primary transition-premium cursor-pointer font-black uppercase text-base shadow-2xl">
                {seasons.map(s => <option key={s} value={s}>Temporada {s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {episodes.map((ep, idx) => (
              <motion.div key={ep._id} whileHover={{ y: -12, scale: 1.03 }} className="group cursor-pointer bg-white/5 rounded-[2rem] overflow-hidden border border-white/5 hover:border-primary/50 transition-all duration-500 shadow-2xl" onClick={() => { setIsPlayingTrailer(false); setShowPlayer(true); handleEpisodeChange(ep._id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <div className="relative aspect-video overflow-hidden">
                  <MediaImage src={ep.image || item.image} alt={ep.title} className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-125 brightness-75 group-hover:brightness-100" />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-500 backdrop-blur-[6px]"><div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center scale-50 group-hover:scale-100 transition-all duration-700 shadow-[0_0_60px_rgba(229,9,20,0.8)]"><Play size={32} className="fill-white ml-2 text-white" /></div></div>
                  <div className="absolute top-4 left-4 bg-primary text-white px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase shadow-2xl transform -rotate-2">Episodio {idx + 1}</div>
                </div>
                <div className="p-6"><h3 className="font-black text-xl mb-3 group-hover:text-primary transition-colors duration-500 leading-tight">{ep.title}</h3><p className="text-sm text-gray-400 leading-relaxed line-clamp-2 font-medium opacity-80 group-hover:opacity-100 transition-opacity italic">{ep.overview || "Prepárate para vivir una experiencia inolvidable con este nuevo episodio."}</p></div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
      {recommendations.length > 0 && (
        <div className="mt-40 md:mt-60 border-t border-white/5 pt-20 bg-gradient-to-t from-black/50 to-transparent">
          <div className="pb-20">
            <MovieRow title="Mas Contenido Similar" items={recommendations} />
          </div>
        </div>
      )}
    </main>
  );
}
