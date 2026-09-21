'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';

const buildFavoriteIds = (items = []) => {
  const ids = {};
  for (let i = 0; i < items.length; i++) {
    if (items[i]?.id) {
      ids[items[i].id] = true;
    }
  }
  return ids;
};

export const useFavoritesStore = create(
  persist(
    (set, get) => ({
      favorites: [],
      favoriteIds: {},
      
      syncWithFirestore: async (userId) => {
        if (!userId || !isFirebaseConfigured || !db) return;
        
        try {
          const docRef = doc(db, 'users', userId, 'userData', 'watchlist');
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const cloudFavorites = docSnap.data().items || [];
            const localFavorites = get().favorites;
            
            // Merge local and cloud favorites, avoiding duplicates
            const merged = [...cloudFavorites];
            const cloudIdMap = new Set(cloudFavorites.map(c => c.id));
            localFavorites.forEach(localItem => {
              if (localItem?.id && !cloudIdMap.has(localItem.id)) {
                merged.push(localItem);
                cloudIdMap.add(localItem.id);
              }
            });
            
            set({ favorites: merged, favoriteIds: buildFavoriteIds(merged) });
            await setDoc(docRef, { items: merged }, { merge: true });
          } else {
            // If first time, save local favorites to cloud
            await setDoc(docRef, { items: get().favorites }, { merge: true });
          }
        } catch (err) {
          console.warn('Favorites sync skipped (Firebase not available):', err.message);
        }
      },

      addFavorite: async (item, userId) => {
        const { favorites, favoriteIds } = get();
        if (!favoriteIds?.[item.id] && !favorites.find(f => f.id === item.id)) {
          const newFavorites = [...favorites, item];
          const newIds = { ...favoriteIds, [item.id]: true };
          set({ favorites: newFavorites, favoriteIds: newIds });
          
          if (userId && isFirebaseConfigured && db) {
            try {
              const docRef = doc(db, 'users', userId, 'userData', 'watchlist');
              await setDoc(docRef, { items: newFavorites }, { merge: true });
            } catch (err) {
              console.warn('Favorite add sync failed:', err.message);
            }
          }
        }
      },

      removeFavorite: async (id, userId) => {
        const newFavorites = get().favorites.filter(f => f.id !== id);
        const newIds = { ...get().favoriteIds };
        delete newIds[id];
        set({ favorites: newFavorites, favoriteIds: newIds });
        
        if (userId && isFirebaseConfigured && db) {
          try {
            const docRef = doc(db, 'users', userId, 'userData', 'watchlist');
            await setDoc(docRef, { items: newFavorites }, { merge: true });
          } catch (err) {
            console.warn('Favorite remove sync failed:', err.message);
          }
        }
      },

      isFavorite: (id) => {
        const { favoriteIds, favorites } = get();
        if (favoriteIds && typeof favoriteIds === 'object') {
          return Boolean(favoriteIds[id]);
        }
        return favorites.some(f => f.id === id);
      },

      toggleFavorite: async (item, userId) => {
        if (get().isFavorite(item.id)) {
          await get().removeFavorite(item.id, userId);
        } else {
          await get().addFavorite(item, userId);
        }
      },

      setFavorites: (favorites = []) => {
        set({ favorites, favoriteIds: buildFavoriteIds(favorites) });
      }
    }),
    {
      name: 'luvana-favorites',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.favorites) {
          state.favoriteIds = buildFavoriteIds(state.favorites);
        }
      },
    }
  )
);
