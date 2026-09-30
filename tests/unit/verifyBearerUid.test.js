import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyIdToken = vi.fn();
vi.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  getApp: () => ({}),
  initializeApp: vi.fn(),
  cert: vi.fn(),
}));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken }) }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: vi.fn() }));

const { verifyBearerUid, formatVerifyAuthError, authErrorCode } = await import('@/server/db/firebaseAdmin');

describe('verifyBearerUid', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it('devuelve null sin cabecera Bearer y no consulta a Firebase', async () => {
    expect(await verifyBearerUid(null)).toBeNull();
    expect(await verifyBearerUid('Basic abc')).toBeNull();
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('por defecto no comprueba revocación (evita una llamada de red extra)', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1' });
    expect(await verifyBearerUid('Bearer tok')).toBe('u1');
    expect(verifyIdToken).toHaveBeenCalledWith('tok', false);
  });

  it('con checkRevoked pide a Firebase comprobar la revocación', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1' });
    await verifyBearerUid('Bearer tok', { checkRevoked: true });
    expect(verifyIdToken).toHaveBeenCalledWith('tok', true);
  });

  // El SDK ha cambiado dónde y cómo expone el código entre versiones mayores: hay que
  // clasificar igual con o sin prefijo `auth/` y con `errorInfo`, porque de esto depende
  // quién conserva el acceso.
  const variants = (code) => [
    ['con prefijo', { code: `auth/${code}` }],
    ['sin prefijo', { code }],
    ['en errorInfo', { errorInfo: { code: `auth/${code}` } }],
  ];

  describe.each([
    ['id-token-expired', 'TOKEN_EXPIRED'],
    ['id-token-revoked', 'TOKEN_REVOKED'],
    ['user-disabled', 'TOKEN_REVOKED'],
    ['argument-error', 'TOKEN_MALFORMED'],
  ])('código %s', (code, expected) => {
    it.each(variants(code))(`se clasifica como ${expected} (%s)`, async (_label, shape) => {
      verifyIdToken.mockImplementation(async () => {
        throw Object.assign(new Error('x'), shape);
      });
      const err = await verifyBearerUid('Bearer tok', { checkRevoked: true }).catch((e) => e);
      expect(err.message).toBe(expected);
      expect(err.isTokenError).toBe(true);
    });
  });

  it('rechaza como sesión inválida un error desconocido sin filtrar su mensaje', async () => {
    verifyIdToken.mockImplementation(async () => {
      throw Object.assign(new Error('detalle interno'), { code: 'auth/algo-nuevo' });
    });
    const err = await verifyBearerUid('Bearer tok').catch((e) => e);
    expect(err.isTokenError).toBe(true);
    expect(formatVerifyAuthError(err)).toBe('Sesión inválida. Vuelve a iniciar sesión.');
  });

  it('muestra un mensaje claro para sesiones revocadas', async () => {
    const err = Object.assign(new Error('TOKEN_REVOKED'), { isTokenError: true });
    expect(formatVerifyAuthError(err)).toMatch(/ya no es válida/);
  });
});

describe('authErrorCode', () => {
  it('normaliza el código quitando el prefijo', () => {
    expect(authErrorCode({ code: 'auth/id-token-expired' })).toBe('id-token-expired');
    expect(authErrorCode({ code: 'id-token-expired' })).toBe('id-token-expired');
    expect(authErrorCode({ errorInfo: { code: 'auth/user-disabled' } })).toBe('user-disabled');
    expect(authErrorCode(undefined)).toBe('');
  });
});
