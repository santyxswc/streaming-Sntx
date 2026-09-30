import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported, setAnalyticsCollectionEnabled } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Only initialize Firebase if API key is configured
const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

let app = null;
let db = null;
let auth = null;
let analytics;

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);

}

/**
 * Activa Firebase Analytics. Solo se llama tras el consentimiento de la persona (ver
 * `src/lib/consent.js`): `getAnalytics` descarga gtag.js de Google y crea identificadores
 * persistentes, así que NO se inicializa al cargar la página.
 */
export async function startAnalytics() {
  if (!app || typeof window === "undefined") return null;
  if (!analytics) {
    if (!(await isSupported())) return null;
    analytics = getAnalytics(app);
  }
  setAnalyticsCollectionEnabled(analytics, true);
  return analytics;
}

/** Si se retira el consentimiento, deja de enviar datos sin recargar. */
export function stopAnalytics() {
  if (analytics) setAnalyticsCollectionEnabled(analytics, false);
}

export { db, auth, analytics, isFirebaseConfigured };
