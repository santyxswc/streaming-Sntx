// Sin mocks: ejecuta el SDK real de firebase-admin. Los tests con mocks solo comprueban que
// usamos la API que suponemos; este comprueba que esa API existe en la versión instalada
// (la v14 eliminó el espacio de nombres antiguo `admin.auth()`, `admin.firestore()`...).
import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';

let firebaseAdmin;

beforeAll(async () => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  const serviceAccount = {
    type: 'service_account',
    project_id: 'proyecto-de-prueba',
    private_key: privateKey,
    client_email: 'prueba@proyecto-de-prueba.iam.gserviceaccount.com',
  };
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = Buffer.from(JSON.stringify(serviceAccount)).toString('base64');
  delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  firebaseAdmin = await import('@/server/db/firebaseAdmin');
});

describe('firebase-admin (SDK real)', () => {
  it('inicializa la app con una cuenta de servicio y la reutiliza', () => {
    const first = firebaseAdmin.getFirebaseAdminApp();
    expect(first.options.projectId ?? first.name).toBeTruthy();
    expect(firebaseAdmin.getFirebaseAdminApp()).toBe(first);
  });

  it('crea el cliente de Firestore', () => {
    const db = firebaseAdmin.getAdminFirestore();
    expect(typeof db.collection).toBe('function');
  });

  it('un token mal formado se rechaza como TOKEN_MALFORMED, sin red', async () => {
    const err = await firebaseAdmin.verifyBearerUid('Bearer esto-no-es-un-jwt').catch((e) => e);
    expect(err.message).toBe('TOKEN_MALFORMED');
    expect(err.isTokenError).toBe(true);
  });

  it('con checkRevoked también rechaza un token mal formado', async () => {
    const err = await firebaseAdmin
      .verifyBearerUid('Bearer esto-no-es-un-jwt', { checkRevoked: true })
      .catch((e) => e);
    expect(err.message).toBe('TOKEN_MALFORMED');
  });
});
