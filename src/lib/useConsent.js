"use client";

import { useSyncExternalStore } from "react";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

function subscribe(onChange) {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange); // otra pestaña cambió la decisión
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Decisión de consentimiento: 'granted' | 'denied' | null (sin decidir).
 * En el servidor devuelve `undefined` (aún no se sabe), para que el HTML inicial no muestre el aviso
 * y no haya desajuste de hidratación.
 */
export function useConsent() {
  return useSyncExternalStore(subscribe, readConsent, () => undefined);
}
