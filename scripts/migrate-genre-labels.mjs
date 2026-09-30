/**
 * Migración one-off: reemplaza etiquetas de género en inglés por español en Firestore.
 *
 * Usa Firebase Admin SDK (requiere cuenta de servicio, no reglas de Firestore).
 *
 * Opción 1: Variable GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON de la cuenta de servicio
 *   set GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npm run migrate:genres
 *
 * Opción 2: Variable FIREBASE_SERVICE_ACCOUNT_JSON con el JSON como string (en .env.local)
 *   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"..."}
 */
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim();
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const REPLACEMENTS = [
  ['Action & Adventure', 'Acción & Aventura'],
];

async function migrateCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const toUpdate = [];

  snapshot.docs.forEach(d => {
    const data = d.data();
    const genres = data.genres || [];
    if (!Array.isArray(genres)) return;

    let updated = false;
    const newGenres = genres.map(g => {
      for (const [from, to] of REPLACEMENTS) {
        if (g === from) {
          updated = true;
          return to;
        }
      }
      return g;
    });

    if (updated) {
      toUpdate.push({ id: d.id, genres: newGenres });
    }
  });

  const BATCH_SIZE = 500;
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = toUpdate.slice(i, i + BATCH_SIZE);
    for (const { id, genres } of chunk) {
      batch.update(db.collection(collectionName).doc(id), { genres });
    }
    await batch.commit();
  }

  return toUpdate.length;
}

function initFirebaseAdmin() {
  if (getApps().length > 0) return getFirestore();

  const credJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (credJson) {
    try {
      const serviceAccount = typeof credJson === 'string' ? JSON.parse(credJson) : credJson;
      initializeApp({ credential: cert(serviceAccount) });
      return getFirestore();
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON no es JSON válido:', e.message);
      process.exit(1);
    }
  }

  try {
    initializeApp({ credential: applicationDefault() });
    return getFirestore();
  } catch (e) {
    console.error(
      'Para migrar necesitas la cuenta de servicio de Firebase (Admin SDK).\n\n' +
      '1. Firebase Console → Project Settings → Service accounts → Generate new private key\n' +
      '2. Guarda el JSON (ej. serviceAccountKey.json) y ejecuta:\n' +
      '   set GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json\n' +
      '   npm run migrate:genres\n\n' +
      'O define FIREBASE_SERVICE_ACCOUNT_JSON en .env.local con el JSON como string.'
    );
    process.exit(1);
  }
}

async function main() {
  const db = initFirebaseAdmin();
  console.log('Migrando etiquetas de género...');
  const [moviesCount, seriesCount] = await Promise.all([
    migrateCollection(db, 'movies'),
    migrateCollection(db, 'series'),
  ]);
  console.log(`Listo: ${moviesCount} películas, ${seriesCount} series actualizadas.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
