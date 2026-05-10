"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Clarity } from "@/components/Clarity";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { useConsent } from "@/components/CookieBanner";

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "";
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

// Clarity loads unconditionally — it auto-masks all form inputs and PII
// by default and does not build ad profiles. GA and Vercel Analytics
// stay consent-gated (they can feed ad targeting).
export function AnalyticsGate() {
  const consent = useConsent();
  return (
    <>
      {CLARITY_PROJECT_ID && <Clarity projectId={CLARITY_PROJECT_ID} />}
      {consent.analytics && (
        <>
          <Analytics />
          <SpeedInsights />
          {GA_MEASUREMENT_ID && <GoogleAnalytics measurementId={GA_MEASUREMENT_ID} />}
        </>
      )}
    </>
  );
}
