'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const CACHE_TTL_MS = 60 * 60 * 1000;

const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/**
 * Caché de sesión de los feeds curados, una entrada por página
 * (home, movies, series) con su propia marca de tiempo.
 */
export const useFeedStore = create(
  persist(
    (set, get) => ({
      feeds: {},
      setFeed: (page, data) =>
        set((state) => ({ feeds: { ...state.feeds, [page]: { data, cachedAt: Date.now() } } })),
      getFreshFeed: (page) => {
        const entry = get().feeds[page];
        return entry && Date.now() - entry.cachedAt < CACHE_TTL_MS ? entry.data : null;
      },
    }),
    {
      name: 'sntx-feeds',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? sessionStorage : noopStorage)),
      partialize: (state) => ({ feeds: state.feeds }),
    }
  )
);
