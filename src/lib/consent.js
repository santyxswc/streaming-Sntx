/**
 * Consentimiento de cookies y analítica. Solo hay una decisión que guardar: si se permite Firebase
 * Analytics (Google), que usa identificadores persistentes. Hasta que la persona acepte, no se carga nada.
 */
export const CONSENT_KEY = 'sntx-consent';
export const CONSENT_EVENT = 'sntx:consent';
export const CONSENT_OPEN_EVENT = 'sntx:consent-open';

const VALID = new Set(['granted', 'denied']);

function safeStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null; // modo privado estricto o almacenamiento bloqueado
  }
}

/** @returns {'granted' | 'denied' | null} null = aún no ha decidido (o no hay almacenamiento). */
export function readConsent(storage = safeStorage()) {
  try {
    const value = storage?.getItem(CONSENT_KEY);
    return VALID.has(value) ? value : null;
  } catch {
    return null;
  }
}

/** Guarda la decisión y avisa a quien escuche (el componente de analítica). */
export function writeConsent(value, storage = safeStorage()) {
  if (!VALID.has(value)) throw new Error(`Valor de consentimiento no válido: ${value}`);
  try {
    storage?.setItem(CONSENT_KEY, value);
  } catch {
    /* sin almacenamiento: la decisión vale solo para esta visita */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

/** Vuelve a mostrar el aviso para que se pueda cambiar la decisión. */
export function openConsentPreferences() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
