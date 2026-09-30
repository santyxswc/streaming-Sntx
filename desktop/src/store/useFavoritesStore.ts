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

const buildFavoriteIds = (items: MediaItem[] = []): Record<string, boolean> => {
  const ids: Record<string, boolean> = {};
  for (let i = 0; i < items.length; i++) {
    if (items[i]?.id) {
      ids[items[i].id] = true;
    }
  }
  return ids;
};

interface FavoritesState {
  favorites: MediaItem[];
  favoriteIds: Record<string, boolean>;
  syncWithFirestore: (userId: string) => Promise<void>;
  addFavorite: (item: MediaItem, userId?: string) => Promise<void>;
  removeFavorite: (id: string, userId?: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: MediaItem, userId?: string) => Promise<void>;
  setFavorites: (favorites: MediaItem[]) => void;
}

/**
 * Selector de "¿es favorito?" que SÍ suscribe al componente a los cambios: seleccionar la función
 * `isFavorite` (`(s) => s.isFavorite`) devuelve siempre la misma referencia, así que el componente
 * no se repinta al añadir o quitar y el icono queda desfasado hasta que otra cosa lo repinta.
 */
export const selectIsFavorite =
  (id: string | undefined | null) =>
  (s: Pick<FavoritesState, "favorites" | "favoriteIds">): boolean => {
    if (!id) return false;
    if (s.favoriteIds && typeof s.favoriteIds === "object") return Boolean(s.favoriteIds[id]);
    return s.favorites.some((f) => f.id === id);
  };

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      favoriteIds: {},

      syncWithFirestore: async (userId) => {
        if (!userId) return;

        const docRef = doc(db, "users", userId, "userData", "watchlist");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const cloudFavorites = (docSnap.data().items || []) as MediaItem[];
          const localFavorites = get().favorites;

          const merged = [...cloudFavorites];
          const cloudIdMap = new Set(cloudFavorites.map((c) => c.id));
          localFavorites.forEach((localItem) => {
            if (localItem?.id && !cloudIdMap.has(localItem.id)) {
              merged.push(localItem);
              cloudIdMap.add(localItem.id);
            }
          });

          set({ favorites: merged, favoriteIds: buildFavoriteIds(merged) });
          await setDoc(docRef, { items: merged }, { merge: true });
        } else {
          await setDoc(docRef, { items: get().favorites }, { merge: true });
        }
      },

      addFavorite: async (item, userId) => {
        const { favorites, favoriteIds } = get();
        if (!favoriteIds?.[item.id] && !favorites.find((f) => f.id === item.id)) {
          const newFavorites = [...favorites, item];
          const newIds = { ...favoriteIds, [item.id]: true };
          set({ favorites: newFavorites, favoriteIds: newIds });

          if (userId) {
            const docRef = doc(db, "users", userId, "userData", "watchlist");
            await setDoc(docRef, { items: newFavorites }, { merge: true });
          }
        }
      },

      removeFavorite: async (id, userId) => {
        const newFavorites = get().favorites.filter((f) => f.id !== id);
        const newIds = { ...get().favoriteIds };
        delete newIds[id];
        set({ favorites: newFavorites, favoriteIds: newIds });

        if (userId) {
          const docRef = doc(db, "users", userId, "userData", "watchlist");
          await setDoc(docRef, { items: newFavorites }, { merge: true });
        }
      },

      isFavorite: (id) => {
        const { favoriteIds, favorites } = get();
        if (favoriteIds && typeof favoriteIds === "object") {
          return Boolean(favoriteIds[id]);
        }
        return favorites.some((f) => f.id === id);
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
      },
    }),
    {
      name: "sntx-favorites",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.favorites) {
          state.favoriteIds = buildFavoriteIds(state.favorites);
        }
      },
    }
  )
);
