import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import s from "./CookieConsent.module.css";

const STORAGE_KEY = "devengine_cookie_consent";

export type CookieConsentChoice = "all" | "necessary" | "declined";

export default function CookieConsent() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only display on client side and public routes
    if (typeof window === "undefined") return;

    const pathname = router.pathname || "";
    if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) {
      return;
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // Small timeout for smooth appearance after initial page paint
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [router.pathname]);

  const handleChoice = (choice: CookieConsentChoice) => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
      // Dispatch a custom event so listeners (like analytics) can react immediately
      window.dispatchEvent(
        new CustomEvent("devengine_cookie_consent_update", { detail: { choice } })
      );
    } catch {
      // ignore local storage quota / sandbox issues
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      className={s.backdrop}
      role="dialog"
      aria-label="Cookie and Privacy Consent"
      aria-describedby="cookie-consent-desc"
    >
      <div className={s.banner}>
        <div className={s.content}>
          <div className={s.iconWrapper} aria-hidden="true">
            <span className="material-symbols-outlined">cookie</span>
          </div>
          <div className={s.textBlock}>
            <div className={s.title}>
              <span>Privacy &amp; Analytics Consent</span>
              <span className={s.badge}>Transparent</span>
            </div>
            <p id="cookie-consent-desc" className={s.description}>
              We use essential cookies for platform settings and authentic analytics to measure
              real visits and read counts. No fake data, no third-party ad brokers. Review our{" "}
              <Link href="/privacy-policy" className={s.link}>
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        <div className={s.actions}>
          <button
            type="button"
            className={s.btnGhost}
            onClick={() => handleChoice("declined")}
          >
            Decline
          </button>
          <button
            type="button"
            className={s.btnSecondary}
            onClick={() => handleChoice("necessary")}
          >
            Necessary Only
          </button>
          <button
            type="button"
            className={s.btnPrimary}
            onClick={() => handleChoice("all")}
          >
            Accept All
          </button>
        </div>
      </div>
    </aside>
  );
}
