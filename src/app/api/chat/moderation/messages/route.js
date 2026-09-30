import { NextResponse } from 'next/server';
import { rateLimit } from '@/server/http/rateLimit';
import { isChatModeratorAuthorized } from '@/server/chat/moderationAuth';
import { listGlobalFeed } from '@/server/chat/chatRepository';
import { getChatProvider } from '@/server/config/chatEnv';
import { logger } from '@/server/observability/logger';

function isUuid(s) {
  return (
    typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s
    )
  );
}

/**
 * GET — feed global de mensajes (moderación). Requiere auth de moderador.
 * Query: limit (1–100), beforeId (página hacia atrás), afterId (solo mensajes nuevos; tiempo real), mediaId (filtro sala).
 */
export async function GET(req) {
  const limited = await rateLimit(req, {
    limit: 120,
    windowMs: 60_000,
    id: 'chat-moderation-get',
  });
  if (limited) return limited;

  const auth = await isChatModeratorAuthorized(req);
  if (!auth.ok) {
    if (auth.reason === 'not_configured') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Moderación no configurada. Define CHAT_MODERATION_SECRET y/o CHAT_ADMIN_UIDS en el servidor.',
        },
        { status: 503 }
      );
    }
    if (auth.reason === 'bad_secret') {
      return NextResponse.json(
        { success: false, error: 'Clave de moderación inválida' },
        { status: 401 }
      );
    }
    if (auth.reason === 'no_token' || auth.reason === 'invalid_token') {
      return NextResponse.json(
        {
          success: false,
          error:
            auth.reason === 'invalid_token'
              ? 'Sesión inválida o expirada. Cierra sesión y vuelve a entrar.'
              : 'Falta iniciar sesión.',
        },
        { status: 401 }
      );
    }
    if (auth.reason === 'forbidden') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Sin permiso de moderación. Añade tu UID de Firebase a CHAT_ADMIN_UIDS en .env.local (o en Vercel) y reinicia el servidor.',
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'No autorizado' },
      { status: 403 }
    );
  }

  if (getChatProvider() !== 'neon') {
    return NextResponse.json(
      {
        success: false,
        error:
          'El feed global de moderación solo está disponible con CHAT_PROVIDER=neon',
      },
      { status: 501 }
    );
  }

  const { searchParams } = new URL(req.url);
  const beforeRaw = searchParams.get('beforeId');
  const beforeId = beforeRaw && isUuid(beforeRaw) ? beforeRaw : null;
  if (searchParams.has('beforeId') && beforeRaw && !beforeId) {
    return NextResponse.json(
      { success: false, error: 'beforeId inválido' },
      { status: 400 }
    );
  }

  const afterRaw = searchParams.get('afterId');
  const afterId = afterRaw && isUuid(afterRaw) ? afterRaw : null;
  if (searchParams.has('afterId') && afterRaw && !afterId) {
    return NextResponse.json(
      { success: false, error: 'afterId inválido' },
      { status: 400 }
    );
  }
  if (beforeId && afterId) {
    return NextResponse.json(
      { success: false, error: 'Usa solo beforeId o afterId, no ambos' },
      { status: 400 }
    );
  }

  const mediaRaw = searchParams.get('mediaId');
  const mediaId =
    mediaRaw && mediaRaw.length > 0 && mediaRaw.length <= 256 ? mediaRaw : null;
  if (searchParams.has('mediaId') && mediaRaw !== null && mediaRaw !== '' && !mediaId) {
    return NextResponse.json(
      { success: false, error: 'mediaId inválido' },
      { status: 400 }
    );
  }

  let limit = Number(searchParams.get('limit'));
  if (Number.isNaN(limit)) limit = 50;
  limit = Math.min(Math.max(limit, 1), 100);

  try {
    const { messages, nextBeforeId } = await listGlobalFeed({
      limit,
      beforeId,
      afterId,
      mediaId,
    });
    return NextResponse.json({
      success: true,
      data: { messages, nextBeforeId },
    });
  } catch (e) {
    logger.error('chat_moderation.list_failed', { route: 'chat-moderation-messages', err: e });
    return NextResponse.json(
      { success: false, error: 'Error al cargar el feed de moderación' },
      { status: 500 }
    );
  }
}
