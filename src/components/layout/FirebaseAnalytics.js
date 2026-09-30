"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { startAnalytics, stopAnalytics } from "@/lib/firebase";
import { logEvent } from "firebase/analytics";
import { useConsent } from "@/lib/useConsent";

/** Mide las visitas SOLO si la persona aceptó la analítica; si no, no carga nada de Google. */
export default function FirebaseAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const consent = useConsent();

  useEffect(() => {
    if (consent !== "granted") {
      if (consent === "denied") stopAnalytics();
      return;
    }
    let cancelled = false;
    startAnalytics().then((analytics) => {
      if (cancelled || !analytics) return;
      logEvent(analytics, "page_view", {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [consent, pathname, searchParams]);

  return null;
}
