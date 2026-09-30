import { NextResponse } from 'next/server';
import { rateLimit, rateLimitKey } from '@/server/http/rateLimit';
import { verifyBearerUid, formatVerifyAuthError } from '@/server/db/firebaseAdmin';
import { isChatNameAvailable } from '@/server/chat/chatRepository';
import { logger } from '@/server/observability/logger';

/**
 * GET ?name= — comprueba disponibilidad del apodo antes de guardar (misma lógica que PATCH).
 * Requiere sesión; límites estrictos anti-abuso / enumeración.
 */
export async function GET(req) {
  const ipLimited = await rateLimit(req, {
    limit: 45,
    windowMs: 60_000,
    id: 'chat-profile-avail-ip',
  });
  if (ipLimited) return ipLimited;

  let uid;
  try {
    uid = await verifyBearerUid(req.headers.get('authorization'));
  } catch (e) {
    logger.warn('auth.token_rejected', { route: 'chat-profile-available', code: e?.code });
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

  const uidLimited = await rateLimitKey(`chat:avail:${uid}`, {
    limit: 50,
    windowMs: 60_000,
  });
  if (uidLimited) return uidLimited;

  const name = new URL(req.url).searchParams.get('name');
  if (name === null || name === '') {
    return NextResponse.json(
      { success: false, error: 'Indica el parámetro name' },
      { status: 400 }
    );
  }
  if (name.length > 32) {
    return NextResponse.json(
      { success: false, error: 'Nombre demasiado largo' },
      { status: 400 }
    );
  }

  try {
    const result = await isChatNameAvailable(uid, name);
    return NextResponse.json({
      success: true,
      data: {
        available: result.available,
        reason: result.reason ?? null,
        message: result.error ?? null,
      },
    });
  } catch (e) {
    logger.error('chat_profile_available.failed', { route: 'chat-profile-available', err: e });
    return NextResponse.json(
      { success: false, error: 'No se pudo comprobar el nombre' },
      { status: 500 }
    );
  }
}
