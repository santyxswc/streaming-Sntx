'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';

export const useFavoritesStore = create(
  persist(
    (set, get) => ({
      favorites: [],
      
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
            localFavorites.forEach(localItem => {
              if (!merged.find(cloudItem => cloudItem.id === localItem.id)) {
                merged.push(localItem);
              }
            });
            
            set({ favorites: merged });
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
        const { favorites } = get();
        if (!favorites.find(f => f.id === item.id)) {
          const newFavorites = [...favorites, item];
          set({ favorites: newFavorites });
          
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
        set({ favorites: newFavorites });
        
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
        return get().favorites.some(f => f.id === id);
      },

      toggleFavorite: async (item, userId) => {
        if (get().isFavorite(item.id)) {
          await get().removeFavorite(item.id, userId);
        } else {
          await get().addFavorite(item, userId);
        }
      },

      setFavorites: (favorites) => set({ favorites })
    }),
    {
      name: 'luvana-favorites',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
