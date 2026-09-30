import 'server-only';
import { safeEqual } from '@/server/shared/safeEqual';
import { verifyBearerUid } from '@/server/db/firebaseAdmin';

/**
 * Acceso a endpoints de moderación del chat.
 * - Cabecera `X-Moderation-Secret` igual a `CHAT_MODERATION_SECRET` (recomendado para scripts).
 * - O `Authorization: Bearer <ID token Firebase>` con uid en `CHAT_ADMIN_UIDS` (coma-separado).
 */
export async function isChatModeratorAuthorized(req) {
  const secret = (process.env.CHAT_MODERATION_SECRET || '').trim();
  const headerSecret = req.headers.get('x-moderation-secret');
  if (secret) {
    if (headerSecret) {
      if (safeEqual(headerSecret, secret)) {
        return { ok: true, via: 'secret' };
      }
      return { ok: false, reason: 'bad_secret' };
    }
  }

  const allow = (process.env.CHAT_ADMIN_UIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allow.length === 0) {
    return { ok: false, reason: 'not_configured' };
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, reason: 'no_token' };
  }

  let uid;
  try {
    uid = await verifyBearerUid(authHeader, { checkRevoked: true });
  } catch {
    return { ok: false, reason: 'invalid_token' };
  }
  if (!uid) {
    return { ok: false, reason: 'no_token' };
  }
  if (!allow.includes(uid)) {
    return { ok: false, reason: 'forbidden' };
  }
  return { ok: true, via: 'firebase', uid };
}
