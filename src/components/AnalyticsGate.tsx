"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Clarity } from "@/components/Clarity";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { useConsent } from "@/components/CookieBanner";

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "";
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

// All analytics scripts are loaded only after the visitor accepts the
// analytics consent category — gated here so adding a new tool is one
// line below, not a hunt across the codebase. Each tool's own privacy
// posture varies, but consent gating keeps us clean across CCPA / VCDPA
// / CPA / CTDPA / UCPA.
export function AnalyticsGate() {
  const consent = useConsent();
  if (!consent.analytics) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
      {CLARITY_PROJECT_ID && <Clarity projectId={CLARITY_PROJECT_ID} />}
      {GA_MEASUREMENT_ID && <GoogleAnalytics measurementId={GA_MEASUREMENT_ID} />}
    </>
  );
}
