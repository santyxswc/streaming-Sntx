'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';

const POLL_MS = 2500;

function formatTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function ChatModerationPanel() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const initAuth = useAuthStore((s) => s.initAuth);

  const [messages, setMessages] = useState([]);
  const [nextBeforeId, setNextBeforeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [mediaFilter, setMediaFilter] = useState('');
  const [live, setLive] = useState(true);

  const newestIdRef = useRef(null);
  useEffect(() => {
    newestIdRef.current = messages[0]?.id ?? null;
  }, [messages]);

  useEffect(() => {
    return initAuth();
  }, [initAuth]);

  const requestFeed = useCallback(
    async ({ beforeId, afterId, limit = '80' }) => {
      const u = auth.currentUser;
      if (!u) {
        throw new Error('Inicia sesión con una cuenta de administrador.');
      }
      const token = await u.getIdToken();
      const params = new URLSearchParams({ limit });
      if (beforeId) params.set('beforeId', beforeId);
      if (afterId) params.set('afterId', afterId);
      const m = mediaFilter.trim();
      if (m) params.set('mediaId', m);

      const res = await fetch(`/api/chat/moderation/messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `Error ${res.status}`);
      }
      return {
        messages: json.data?.messages ?? [],
        nextBeforeId: json.data?.nextBeforeId ?? null,
      };
    },
    [mediaFilter]
  );

  const fetchPage = useCallback(
    async (beforeId, append) => {
      const { messages: list, nextBeforeId: next } = await requestFeed({
        beforeId,
        limit: '80',
      });
      if (append) {
        setMessages((prev) => [...prev, ...list]);
      } else {
        setMessages(list);
      }
      setNextBeforeId(next);
    },
    [requestFeed]
  );

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchPage(null, false);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage, authLoading]);

  /** Polling silencioso: solo mensajes más nuevos que el último tope conocido */
  useEffect(() => {
    if (authLoading || loading || !live) return;

    const tick = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      try {
        const anchor = newestIdRef.current;
        if (!anchor) {
          const { messages: list, nextBeforeId: next } = await requestFeed({
            limit: '80',
          });
          if (list.length > 0) {
            setMessages(list);
            setNextBeforeId(next);
          }
          return;
        }
        const { messages: incoming } = await requestFeed({
          afterId: anchor,
          limit: '100',
        });
        if (incoming.length === 0) return;
        setMessages((prev) => {
          const ids = new Set(prev.map((x) => x.id));
          const fresh = incoming.filter((x) => !ids.has(x.id));
          if (fresh.length === 0) return prev;
          return [...fresh, ...prev];
        });
      } catch {
        /* no spamear errores en cada tick */
      }
    };

    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [authLoading, loading, live, requestFeed]);

  const onApplyFilter = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchPage(null, false);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const onLoadMore = async () => {
    if (!nextBeforeId || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      await fetchPage(nextBeforeId, true);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Moderación — chat global
        </h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            live
              ? 'bg-emerald-950 text-emerald-300 ring-1 ring-emerald-800'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {live ? 'En vivo (~2,5 s)' : 'Pausado'}
        </span>
        <button
          type="button"
          onClick={() => setLive((v) => !v)}
          className="rounded-md border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
        >
          {live ? 'Pausar actualización' : 'Reanudar'}
        </button>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-zinc-400">
        Mensajes de todas las salas (películas y series). Solo usuarios cuyo UID
        esté en <code className="text-zinc-300">CHAT_ADMIN_UIDS</code> en el
        servidor, o peticiones con{' '}
        <code className="text-zinc-300">X-Moderation-Secret</code>. Los nuevos
        mensajes aparecen arriba automáticamente (consulta incremental al
        servidor).
      </p>
      {user?.email && (
        <p className="mb-4 text-xs text-zinc-500">Sesión: {user.email}</p>
      )}

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="mediaFilter"
            className="mb-1 block text-xs font-medium text-zinc-500"
          >
            Filtrar por contenido (mediaId / slug)
          </label>
          <input
            id="mediaFilter"
            type="text"
            value={mediaFilter}
            onChange={(e) => setMediaFilter(e.target.value)}
            placeholder="Vacío = todo"
            className="w-72 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onApplyFilter}
          disabled={loading}
          className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
        >
          Aplicar filtro
        </button>
      </div>

      {error && (
        <div
          className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {authLoading || loading ? (
        <p className="text-zinc-500">Cargando…</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Sala (mediaId)</th>
                  <th className="px-3 py-2 font-medium">Episodio</th>
                  <th className="px-3 py-2 font-medium">Usuario</th>
                  <th className="px-3 py-2 font-medium">Mensaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {messages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-zinc-500"
                    >
                      No hay mensajes.
                    </td>
                  </tr>
                ) : (
                  messages.map((m) => (
                    <tr key={m.id} className="bg-zinc-950/40">
                      <td className="whitespace-nowrap px-3 py-2 text-zinc-400">
                        {formatTime(m.createdAt)}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-2 font-mono text-xs text-zinc-300">
                        {m.mediaId}
                      </td>
                      <td className="max-w-[100px] truncate px-3 py-2 text-zinc-400">
                        {m.episodeKey ?? '—'}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-zinc-300">
                        {m.authorDisplayName || m.authorUid}
                      </td>
                      <td className="max-w-md px-3 py-2 text-zinc-200">
                        {m.body}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {nextBeforeId && (
            <div className="mt-6">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
              >
                {loadingMore ? 'Cargando…' : 'Cargar más antiguos'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
