import { NextResponse } from 'next/server';
import { rateLimit, rateLimitKey } from '@/server/http/rateLimit';
import { verifyBearerUid, formatVerifyAuthError } from '@/server/db/firebaseAdmin';
import { isChatNameAvailable } from '@/server/chat/chatRepository';

/**
 * GET ?name= — comprueba disponibilidad del apodo antes de guardar (misma lógica que PATCH).
 * Requiere sesión; límites estrictos anti-abuso / enumeración.
 */
export async function GET(req) {
  const ipLimited = rateLimit(req, {
    limit: 45,
    windowMs: 60_000,
    id: 'chat-profile-avail-ip',
  });
  if (ipLimited) return ipLimited;

  let uid;
  try {
    uid = await verifyBearerUid(req.headers.get('authorization'));
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

  const uidLimited = rateLimitKey(`chat:avail:${uid}`, {
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
    console.error('GET /api/chat/profile/available', e);
    return NextResponse.json(
      { success: false, error: 'No se pudo comprobar el nombre' },
      { status: 500 }
    );
  }
}
