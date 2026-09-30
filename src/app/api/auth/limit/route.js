import { NextResponse } from 'next/server';
import { rateLimit } from '@/server/http/rateLimit';

/**
 * Límite de mejor esfuerzo para el formulario de acceso. NO es un control de seguridad:
 * el login y el registro se hacen contra Firebase Auth directamente desde el cliente,
 * así que quien llame a Firebase sin pasar por aquí se salta este contador.
 * La protección real (bloqueo por intentos, política de contraseñas, protección contra
 * enumeración) se configura en Firebase: ver docs/FIREBASE_AUTH_HARDENING.md.
 */
export async function POST(req) {
  try {
    // Apply Rate Limit: 5 attempts per 5 minutes for auth (login/register)
    const limitResponse = await rateLimit(req, {
      limit: 5,
      windowMs: 5 * 60 * 1000,
      id: 'auth-submit',
    });
    if (limitResponse) return limitResponse;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Auth limit error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
