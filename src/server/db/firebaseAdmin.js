import 'server-only';
import admin from 'firebase-admin';

/**
 * Parsea el JSON del service account desde env.
 * - No uses comillas dobles envolviendo JSON con muchas " dentro: dotenv corta el valor.
 * - Opción segura: FIREBASE_SERVICE_ACCOUNT_BASE64 (archivo completo en Base64).
 * - Opción B: FIREBASE_SERVICE_ACCOUNT='{ "type": ... }' entre comillas simples.
 */
function parseServiceAccountFromEnv() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64 && String(b64).trim()) {
    try {
      const decoded = Buffer.from(String(b64).trim(), 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (e) {
      throw new Error(
        `INVALID_BASE64: FIREBASE_SERVICE_ACCOUNT_BASE64 no es Base64/JSON válido (${e.message})`
      );
    }
  }

  let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw || !String(raw).trim()) {
    return null;
  }

  raw = String(raw).trim();

  if (raw.startsWith('base64:')) {
    try {
      const decoded = Buffer.from(raw.slice(7).trim(), 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (e) {
      throw new Error(
        `INVALID_BASE64: prefijo base64: inválido (${e.message})`
      );
    }
  }

  if (
    (raw.startsWith('"') && raw.endsWith('"') && raw.length > 2) ||
    (raw.startsWith("'") && raw.endsWith("'") && raw.length > 2)
  ) {
    raw = raw.slice(1, -1);
    raw = raw.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    const detail = e instanceof SyntaxError ? e.message : String(e);
    throw new Error(
      `INVALID_JSON: No se pudo parsear FIREBASE_SERVICE_ACCOUNT (${detail}). ` +
        'No envuelvas el JSON con comillas dobles en .env (rompe el valor). ' +
        'Usa comillas simples externas, o define FIREBASE_SERVICE_ACCOUNT_BASE64. Ver docs/FIREBASE_SERVICE_ACCOUNT.md'
    );
  }
}

/**
 * Firebase Admin para verificar ID tokens en API Routes (servidor).
 * Configura FIREBASE_SERVICE_ACCOUNT con el JSON completo del service account.
 * @see docs/FIREBASE_SERVICE_ACCOUNT.md
 */
export function getFirebaseAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  let cred;
  try {
    cred = parseServiceAccountFromEnv();
  } catch (e) {
    if (e.message && e.message.startsWith('INVALID_')) {
      throw e;
    }
    throw new Error(`INVALID_JSON: ${e.message}`);
  }

  if (!cred) {
    throw new Error(
      'MISSING_ENV: Define FIREBASE_SERVICE_ACCOUNT o FIREBASE_SERVICE_ACCOUNT_BASE64. Ver docs/FIREBASE_SERVICE_ACCOUNT.md'
    );
  }

  const required = ['type', 'project_id', 'private_key', 'client_email'];
  for (const k of required) {
    if (!cred[k]) {
      throw new Error(
        `INVALID_CREDENTIALS: Falta "${k}" en el JSON del service account`
      );
    }
  }

  const publicProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (
    publicProjectId &&
    cred.project_id &&
    cred.project_id !== publicProjectId
  ) {
    throw new Error(
      `PROJECT_MISMATCH: El service account es del proyecto "${cred.project_id}" pero NEXT_PUBLIC_FIREBASE_PROJECT_ID es "${publicProjectId}". Deben ser el mismo.`
    );
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert(cred),
    });
  } catch (e) {
    throw new Error(
      `INIT_FAILED: ${e?.message || 'No se pudo inicializar Firebase Admin'}`
    );
  }
}

/**
 * Firestore Admin (bypasea reglas de seguridad). Usar solo en API routes.
 */
export function getAdminFirestore() {
  const app = getFirebaseAdminApp();
  return admin.firestore(app);
}

/**
 * @param {string | null} authHeader - Valor de cabecera Authorization
 * @returns {Promise<string|null>} uid o null si no hay Bearer
 */
export async function verifyBearerUid(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  let app;
  try {
    app = getFirebaseAdminApp();
  } catch (e) {
    e.isConfigError = true;
    throw e;
  }

  try {
    const decoded = await admin.auth(app).verifyIdToken(token);
    return decoded.uid;
  } catch (e) {
    const code = e?.code || e?.errorInfo?.code || '';
    const err = new Error(
      code === 'auth/id-token-expired'
        ? 'TOKEN_EXPIRED'
        : code === 'auth/argument-error'
          ? 'TOKEN_MALFORMED'
          : `VERIFY_FAILED:${code || e.message}`
    );
    err.isTokenError = true;
    throw err;
  }
}

// Prefijos de errores de configuración del servidor. Sus mensajes incluyen
// nombres de variables, ids de proyecto o rutas internas: nunca deben llegar al cliente.
const CONFIG_ERROR_PREFIXES = [
  'MISSING_ENV:',
  'INVALID_JSON:',
  'INVALID_BASE64:',
  'INVALID_CREDENTIALS:',
  'PROJECT_MISMATCH:',
  'INIT_FAILED:',
];

/**
 * Mensaje seguro para respuestas API cuando verifyBearerUid falla.
 * El detalle de los errores de configuración solo se registra en el servidor
 * (las rutas ya hacen console.error del error original).
 */
export function formatVerifyAuthError(err) {
  const msg = err?.message || '';
  if (CONFIG_ERROR_PREFIXES.some((prefix) => msg.startsWith(prefix))) {
    return 'Servicio de autenticación no disponible.';
  }
  if (msg === 'TOKEN_EXPIRED') {
    return 'Sesión expirada. Vuelve a iniciar sesión.';
  }
  if (msg === 'TOKEN_MALFORMED') {
    return 'Token de sesión inválido. Cierra sesión y entra de nuevo.';
  }
  if (err?.isTokenError) {
    return 'Sesión inválida. Vuelve a iniciar sesión.';
  }
  return 'Error de autenticación en el servidor.';
}
