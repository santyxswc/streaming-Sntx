'use client';
import { useEffect, useState } from 'react';

/**
 * Tráilers de YouTube de un título, resueltos por /api/media/trailer.
 * @param {{ id: string, type: 'movie'|'series' } | null} item
 * @returns {{ trailers: Array<{ key: string, name: string, language: string, official: boolean, type: string }>, loading: boolean }}
 */
export function useTrailers(item) {
  const id = item?.id;
  const type = item?.type === 'series' ? 'series' : 'movie';
  const [state, setState] = useState({ key: null, trailers: [] });

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const key = `${type}:${id}`;

    fetch(`/api/media/trailer?type=${type}&id=${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setState({ key, trailers: data.success ? data.data.trailers : [] }))
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ key, trailers: [] });
      });

    return () => controller.abort();
  }, [id, type]);

  const current = state.key === `${type}:${id}`;
  return { trailers: current ? state.trailers : [], loading: Boolean(id) && !current };
}
