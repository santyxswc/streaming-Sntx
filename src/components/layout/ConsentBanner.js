"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSENT_OPEN_EVENT, writeConsent } from "@/lib/consent";
import { useConsent } from "@/lib/useConsent";

/** Aviso de analítica: aparece hasta que se decide y se puede reabrir desde el pie de página. */
export default function ConsentBanner() {
  const consent = useConsent();
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const reopen = () => setReopened(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  // `undefined` = servidor o primer render: no se muestra. `null` = sin decidir todavía.
  if (consent !== null && !reopened) return null;

  const choose = (value) => {
    writeConsent(value);
    setReopened(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Preferencias de cookies"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[100] rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur p-4 text-sm text-gray-300 shadow-2xl"
    >
      <p className="mb-3">
        Usamos <strong className="text-white">Firebase Analytics (Google)</strong> para medir las visitas. Solo se activa si lo
        aceptas; la web funciona igual si lo rechazas.{" "}
        <Link href="/privacidad" className="underline hover:text-white">
          Más información
        </Link>
        .
      </p>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => choose("denied")}
          className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10 transition-colors"
        >
          Rechazar
        </button>
        <button
          type="button"
          onClick={() => choose("granted")}
          className="px-4 py-2 rounded-md bg-white text-black font-bold hover:bg-zinc-200 transition-colors"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
