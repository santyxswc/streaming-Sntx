import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Feed } from "@/api/client";
import type { FeedPageId } from "@/config/api";

const CACHE_TTL_MS = 60 * 60 * 1000;

interface FeedEntry {
  data: Feed;
  cachedAt: number;
}

interface FeedStoreState {
  feeds: Partial<Record<FeedPageId, FeedEntry>>;
  setFeed: (page: FeedPageId, data: Feed) => void;
  getFreshFeed: (page: FeedPageId) => Feed | null;
}

/** Caché de sesión de los feeds curados, una entrada por página. */
export const useFeedStore = create<FeedStoreState>()(
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
      name: "sntx-feeds",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ feeds: state.feeds }),
    }
  )
);
