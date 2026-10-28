"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

type Consent = "granted" | "denied";

const STORAGE_KEY = "cv-finder:analytics-consent";
const RESET_EVENT = "cv-finder:analytics-consent-reset";

function readConsent(): Consent | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function saveConsent(value: Consent | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Bez localStorage pytamy o zgodę przy każdej wizycie.
  }
}

/** Google Analytics ładowany dopiero po wyrażeniu zgody na cookies analityczne. */
export function Analytics({ gaId }: { gaId: string }) {
  // undefined = jeszcze nie odczytano (SSR i pierwszy render)
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);

  useEffect(() => {
    setConsent(readConsent());
    const onReset = () => setConsent(null);
    window.addEventListener(RESET_EVENT, onReset);
    return () => window.removeEventListener(RESET_EVENT, onReset);
  }, []);

  useEffect(() => {
    // Wycofanie zgody wyłącza wysyłanie danych, jeśli gtag był już załadowany.
    (window as unknown as Record<string, boolean>)[`ga-disable-${gaId}`] =
      consent !== "granted";
  }, [consent, gaId]);

  function decide(value: Consent) {
    saveConsent(value);
    setConsent(value);
  }

  return (
    <>
      {consent === "granted" && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}

      {consent === null && (
        <div
          role="dialog"
          aria-labelledby="consent-title"
          aria-describedby="consent-text"
          className="fixed inset-x-0 bottom-0 z-50 p-4 print:hidden"
        >
          <div className="glass bg-[#0f0f16]/95 mx-auto max-w-3xl rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h2 id="consent-title" className="text-sm font-semibold">
                Pliki cookie
              </h2>
              <p id="consent-text" className="text-xs text-white/60 mt-1 leading-relaxed">
                Za Twoją zgodą używamy Google Analytics do anonimowych statystyk
                odwiedzin. Bez zgody nie zapisujemy żadnych plików cookie
                analitycznych, a aplikacja działa tak samo.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => decide("denied")}
                className="btn-secondary flex-1 sm:flex-none"
              >
                Odrzuć
              </button>
              <button
                type="button"
                onClick={() => decide("granted")}
                className="btn-secondary flex-1 sm:flex-none"
              >
                Akceptuj
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Ponownie pokazuje baner zgody, żeby można było zmienić decyzję. */
export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => {
        saveConsent(null);
        window.dispatchEvent(new Event(RESET_EVENT));
      }}
      className="underline underline-offset-2 hover:text-white/70 transition-colors"
    >
      Ustawienia cookies
    </button>
  );
}
