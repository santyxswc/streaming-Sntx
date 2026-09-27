'use client';
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Play, Plus, Check, ChevronDown } from 'lucide-react';
import { useFavoritesStore } from '@/features/favorites/store/useFavoritesStore';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import Link from 'next/link';
import MediaImage from '@/components/ui/MediaImage';

const ItemPreview = ({ item, isVisible, x, y, onMouseEnter, onMouseLeave }) => {
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const user = useAuthStore((s) => s.user);

  if (!isVisible || !item) return null;

  const detailUrl = `/${item.type === 'movie' ? 'peliculas' : item.type === 'series' ? 'series' : 'anime'}/${item.id}`;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-[100] w-[350px] bg-[#181818] rounded-lg shadow-2xl overflow-hidden pointer-events-auto"
      style={{ left: x, top: y }}
    >
      <div className="relative aspect-video">
        <MediaImage
          src={item.backdrop || item.image}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent" />
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link href={detailUrl}>
            <button title="Ver tráiler" className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-white/80 transition-premium">
              <Play size={20} fill="black" className="ml-1" />
            </button>
          </Link>
          <button 
            onClick={() => toggleFavorite(item, user?.uid)}
            className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center hover:border-white transition-premium"
          >
            {isFavorite(item.id) ? <Check size={20} /> : <Plus size={20} />}
          </button>
          <div className="flex-1" />
          <Link href={detailUrl}>
            <button className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center hover:border-white transition-premium">
              <ChevronDown size={20} />
            </button>
          </Link>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-green-400">98% para ti</span>
            <span className="border border-white/40 px-1 rounded">{item.rating} IMDB</span>
            <span>{item.year}</span>
          </div>
          <p className="text-sm line-clamp-2 text-gray-300">
            {item.overview}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(ItemPreview);
