'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  MoreVertical,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

const POLL_MS = 3500;

/** Por encima del modo cine (z-100), navbar y fullscreen en móvil — portal a document.body */
const Z_CHAT_BACKDROP = 'z-[10000]';
const Z_CHAT_PANEL = 'z-[10020]';
const Z_CHAT_FAB = 'z-[10030]';
const Z_CHAT_MODAL = 'z-[10040]';

function isUuid(s) {
  return (
    typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
  );
}

export default function CatalogChatPopup({
  mediaId,
  episodeKey = null,
  contentTitle = '',
  /** Reproductor abierto: panel compacto que no tapa el vídeo (escritorio + móvil). */
  playerMode = false,
  onOpenAuth,
}) {
  const { user } = useAuthStore();
  const [portalTarget, setPortalTarget] = useState(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [lastMessageId, setLastMessageId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState('');
  const [chatName, setChatName] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState(null);
  const [nameSaving, setNameSaving] = useState(false);
  /** idle | checking | available | unavailable | invalid */
  const [nameAvailability, setNameAvailability] = useState('idle');
  const listRef = useRef(null);
  const menuRef = useRef(null);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  };

  const buildQuery = useCallback(
    (afterId) => {
      const p = new URLSearchParams({ mediaId });
      if (episodeKey != null && episodeKey !== '') {
        p.set('episodeKey', String(episodeKey));
      }
      if (afterId && isUuid(afterId)) {
        p.set('afterId', afterId);
      }
      p.set('limit', '80');
      return p.toString();
    },
    [mediaId, episodeKey]
  );

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/messages?${buildQuery(null)}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'No se pudo cargar el chat');
        return;
      }
      const list = json.data.messages || [];
      setMessages(list);
      const last = list.length ? list[list.length - 1] : null;
      setLastMessageId(last?.id ?? null);
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const fetchNewer = useCallback(async () => {
    if (!lastMessageId || !isUuid(lastMessageId)) return;
    try {
      const res = await fetch(`/api/chat/messages?${buildQuery(lastMessageId)}`);
      const json = await res.json();
      if (!json.success || !json.data?.messages?.length) return;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        for (const m of json.data.messages) {
          if (!ids.has(m.id)) {
            merged.push(m);
            ids.add(m.id);
          }
        }
        merged.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return merged;
      });
      const last = json.data.messages[json.data.messages.length - 1];
      setLastMessageId(last.id);
    } catch {
      /* silencioso en poll */
    }
  }, [buildQuery, lastMessageId]);

  useEffect(() => {
    if (!open) return;
    fetchInitial();
  }, [open, fetchInitial, mediaId, episodeKey]);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      if (lastMessageId && isUuid(lastMessageId)) {
        fetchNewer();
      } else {
        fetchInitial();
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [open, lastMessageId, fetchNewer, fetchInitial]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, open]);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!open || !user) {
      setChatName(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/chat/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!cancelled && json.success && json.data?.chatName) {
          setChatName(json.data.chatName);
        }
      } catch {
        /* */
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (ev) => {
      if (menuRef.current && !menuRef.current.contains(ev.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  useEffect(() => {
    if (!nameModalOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setNameModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nameModalOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !user) return;
    setSending(true);
    setError(null);
    try {
      let token;
      try {
        token = await user.getIdToken();
      } catch {
        setError('No se pudo validar la sesión. Cierra sesión y vuelve a entrar.');
        return;
      }

      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mediaId,
          episodeKey: episodeKey ?? null,
          body: text,
        }),
      });

      const raw = await res.text();
      let json;
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        setError(
          `El servidor respondió de forma inesperada (${res.status}). ¿Migraciones de Neon y FIREBASE_SERVICE_ACCOUNT configurados?`
        );
        return;
      }

      if (!json.success) {
        setError(
          json.error ||
            json.message ||
            (res.status === 401
              ? 'Sesión inválida o el servidor no puede verificar el login (revisa FIREBASE_SERVICE_ACCOUNT en .env.local).'
              : 'No se pudo enviar el mensaje')
        );
        return;
      }

      if (!json.data) {
        setError('Respuesta incompleta del servidor');
        return;
      }

      setDraft('');
      const msg = json.data;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const next = [...prev, msg];
        next.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return next;
      });
      setLastMessageId(msg.id);
      if (msg.authorDisplayName) setChatName(msg.authorDisplayName);
    } catch {
      setError(
        'No hay conexión o la petición falló. Comprueba tu red y que el servidor esté en marcha.'
      );
    } finally {
      setSending(false);
    }
  };

  const openNameModal = () => {
    setNameDraft(chatName || '');
    setNameError(null);
    setNameAvailability('idle');
    setNameModalOpen(true);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!nameModalOpen || !user) return;
    const q = nameDraft.trim();
    if (q.length < 3) {
      setNameAvailability('idle');
      return;
    }
    if (
      chatName &&
      q.toLowerCase() === chatName.trim().toLowerCase()
    ) {
      setNameAvailability('available');
      return;
    }
    setNameAvailability('checking');
    const t = setTimeout(async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `/api/chat/profile/available?name=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        if (!json.success) {
          setNameAvailability('invalid');
          return;
        }
        setNameAvailability(
          json.data.available ? 'available' : 'unavailable'
        );
      } catch {
        setNameAvailability('idle');
      }
    }, 420);
    return () => clearTimeout(t);
  }, [nameDraft, nameModalOpen, user, chatName]);

  const handleSaveChatName = async (e) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = nameDraft.trim();
    if (trimmed.length < 3) {
      setNameError('Mínimo 3 caracteres');
      return;
    }
    if (
      chatName &&
      trimmed.toLowerCase() === chatName.trim().toLowerCase()
    ) {
      setNameModalOpen(false);
      return;
    }
    if (nameAvailability === 'unavailable' || nameAvailability === 'invalid') {
      setNameError('El nombre no está disponible o no es válido');
      return;
    }
    if (nameAvailability === 'checking') {
      setNameError('Espera a que termine la comprobación');
      return;
    }
    setNameSaving(true);
    setNameError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/chat/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chatName: trimmed }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNameError(json.error || json.message || 'No se pudo guardar');
        return;
      }
      setChatName(json.data.chatName);
      setNameModalOpen(false);
    } catch {
      setNameError('Error de red');
    } finally {
      setNameSaving(false);
    }
  };

  const trimmedNameDraft = nameDraft.trim();
  const sameNameAsNow =
    chatName &&
    trimmedNameDraft.length >= 3 &&
    trimmedNameDraft.toLowerCase() === chatName.trim().toLowerCase();
  const canSubmitName =
    trimmedNameDraft.length >= 3 &&
    nameAvailability !== 'checking' &&
    (sameNameAsNow || nameAvailability === 'available');

  const roomHint =
    episodeKey != null && episodeKey !== ''
      ? 'Chat de este episodio'
      : 'Chat de la comunidad';

  const zFab = Z_CHAT_FAB;
  const fabBottom = playerMode
    ? 'bottom-4 max-[767px]:bottom-[max(1rem,env(safe-area-inset-bottom))] md:bottom-8'
    : 'bottom-24 max-[767px]:bottom-[max(5.5rem,env(safe-area-inset-bottom))] md:bottom-24';

  const ui = (
    <>
      {!open && (
        <motion.button
          type="button"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => setOpen(true)}
          className={cn(
            'fixed right-4 md:right-10 flex items-center gap-2 rounded-full bg-primary px-3 py-2.5 sm:px-4 sm:py-3 font-black uppercase text-[10px] sm:text-xs tracking-widest text-white shadow-2xl shadow-primary/30 border border-white/10 hover:bg-primary/90 transition-premium',
            zFab,
            fabBottom
          )}
          aria-label="Abrir chat de la comunidad"
        >
          <MessageCircle size={18} strokeWidth={2.5} className="sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Chat</span>
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <>
            {!playerMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'fixed inset-0 bg-black/60 backdrop-blur-sm md:bg-black/40',
                  Z_CHAT_BACKDROP
                )}
                onClick={() => setOpen(false)}
                aria-hidden
              />
            )}
            <motion.aside
              key={playerMode ? 'dock' : 'drawer'}
              initial={
                playerMode
                  ? { opacity: 0, y: 24, scale: 0.98 }
                  : { x: '100%' }
              }
              animate={
                playerMode
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { x: 0 }
              }
              exit={
                playerMode
                  ? { opacity: 0, y: 16, scale: 0.98 }
                  : { x: '100%' }
              }
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'flex min-h-0 flex-col border border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl',
                playerMode
                  ? [
                      'fixed max-[767px]:left-2 max-[767px]:right-2 max-[767px]:bottom-0 max-[767px]:h-[min(42dvh,360px)] max-[767px]:w-auto max-[767px]:rounded-t-3xl max-[767px]:rounded-b-none max-[767px]:border-b-0',
                      'md:left-auto md:right-6 md:bottom-24 md:top-auto md:h-[min(48vh,440px)] md:w-[min(calc(100vw-2rem),380px)] md:rounded-2xl',
                      Z_CHAT_PANEL,
                    ]
                  : cn(
                      'fixed right-0 top-0 h-full w-full max-w-md border-l border-white/10',
                      Z_CHAT_PANEL
                    )
              )}
            >
              {playerMode && (
                <div
                  className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20 md:hidden"
                  aria-hidden
                />
              )}
              <header
                className={cn(
                  'flex shrink-0 items-center justify-between border-b border-white/10',
                  playerMode ? 'px-3 py-2 md:px-4 md:py-2.5' : 'px-4 py-4 md:px-6'
                )}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                    {roomHint}
                  </p>
                  <h2
                    className={cn(
                      'font-black uppercase tracking-tighter text-white line-clamp-1',
                      playerMode ? 'text-sm md:text-base' : 'text-lg'
                    )}
                  >
                    {contentTitle || 'Chat'}
                  </h2>
                  {user && (
                    <p className="mt-0.5 truncate text-[11px] font-medium text-gray-500">
                      {profileLoading && !chatName
                        ? 'Preparando tu apodo…'
                        : chatName
                          ? (
                              <>
                                <span className="text-gray-600">Tú: </span>
                                <span className="text-primary/90">{chatName}</span>
                              </>
                            )
                          : null}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {user && (
                    <div className="relative" ref={menuRef}>
                      <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        className="rounded-xl border border-white/10 p-2 text-white hover:bg-white/10 transition-premium"
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                        aria-label="Opciones del chat"
                      >
                        <MoreVertical size={18} />
                      </button>
                      {menuOpen && (
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-[10050] mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-white/10 bg-[#141414] py-1 shadow-2xl"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold text-white hover:bg-white/10"
                            onClick={openNameModal}
                          >
                            <Pencil size={16} className="text-primary" />
                            Cambiar nombre
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-white/10 p-2 text-white hover:bg-white/10 transition-premium md:p-2.5"
                    aria-label="Cerrar chat"
                  >
                    <X size={18} className="md:w-5 md:h-5" />
                  </button>
                </div>
              </header>

              <div
                ref={listRef}
                className={cn(
                  'min-h-0 flex-1 overflow-y-auto',
                  playerMode ? 'px-3 py-2 md:px-4 md:py-3' : 'px-4 py-3 md:px-6'
                )}
              >
                {loading && (
                  <div
                    className={cn(
                      'flex justify-center text-primary',
                      playerMode ? 'py-6' : 'py-12'
                    )}
                  >
                    <Loader2 className="animate-spin" size={playerMode ? 28 : 32} />
                  </div>
                )}
                {!loading && messages.length === 0 && !error && (
                  <p
                    className={cn(
                      'text-center text-sm text-gray-500 font-medium',
                      playerMode ? 'py-6 md:py-8' : 'py-12'
                    )}
                  >
                    Sé el primero en escribir sobre este contenido.
                  </p>
                )}
                {error && (
                  <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </p>
                )}
                <ul
                  className={cn(
                    'flex flex-col pb-2',
                    playerMode ? 'gap-2 pb-1' : 'gap-3 pb-4'
                  )}
                >
                  {messages.map((m) => {
                    const mine = user && m.authorUid === user.uid;
                    return (
                      <li
                        key={m.id}
                        className={cn(
                          'max-w-[92%] rounded-2xl px-3 py-2 text-sm',
                          mine
                            ? 'ml-auto bg-primary/25 border border-primary/30 text-white'
                            : 'mr-auto bg-white/5 border border-white/10 text-gray-200'
                        )}
                      >
                        <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                          <span className="text-primary/90">
                            {m.authorDisplayName || 'Usuario'}
                          </span>
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {m.body}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <footer
                className={cn(
                  'shrink-0 border-t border-white/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
                  playerMode ? 'p-2.5 md:p-4' : 'p-4 md:p-6'
                )}
              >
                {user ? (
                  <form onSubmit={handleSend} className="flex gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                      placeholder="Escribe un mensaje..."
                      maxLength={500}
                      rows={playerMode ? 1 : 2}
                      className={cn(
                        'min-h-[40px] flex-1 resize-none rounded-xl border border-white/15 bg-black/40 px-2.5 py-2 text-sm text-white placeholder:text-gray-600 focus:border-primary focus:outline-none md:px-3',
                        playerMode ? 'md:min-h-[44px]' : 'min-h-[44px]'
                      )}
                    />
                    <button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      className="self-end rounded-xl bg-primary px-4 py-3 text-white hover:bg-primary/90 disabled:opacity-40 transition-premium"
                      aria-label="Enviar"
                    >
                      {sending ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <Send size={20} />
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <p className="text-sm text-gray-400">
                      Inicia sesión para participar en el chat.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAuth?.('login');
                        setOpen(false);
                      }}
                      className="rounded-lg bg-white py-3 font-black uppercase text-xs tracking-widest text-black hover:bg-gray-200 transition-premium"
                    >
                      Iniciar sesión
                    </button>
                  </div>
                )}
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );

  const nameModal =
    nameModalOpen && user ? (
      <div
        className={cn(
          'fixed inset-0 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center',
          Z_CHAT_MODAL
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-name-title"
        onClick={() => setNameModalOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            id="chat-name-title"
            className="font-black uppercase tracking-tight text-white"
          >
            Tu nombre en el chat
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            Se asigna uno aleatorio al empezar. Puedes cambiarlo aquí; debe ser único.
          </p>
          <form onSubmit={handleSaveChatName} className="mt-4 space-y-3">
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={24}
              className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-primary focus:outline-none"
              placeholder="Ej. CinefiloMadrid"
              autoComplete="username"
            />
            {trimmedNameDraft.length >= 3 && (
              <p className="text-xs font-medium">
                {sameNameAsNow && (
                  <span className="text-emerald-400">Es tu nombre actual.</span>
                )}
                {!sameNameAsNow && nameAvailability === 'checking' && (
                  <span className="text-gray-500">Comprobando disponibilidad…</span>
                )}
                {!sameNameAsNow && nameAvailability === 'available' && (
                  <span className="text-emerald-400">Disponible</span>
                )}
                {!sameNameAsNow && nameAvailability === 'unavailable' && (
                  <span className="text-amber-400">Ya está en uso. Prueba otro.</span>
                )}
                {!sameNameAsNow && nameAvailability === 'invalid' && (
                  <span className="text-red-400">No permitido o no válido</span>
                )}
              </p>
            )}
            {nameError && (
              <p className="text-sm text-red-400">{nameError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setNameModalOpen(false)}
                className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm font-black uppercase tracking-widest text-gray-300 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={nameSaving || !canSubmitName}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-black uppercase tracking-widest text-white hover:bg-primary/90 disabled:opacity-40"
              >
                {nameSaving ? (
                  <Loader2 className="mx-auto animate-spin" size={18} />
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    ) : null;

  if (!portalTarget) return null;
  return createPortal(
    <>
      {ui}
      {nameModal}
    </>,
    portalTarget
  );
}
