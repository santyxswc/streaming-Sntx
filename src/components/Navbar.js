'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search, Bell, User, ChevronDown, X, Loader2, Sparkles, Star, Menu, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import MediaImage from '@/components/MediaImage';

const AISearch = dynamic(() => import('@/components/AISearch'), { ssr: false, loading: () => null });
const AuthModal = dynamic(() => import('@/components/AuthModal'), { ssr: false, loading: () => null });
import { useFavoritesStore } from '@/store/useFavoritesStore';

import { ALL_GENRES } from '@/lib/genreMap';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const profileRef = useRef(null);
  const router = useRouter();
  const { user, logout, initAuth } = useAuthStore();
  const { syncWithFirestore } = useFavoritesStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState(null); // 'series' | 'movies' | null
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth();
    return () => unsubscribe();
  }, [initAuth]);

  useEffect(() => {
    if (user) {
      syncWithFirestore(user.uid);
    }
  }, [user, syncWithFirestore]);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => setIsAdmin(false));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/auth/admin', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!cancelled) {
          setIsAdmin(Boolean(json.success && json.data?.admin));
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setSearchLoading(true);
        try {
          const res = await fetch(`/api/media/multi-search?q=${encodeURIComponent(searchQuery)}`, {
            signal: controller.signal,
          });
          const data = await res.json();
          if (data.success) setSearchResults(data.data);
        } catch (err) {
          if (err.name !== 'AbortError') console.error('Search error:', err);
        }
        if (!controller.signal.aborted) setSearchLoading(false);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeMenu === 'profile' && profileRef.current && !profileRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);


  return (
    <nav className={cn(
      "fixed top-0 w-full z-50 transition-premium px-3 sm:px-4 md:px-12 py-3 flex items-center justify-between gap-2 overflow-visible",
      isScrolled ? "glass" : "bg-gradient-to-b from-black/80 to-transparent"
    )}>
      <div className="flex items-center gap-2 lg:gap-8 shrink-0 min-w-0">
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-2 -ml-2 text-white hover:text-primary transition-premium"
          aria-label="Abrir menú"
        >
          <Menu size={24} />
        </button>
        <Link href="/" className="text-primary text-2xl md:text-3xl font-bold tracking-tighter uppercase" onClick={() => setMobileMenuOpen(false)}>
          Luvana
        </Link>
        <div className="hidden lg:flex items-center gap-5 text-sm text-gray-200">
           <Link href="/" className="hover:text-white transition-premium">Inicio</Link>
           
           <div className="relative group" onMouseEnter={() => setActiveMenu('series')} onMouseLeave={() => setActiveMenu(null)}>
              <Link href="/series" className="hover:text-white transition-premium flex items-center gap-1">Series <ChevronDown className="w-3 h-3" /></Link>
              <AnimatePresence>{activeMenu === 'series' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 w-48 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg py-2 mt-2 max-h-96 overflow-y-auto custom-scrollbar">
                  <Link href="/listing/series" className="block px-4 py-2 hover:bg-white/10">Todas las series</Link>
                  <div className="border-t border-white/5 my-1" />
                  {ALL_GENRES.map(g => <Link key={g} href={`/listing/series?genre=${g}`} className="block px-4 py-2 hover:bg-white/10 text-gray-400 hover:text-white">{g}</Link>)}
                </motion.div>
              )}</AnimatePresence>
           </div>
           
           <div className="relative group" onMouseEnter={() => setActiveMenu('movies')} onMouseLeave={() => setActiveMenu(null)}>
              <Link href="/peliculas" className="hover:text-white transition-premium flex items-center gap-1">Películas <ChevronDown className="w-3 h-3" /></Link>
              <AnimatePresence>{activeMenu === 'movies' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 w-48 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg py-2 mt-2 max-h-96 overflow-y-auto custom-scrollbar">
                  <Link href="/listing/peliculas" className="block px-4 py-2 hover:bg-white/10">Todas las películas</Link>
                  <div className="border-t border-white/5 my-1" />
                  {ALL_GENRES.map(g => <Link key={g} href={`/listing/peliculas?genre=${g}`} className="block px-4 py-2 hover:bg-white/10 text-gray-400 hover:text-white">{g}</Link>)}
                </motion.div>
              )}</AnimatePresence>
           </div>

           <Link href="/mi-lista" className="hover:text-white transition-premium">Mi lista</Link>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-5 text-white shrink-0 min-w-0">
        <div className={cn("relative flex items-center bg-black/20 border transition-all duration-500 rounded px-2 py-1", searchOpen ? "w-28 sm:w-48 md:w-64 border-white/40" : "w-10 border-transparent")}>
            <Search className="w-5 h-5 cursor-pointer shrink-0" onClick={() => setSearchOpen(!searchOpen)} />
            <input 
              ref={searchInputRef}
              type="text"
              placeholder="Títulos, personas, géneros"
              className={cn("bg-transparent outline-none text-sm transition-all duration-500", searchOpen ? "ml-2 w-full" : "w-0 opacity-0")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchSubmit}
              onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
            />
            {searchLoading && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0 mr-1" />}
            {searchOpen && searchQuery && !searchLoading && (
              <X className="w-4 h-4 cursor-pointer text-gray-400 hover:text-white" onClick={() => setSearchQuery('')} />
            )}
          
          <AnimatePresence>
            {searchQuery.length > 0 && searchOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed sm:absolute top-16 sm:top-full left-4 right-4 sm:left-auto sm:right-0 sm:inset-auto mt-0 sm:mt-4 w-auto sm:w-[min(450px,calc(100vw-2rem))] bg-[#141414]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100] origin-top sm:origin-top-right"
              >
                {searchResults.length > 0 ? (
                  <>
                    <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      <div className="flex items-center gap-2 mb-4 px-2">
                        <div className="h-1 w-8 bg-primary rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Resultados rápidos</span>
                      </div>
                                  {searchResults.map(item => (
                        <Link key={item.id} href={`/${item.type === 'movie' ? 'peliculas' : 'series'}/${item.id}`} onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                          <div className="flex gap-4 group cursor-pointer hover:bg-white/5 p-3 rounded-xl transition-all duration-300 border border-transparent hover:border-white/5">
                            <div className="relative w-16 h-24 shrink-0 overflow-hidden rounded-lg shadow-2xl">
                              <MediaImage src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                            </div>
                            <div className="flex flex-col justify-center min-w-0">
                              <p className="font-bold text-lg group-hover:text-primary transition-colors leading-tight truncate">{item.title}</p>
                              <p className="text-xs text-gray-400 mt-2 font-medium flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 bg-white/10 rounded text-gray-300">{item.year}</span>
                                <span className="flex items-center gap-1 text-primary">
                                  <Star size={10} fill="currentColor" /> {item.rating}
                                </span>
                                {item.source === 'tmdb' && (
                                  <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[9px] font-black uppercase tracking-wider border border-blue-500/30">TMDB</span>
                                )}
                                {item.source === 'omdb' && (
                                  <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[9px] font-black uppercase tracking-wider border border-yellow-500/30">IMDb</span>
                                )}
                                {(!item.source || item.source === 'local') && (
                                  <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[9px] font-black uppercase tracking-wider border border-green-500/30">Catálogo</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Link 
                      href={`/search?q=${encodeURIComponent(searchQuery)}`}
                      className="block p-5 text-center text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-all duration-300 active:scale-95"
                      onClick={() => setSearchOpen(false)}
                    >
                      Explorar todos los resultados
                    </Link>
                  </>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                       {searchLoading ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <Search className="w-8 h-8 text-gray-600" />}
                    </div>
                    <p className="text-gray-400 font-medium italic">
                      {searchQuery.length < 2
                        ? 'Escribe al menos 2 caracteres para buscar'
                        : searchLoading
                          ? 'Explorando la biblioteca...'
                          : `No hay coincidencias para "${searchQuery}"`}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <button 
          onClick={() => setAiSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-2 md:px-4 bg-gradient-to-r from-primary to-accent rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(229,9,20,0.3)] hover:shadow-[0_0_30px_rgba(229,9,20,0.5)] border border-white/10"
        >
          <Sparkles size={16} className="text-white fill-white/20 shrink-0" />
          <span className="md:hidden">Luvana AI</span>
          <span className="hidden md:inline">Pregunta a la IA</span>
        </button>

        {aiSearchOpen && <AISearch isOpen={aiSearchOpen} onClose={() => setAiSearchOpen(false)} />}
        {authModalOpen && (
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            initialMode={authInitialMode}
          />
        )}
        
        {user ? (
          <div 
            className="relative" 
            ref={profileRef}
            onMouseEnter={() => setActiveMenu('profile')} 
            onMouseLeave={() => setActiveMenu(null)}
          >
            <button 
              onClick={() => setActiveMenu(prev => prev === 'profile' ? null : 'profile')}
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center cursor-pointer hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all">
                <span className="text-xs font-bold">{user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase()}</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-gray-400 group-hover:text-white transition-transform", activeMenu === 'profile' && "rotate-180")} />
            </button>
            
            <AnimatePresence>
              {activeMenu === 'profile' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: 10 }} 
                  className="absolute top-full right-0 w-48 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg py-2 mt-2 shadow-2xl z-[60]"
                >
                  <div className="px-4 py-2 border-b border-white/5 mb-1">
                    <p className="text-xs text-gray-500">Cuenta</p>
                    <p className="text-sm font-medium truncate">{user.displayName || user.email}</p>
                  </div>
                  <Link href="/mi-lista" className="block px-4 py-2 hover:bg-white/10 text-sm">Mi lista</Link>
                  {isAdmin && (
                    <Link
                      href="/admin/chat-moderacion"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 text-sm text-amber-400/90"
                      onClick={() => setActiveMenu(null)}
                    >
                      <Shield size={14} className="shrink-0" />
                      Moderación chat
                    </Link>
                  )}
                  <button 
                    onClick={() => logout()}
                    className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm text-red-400"
                  >
                    Cerrar Sesión
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            <button 
              onClick={() => {
                setAuthInitialMode('login');
                setAuthModalOpen(true);
              }}
              className="text-sm font-bold hover:text-gray-300 transition-colors"
            >
              Iniciar Sesión
            </button>
            <button 
              onClick={() => {
                setAuthInitialMode('register');
                setAuthModalOpen(true);
              }}
              className="text-sm font-bold px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors"
            >
              Registrarse
            </button>
          </div>
        )}
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              key="mobile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div
              key="mobile-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 bottom-0 w-[min(320px,85vw)] bg-[#0a0a0a] border-l border-white/10 z-[70] lg:hidden overflow-y-auto pt-[env(safe-area-inset-top)]"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <span className="text-primary text-xl font-bold tracking-tighter uppercase">Menú</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-white hover:text-primary transition-premium">
                  <X size={24} />
                </button>
              </div>
              <nav className="p-4 flex flex-col gap-1">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg hover:bg-white/10 text-white font-medium">
                  Inicio
                </Link>
                <div>
                  <button 
                    onClick={() => setMobileSubmenu(mobileSubmenu === 'series' ? null : 'series')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-white/10 text-white font-medium"
                  >
                    Series
                    <ChevronDown className={cn("w-4 h-4 transition-transform", mobileSubmenu === 'series' && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                  {mobileSubmenu === 'series' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pl-4 pb-2 overflow-hidden">
                      <Link href="/listing/series" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-gray-400 hover:text-white text-sm">Todas las series</Link>
                      {ALL_GENRES.map(g => (
                        <Link key={g} href={`/listing/series?genre=${g}`} onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-gray-400 hover:text-white text-sm">{g}</Link>
                      ))}
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>
                <div>
                  <button 
                    onClick={() => setMobileSubmenu(mobileSubmenu === 'movies' ? null : 'movies')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-white/10 text-white font-medium"
                  >
                    Películas
                    <ChevronDown className={cn("w-4 h-4 transition-transform", mobileSubmenu === 'movies' && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                  {mobileSubmenu === 'movies' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pl-4 pb-2 overflow-hidden">
                      <Link href="/listing/peliculas" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-gray-400 hover:text-white text-sm">Todas las películas</Link>
                      {ALL_GENRES.map(g => (
                        <Link key={g} href={`/listing/peliculas?genre=${g}`} onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-gray-400 hover:text-white text-sm">{g}</Link>
                      ))}
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>
                <Link href="/mi-lista" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg hover:bg-white/10 text-white font-medium">
                  Mi lista
                </Link>
                {user && isAdmin && (
                  <Link
                    href="/admin/chat-moderacion"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-white/10 text-amber-400/90 font-medium"
                  >
                    <Shield size={18} className="shrink-0" />
                    Moderación chat
                  </Link>
                )}
                {!user && (
                  <div className="border-t border-white/10 mt-4 pt-4 flex flex-col gap-2">
                    <button 
                      onClick={() => { setAuthInitialMode('login'); setAuthModalOpen(true); setMobileMenuOpen(false); }}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-left"
                    >
                      Iniciar Sesión
                    </button>
                    <button 
                      onClick={() => { setAuthInitialMode('register'); setAuthModalOpen(true); setMobileMenuOpen(false); }}
                      className="w-full px-4 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-left"
                    >
                      Registrarse
                    </button>
                  </div>
                )}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
