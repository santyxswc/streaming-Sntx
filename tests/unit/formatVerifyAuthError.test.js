import { describe, it, expect } from 'vitest';
import { formatVerifyAuthError } from '@/server/db/firebaseAdmin';

describe('formatVerifyAuthError', () => {
  it.each([
    'MISSING_ENV: Define FIREBASE_SERVICE_ACCOUNT. Ver docs/FIREBASE_SERVICE_ACCOUNT.md',
    'INVALID_JSON: No se pudo parsear FIREBASE_SERVICE_ACCOUNT (Unexpected token)',
    'INVALID_BASE64: FIREBASE_SERVICE_ACCOUNT_BASE64 no es Base64/JSON válido',
    'INVALID_CREDENTIALS: Falta "private_key" en el JSON del service account',
    'PROJECT_MISMATCH: El service account es del proyecto "abc" pero NEXT_PUBLIC_FIREBASE_PROJECT_ID es "xyz"',
    'INIT_FAILED: no se pudo inicializar',
  ])('no filtra detalles de configuración: %s', (message) => {
    const text = formatVerifyAuthError(new Error(message));
    expect(text).toBe('Servicio de autenticación no disponible.');
    expect(text).not.toMatch(/FIREBASE|proyecto|docs\/|private_key/i);
  });

  it('mantiene mensajes útiles para errores del token del usuario', () => {
    expect(formatVerifyAuthError(new Error('TOKEN_EXPIRED'))).toMatch(/expirada/);
    expect(formatVerifyAuthError(new Error('TOKEN_MALFORMED'))).toMatch(/inválido/);
    const generic = Object.assign(new Error('VERIFY_FAILED:x'), { isTokenError: true });
    expect(formatVerifyAuthError(generic)).toMatch(/inválida/);
  });

  it('devuelve un mensaje genérico ante errores desconocidos', () => {
    expect(formatVerifyAuthError(new Error('boom'))).toBe('Error de autenticación en el servidor.');
    expect(formatVerifyAuthError(undefined)).toBe('Error de autenticación en el servidor.');
  });
});
