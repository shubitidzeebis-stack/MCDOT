"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useConsent } from "@/components/CookieBanner";

// Vercel Analytics + Speed Insights — both privacy-respecting (no
// third-party cookies, no cross-site tracking) but consent-mode rules
// in some jurisdictions still require user opt-in for any analytics.
// Both are loaded together once the user accepts the analytics
// category.
export function AnalyticsGate() {
  const consent = useConsent();
  if (!consent.analytics) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
