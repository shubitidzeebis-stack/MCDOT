"use client";

import { Analytics } from "@vercel/analytics/react";
import { useConsent } from "@/components/CookieBanner";

// Vercel Analytics is privacy-respecting (no third-party cookies, no
// cross-site tracking) but consent-mode rules in some jurisdictions
// still require user opt-in for ANY analytics. We default it OFF until
// the visitor accepts the analytics category.
export function AnalyticsGate() {
  const consent = useConsent();
  if (!consent?.analytics) return null;
  return <Analytics />;
}
