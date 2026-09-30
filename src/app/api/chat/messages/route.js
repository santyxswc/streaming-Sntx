import { NextResponse } from 'next/server';
import { rateLimit, rateLimitKey } from '@/server/http/rateLimit';
import { verifyBearerUid, formatVerifyAuthError } from '@/server/db/firebaseAdmin';
import {
  listMessages,
  appendMessage,
  mediaExists,
  getOrCreateProfile,
} from '@/server/chat/chatRepository';

const MAX_BODY = 500;
const MIN_BODY = 1;

function badRequest(message) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

function parseEpisodeKey(searchParams) {
  const raw = searchParams.get('episodeKey');
  if (raw === null || raw === '') return null;
  if (raw.length > 64) return null;
  return raw;
}

function isUuid(s) {
  return (
    typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s
    )
  );
}

/**
 * GET — historial reciente o mensajes nuevos si se pasa afterId (polling).
 * Lectura pública (sin token); limitada por rate limit.
 */
export async function GET(req) {
  const limited = await rateLimit(req, {
    limit: 45,
    windowMs: 60_000,
    id: 'chat-messages-get',
  });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const mediaId = searchParams.get('mediaId');
  const episodeKey = parseEpisodeKey(searchParams);
  const afterRaw = searchParams.get('afterId');
  const afterId = afterRaw && isUuid(afterRaw) ? afterRaw : null;
  const limitRaw = searchParams.get('limit');

  if (!mediaId || mediaId.length > 256) {
    return badRequest('mediaId inválido');
  }

  if (searchParams.has('episodeKey') && episodeKey === null) {
    return badRequest('episodeKey inválido');
  }

  if (searchParams.has('afterId') && afterRaw && !afterId) {
    return badRequest('afterId inválido');
  }

  let limit = Number(limitRaw);
  if (Number.isNaN(limit)) limit = 50;
  limit = Math.min(Math.max(limit, 1), 100);

  try {
    const exists = await mediaExists(mediaId);
    if (!exists) {
      return NextResponse.json(
        { success: false, error: 'Contenido no encontrado' },
        { status: 404 }
      );
    }

    const { messages, lastId } = await listMessages({
      mediaId,
      episodeKey,
      afterId,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: { messages, lastId },
    });
  } catch (e) {
    console.error('GET /api/chat/messages', e);
    return NextResponse.json(
      { success: false, error: 'Error al cargar el chat' },
      { status: 500 }
    );
  }
}

/**
 * POST — enviar mensaje (requiere Firebase ID token).
 */
export async function POST(req) {
  const ipLimited = await rateLimit(req, {
    limit: 45,
    windowMs: 60_000,
    id: 'chat-messages-post-ip',
  });
  if (ipLimited) return ipLimited;

  let uid;
  try {
    uid = await verifyBearerUid(req.headers.get('authorization'), { checkRevoked: true });
  } catch (e) {
    console.error('verifyBearerUid', e);
    return NextResponse.json(
      { success: false, error: formatVerifyAuthError(e) },
      { status: 401 }
    );
  }

  if (!uid) {
    return NextResponse.json(
      { success: false, error: 'Debes iniciar sesión' },
      { status: 401 }
    );
  }

  const uidLimited = await rateLimitKey(`chat:messages:post:${uid}`, {
    limit: 55,
    windowMs: 60_000,
    message: 'Estás enviando mensajes demasiado rápido. Espera un momento.',
  });
  if (uidLimited) return uidLimited;

  let body;
  try {
    body = await req.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const mediaId = body.mediaId;
  const episodeKey =
    body.episodeKey === undefined || body.episodeKey === null || body.episodeKey === ''
      ? null
      : String(body.episodeKey);
  const text = typeof body.body === 'string' ? body.body.trim() : '';

  if (!mediaId || mediaId.length > 256) {
    return badRequest('mediaId inválido');
  }
  if (episodeKey !== null && episodeKey.length > 64) {
    return badRequest('episodeKey inválido');
  }
  if (text.length < MIN_BODY || text.length > MAX_BODY) {
    return badRequest(`El mensaje debe tener entre ${MIN_BODY} y ${MAX_BODY} caracteres`);
  }

  try {
    const [exists, profile] = await Promise.all([
      mediaExists(mediaId),
      getOrCreateProfile(uid),
    ]);
    if (!exists) {
      return NextResponse.json(
        { success: false, error: 'Contenido no encontrado' },
        { status: 404 }
      );
    }

    const authorDisplayName = profile.chatName;

    const message = await appendMessage({
      mediaId,
      episodeKey,
      authorUid: uid,
      authorDisplayName,
      body: text,
    });

    return NextResponse.json({ success: true, data: message });
  } catch (e) {
    console.error('POST /api/chat/messages', e);
    const hint =
      process.env.NODE_ENV === 'development' && e?.message
        ? ` (${e.message})`
        : '';
    return NextResponse.json(
      {
        success: false,
        error: `No se pudo enviar el mensaje${hint}`,
      },
      { status: 500 }
    );
  }
}
