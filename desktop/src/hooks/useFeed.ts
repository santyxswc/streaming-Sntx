import { useEffect, useState } from "react";
import { fetchFeed } from "@/api/client";
import type { FeedPageId } from "@/config/api";
import { useFeedStore } from "@/store/useFeedStore";

/** Feed curado (títulos populares del catálogo con tráiler) de una página. */
export function useFeed(page: FeedPageId) {
  const feed = useFeedStore((s) => s.feeds[page]?.data ?? null);
  const setFeed = useFeedStore((s) => s.setFeed);
  const [failed, setFailed] = useState(false);
  const [seed] = useState(() => Math.random());

  useEffect(() => {
    if (useFeedStore.getState().getFreshFeed(page)) return;
    let cancelled = false;
    fetchFeed(page)
      .then((data) => !cancelled && setFeed(page, data))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [page, setFeed]);

  const featured = feed?.featured ?? [];
  return {
    sections: feed?.sections ?? [],
    featured: featured[Math.floor(seed * featured.length)] ?? feed?.sections[0]?.items[0] ?? null,
    loading: !feed && !failed,
    error: !feed && failed,
  };
}
