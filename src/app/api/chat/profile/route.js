import { NextResponse } from 'next/server';
import { rateLimit, rateLimitKey } from '@/server/http/rateLimit';
import { verifyBearerUid, formatVerifyAuthError } from '@/server/db/firebaseAdmin';
import {
  getOrCreateProfile,
  updateChatName,
} from '@/server/chat/chatRepository';

async function requireUid(req) {
  try {
    const uid = await verifyBearerUid(req.headers.get('authorization'));
    return { uid, error: null };
  } catch (e) {
    console.error('verifyBearerUid', e);
    return {
      uid: null,
      error: NextResponse.json(
        { success: false, error: formatVerifyAuthError(e) },
        { status: 401 }
      ),
    };
  }
}

/**
 * GET — nombre de chat actual (crea perfil con nombre aleatorio si no existe).
 */
export async function GET(req) {
  const ipLimited = await rateLimit(req, {
    limit: 40,
    windowMs: 60_000,
    id: 'chat-profile-get-ip',
  });
  if (ipLimited) return ipLimited;

  const { uid, error } = await requireUid(req);
  if (error) return error;
  if (!uid) {
    return NextResponse.json(
      { success: false, error: 'Debes iniciar sesión' },
      { status: 401 }
    );
  }

  const uidLimited = await rateLimitKey(`chat:profile:get:${uid}`, {
    limit: 90,
    windowMs: 60_000,
  });
  if (uidLimited) return uidLimited;

  try {
    const { chatName } = await getOrCreateProfile(uid);
    return NextResponse.json({ success: true, data: { chatName } });
  } catch (e) {
    console.error('GET /api/chat/profile', e);
    return NextResponse.json(
      { success: false, error: 'No se pudo cargar el perfil de chat' },
      { status: 500 }
    );
  }
}

/**
 * PATCH — cambiar nombre visible en el chat.
 */
export async function PATCH(req) {
  const ipLimited = await rateLimit(req, {
    limit: 15,
    windowMs: 60_000,
    id: 'chat-profile-patch-ip',
  });
  if (ipLimited) return ipLimited;

  const { uid, error } = await requireUid(req);
  if (error) return error;
  if (!uid) {
    return NextResponse.json(
      { success: false, error: 'Debes iniciar sesión' },
      { status: 401 }
    );
  }

  const uidLimited = await rateLimitKey(`chat:profile:patch:${uid}`, {
    limit: 8,
    windowMs: 60 * 60 * 1000,
    message:
      'Has cambiado el nombre demasiadas veces. Espera un poco antes de intentarlo de nuevo.',
  });
  if (uidLimited) return uidLimited;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'JSON inválido' },
      { status: 400 }
    );
  }

  const raw = body.chatName ?? body.name;
  const result = await updateChatName(uid, raw);

  if (result.error) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status || 400 }
    );
  }

  return NextResponse.json({ success: true, data: { chatName: result.chatName } });
}
