import { NextResponse } from 'next/server';
import { rateLimit } from '@/server/http/rateLimit';
import { verifyBearerUid } from '@/server/db/firebaseAdmin';

/**
 * GET — indica si el usuario autenticado está en CHAT_ADMIN_UIDS (panel moderación chat).
 * Sin token o no listado → admin: false.
 */
export async function GET(req) {
  const limited = rateLimit(req, {
    limit: 60,
    windowMs: 60_000,
    id: 'auth-admin-check',
  });
  if (limited) return limited;

  const allow = (process.env.CHAT_ADMIN_UIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allow.length === 0) {
    return NextResponse.json({
      success: true,
      data: { admin: false },
    });
  }

  let uid;
  try {
    uid = await verifyBearerUid(req.headers.get('authorization'));
  } catch {
    return NextResponse.json({
      success: true,
      data: { admin: false },
    });
  }

  if (!uid) {
    return NextResponse.json({
      success: true,
      data: { admin: false },
    });
  }

  const admin = allow.includes(uid);
  return NextResponse.json({
    success: true,
    data: { admin },
  });
}
