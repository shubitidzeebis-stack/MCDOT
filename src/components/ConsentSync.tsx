"use client";

import { useEffect } from "react";
import { useConsent } from "@/components/CookieBanner";

// Propagates consent toggles to gtag after the page is live. The
// GoogleAnalytics bootstrap sets initial Consent Mode v2 defaults; this
// component handles every subsequent change (e.g. user reopens the
// banner from the footer and flips advertising on/off).

export function ConsentSync() {
  const consent = useConsent();
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    const adFlag = consent.advertising ? "granted" : "denied";
    window.gtag("consent", "update", {
      ad_storage: adFlag,
      ad_user_data: adFlag,
      ad_personalization: adFlag,
      analytics_storage: consent.analytics ? "granted" : "denied",
    });
  }, [consent.advertising, consent.analytics]);
  return null;
}
