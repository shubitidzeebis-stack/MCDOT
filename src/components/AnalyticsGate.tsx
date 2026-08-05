"use client";

import { usePathname } from "next/navigation";
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
import { isTestMode } from "@/lib/test-mode";

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "";
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

// Clarity is gated on ANALYTICS consent. It previously loaded
// unconditionally on the reasoning that it auto-masks form inputs and
// builds no ad profiles — but it still sets first-party cookies and
// records the session (mouse, scroll, DOM), which is not "strictly
// necessary" under GDPR, and the site serves ES/RU locales. Clarity.tsx's
// own header already documented it as analytics-gated, so the two files
// disagreed; this restores the documented contract.
//
// The Meta Pixel sits on the ADVERTISING category, not analytics: unlike
// GA4 it has no non-advertising use, so analytics-only consent must not
// load it. That also means it can be live while GA is not, and vice versa.
//
// ClickTracker sits OUTSIDE the analytics block for that same reason. The
// banner lets a visitor accept advertising while declining analytics; with
// ClickTracker gated on analytics alone, those visitors would generate no
// tel:/WhatsApp/mailto conversions for Meta at all. It is safe to mount on
// either category — it only calls fireConversion, and each destination
// applies its own gate (gtag is absent without analytics; the Meta helpers
// check advertising consent directly).
// The admin panel is our own back office, not marketing surface. Loading
// any tracker there was actively harmful:
//   - it made ~22% of GA4 pageviews internal admin traffic, skewing every
//     engagement and acquisition metric the ad campaigns are judged on;
//   - remarketing audiences would have included the operator himself;
//   - Clarity was session-recording screens that display real lead names,
//     emails and MC numbers.
// robots.txt already disallows /admin — this closes the analytics half.
function isInternalPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function AnalyticsGate() {
  const consent = useConsent();
  const pathname = usePathname();
  if (isInternalPath(pathname)) return null;
  return (
    <>
      {consent.analytics && CLARITY_PROJECT_ID && !isTestMode() && (
        <Clarity projectId={CLARITY_PROJECT_ID} />
      )}
      {consent.advertising && META_PIXEL_ID && !isTestMode() && (
        <MetaPixel pixelId={META_PIXEL_ID} />
      )}
      {(consent.analytics || consent.advertising) && <ClickTracker />}
      {/*
        ConsentSync must live OUTSIDE the analytics gate. gtag.js is not
        unloaded when <GoogleAnalytics> unmounts, so if this component were
        gated too, withdrawing analytics consent would unmount the very
        thing whose job is to tell Google about the withdrawal — the
        `consent: update` would never be sent and the already-loaded tag
        would carry on with `analytics_storage: granted`.
      */}
      <ConsentSync />
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
        </>
      )}
    </>
  );
}
