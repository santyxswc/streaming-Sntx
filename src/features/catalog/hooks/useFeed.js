'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useFeedStore } from '@/features/catalog/store/useFeedStore';

const noopSubscribe = () => () => {};

/**
 * Feed curado de una página (`/api/feed/:page`), cacheado por sesión.
 * El destacado se elige al azar una vez por visita entre los candidatos.
 * @param {'home'|'movies'|'series'} page
 */
export function useFeed(page) {
  const cached = useFeedStore((s) => s.feeds[page]?.data ?? null);
  const setFeed = useFeedStore((s) => s.setFeed);
  const [failed, setFailed] = useState(false);
  const [seed] = useState(() => Math.random());
  // El store se rehidrata desde sessionStorage solo en el cliente: hasta
  // hidratar se renderiza igual que en el servidor (estado de carga).
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    if (useFeedStore.getState().getFreshFeed(page)) return;
    const controller = new AbortController();
    fetch(`/api/feed/${page}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((body) => {
        if (!body.success) throw new Error(body.error);
        setFeed(page, body.data);
        setFailed(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setFailed(true);
      });
    return () => controller.abort();
  }, [page, setFeed]);

  if (!hydrated) return { sections: [], featured: null, loading: true, error: false };

  const featured = cached?.featured ?? [];
  return {
    sections: cached?.sections ?? [],
    featured: featured[Math.floor(seed * featured.length)] ?? cached?.sections?.[0]?.items?.[0] ?? null,
    loading: !cached && !failed,
    error: !cached && failed,
  };
}
