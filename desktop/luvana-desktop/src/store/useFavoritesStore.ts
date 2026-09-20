import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface MediaItem {
  id: string;
  title?: string;
  image?: string;
  type?: string;
  year?: number | string;
  rating?: number;
  [key: string]: unknown;
}

interface FavoritesState {
  favorites: MediaItem[];
  syncWithFirestore: (userId: string) => Promise<void>;
  addFavorite: (item: MediaItem, userId?: string) => Promise<void>;
  removeFavorite: (id: string, userId?: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: MediaItem, userId?: string) => Promise<void>;
  setFavorites: (favorites: MediaItem[]) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      syncWithFirestore: async (userId) => {
        if (!userId) return;

        const docRef = doc(db, "users", userId, "userData", "watchlist");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const cloudFavorites = (docSnap.data().items || []) as MediaItem[];
          const localFavorites = get().favorites;

          const merged = [...cloudFavorites];
          localFavorites.forEach((localItem) => {
            if (!merged.find((cloudItem) => cloudItem.id === localItem.id)) {
              merged.push(localItem);
            }
          });

          set({ favorites: merged });
          await setDoc(docRef, { items: merged }, { merge: true });
        } else {
          await setDoc(docRef, { items: get().favorites }, { merge: true });
        }
      },

      addFavorite: async (item, userId) => {
        const { favorites } = get();
        if (!favorites.find((f) => f.id === item.id)) {
          const newFavorites = [...favorites, item];
          set({ favorites: newFavorites });

          if (userId) {
            const docRef = doc(db, "users", userId, "userData", "watchlist");
            await setDoc(docRef, { items: newFavorites }, { merge: true });
          }
        }
      },

      removeFavorite: async (id, userId) => {
        const newFavorites = get().favorites.filter((f) => f.id !== id);
        set({ favorites: newFavorites });

        if (userId) {
          const docRef = doc(db, "users", userId, "userData", "watchlist");
          await setDoc(docRef, { items: newFavorites }, { merge: true });
        }
      },

      isFavorite: (id) => {
        return get().favorites.some((f) => f.id === id);
      },

      toggleFavorite: async (item, userId) => {
        if (get().isFavorite(item.id)) {
          await get().removeFavorite(item.id, userId);
        } else {
          await get().addFavorite(item, userId);
        }
      },

      setFavorites: (favorites) => set({ favorites }),
    }),
    {
      name: "luvana-favorites",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
