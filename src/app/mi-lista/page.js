'use client';
import { useState, useSyncExternalStore } from 'react';
import { useFavoritesStore } from '@/features/favorites/store/useFavoritesStore';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import Navbar from '@/components/layout/Navbar';
import MovieRow from '@/features/catalog/components/MovieRow';
import AuthModal from '@/features/auth/components/AuthModal';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartOff, Sparkles, UserPlus } from 'lucide-react';


export default function MiListaPage() {
  const { favorites } = useFavoritesStore();
  const { user } = useAuthStore();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const openAuth = (mode = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-background text-white">
      <Navbar />
      
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        initialMode={authMode} 
      />

      <div className="pt-32 px-4 md:px-12 pb-20">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">Mi Lista</h1>
            <p className="text-gray-400 mt-2 font-medium">Tus películas, series y animes favoritos en un solo lugar.</p>
          </div>
          
          {!user && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center gap-4 max-w-md"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                <Sparkles size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">¿Quieres guardar esta lista para siempre?</p>
                <p className="text-xs text-gray-400 mt-1">Regístrate para sincronizar tus favoritos en todos tus dispositivos.</p>
                <button 
                  onClick={() => openAuth('register')}
                  className="text-primary text-xs font-black uppercase tracking-widest mt-2 hover:underline"
                >
                  Registrarme ahora
                </button>
              </div>
            </motion.div>
          )}
        </header>

        {favorites.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
            {favorites.map((item) => (
              <div key={item.id} className="w-full">
                <MovieRow.Card item={item} isGrid />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="relative mb-6">
              <HeartOff size={80} className="text-gray-800" />
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-2 -right-2 text-primary"
              >
                <Sparkles size={24} />
              </motion.div>
            </div>
            <p className="text-2xl font-black uppercase italic tracking-tighter text-white">Tu lista está muy silenciosa</p>
            <p className="text-gray-500 mt-2 max-w-xs text-center font-medium">
              Explora nuestro catálogo y presiona el icono de <span className="text-primary text-lg ml-1">+</span> para agregar contenido aquí.
            </p>
            
            {!user && (
              <button 
                onClick={() => openAuth('register')}
                className="mt-8 flex items-center gap-2 px-8 py-3 bg-white text-black rounded-lg font-black uppercase tracking-widest hover:bg-gray-200 transition-premium shadow-xl"
              >
                <UserPlus size={18} /> Crear cuenta para empezar
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
