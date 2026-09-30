import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyIdToken = vi.fn();
vi.mock('firebase-admin', () => ({
  default: {
    apps: [{}],
    app: () => ({}),
    auth: () => ({ verifyIdToken }),
  },
}));

const { verifyBearerUid, formatVerifyAuthError } = await import('@/server/db/firebaseAdmin');

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

  it.each(['auth/id-token-revoked', 'auth/user-disabled'])(
    'rechaza con TOKEN_REVOKED cuando Firebase responde %s',
    async (code) => {
      verifyIdToken.mockImplementation(async () => {
        throw Object.assign(new Error('x'), { code });
      });
      const err = await verifyBearerUid('Bearer tok', { checkRevoked: true }).catch((e) => e);
      expect(err.message).toBe('TOKEN_REVOKED');
      expect(err.isTokenError).toBe(true);
      expect(formatVerifyAuthError(err)).toMatch(/ya no es válida/);
    }
  );
});
