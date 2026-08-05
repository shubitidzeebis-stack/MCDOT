"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Clarity } from "@/components/Clarity";
import { ClickTracker } from "@/components/ClickTracker";
import { ConsentSync } from "@/components/ConsentSync";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { MetaPixel } from "@/components/MetaPixel";
import { useConsent } from "@/components/CookieBanner";
import { GOOGLE_ADS_ID } from "@/lib/analytics";
import { META_PIXEL_ID } from "@/lib/meta";

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "";
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

// Clarity loads unconditionally — it auto-masks all form inputs and PII
// by default and does not build ad profiles. GA, Vercel Analytics, and
// Google Ads stay consent-gated. ConsentSync + ClickTracker only run
// inside the analytics-gated block since they're no-ops without gtag.
//
// The Meta Pixel sits on the ADVERTISING category, not analytics: unlike
// GA4 it has no non-advertising use, so analytics-only consent must not
// load it. That also means it can be live while GA is not, and vice versa.
export function AnalyticsGate() {
  const consent = useConsent();
  return (
    <>
      {CLARITY_PROJECT_ID && <Clarity projectId={CLARITY_PROJECT_ID} />}
      {consent.advertising && META_PIXEL_ID && <MetaPixel pixelId={META_PIXEL_ID} />}
      {consent.analytics && (
        <>
          <Analytics />
          <SpeedInsights />
          {GA_MEASUREMENT_ID && (
            <GoogleAnalytics
              measurementId={GA_MEASUREMENT_ID}
              googleAdsId={GOOGLE_ADS_ID || undefined}
              advertisingGranted={consent.advertising}
            />
          )}
          <ConsentSync />
          <ClickTracker />
        </>
      )}
    </>
  );
}
