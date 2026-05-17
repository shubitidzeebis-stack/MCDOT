"use client";

import Script from "next/script";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// Google Analytics 4 (gtag.js) + optional Google Ads. Loaded only after
// the visitor accepts the analytics consent category — gated upstream in
// AnalyticsGate. Injects gtag bootstrap with Consent Mode v2 defaults.
//
// Consent defaults are set from the visitor's actual choices: if they
// accepted advertising at the same time as analytics, ad_storage starts
// as `granted` rather than `denied → updated`, so the very first
// pageview includes ad-attribution signals. Toggles after this point are
// handled by ConsentSync calling gtag('consent', 'update', ...).

export function GoogleAnalytics({
  measurementId,
  googleAdsId,
  advertisingGranted,
}: {
  measurementId: string;
  googleAdsId?: string;
  advertisingGranted: boolean;
}) {
  if (!measurementId) return null;
  const adFlag = advertisingGranted ? "granted" : "denied";
  return (
    <>
      <Script
        id="ga4-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            ad_storage: '${adFlag}',
            ad_user_data: '${adFlag}',
            ad_personalization: '${adFlag}',
            analytics_storage: 'granted'
          });
          gtag('js', new Date());
          gtag('config', '${measurementId}', { anonymize_ip: true });
          ${googleAdsId ? `gtag('config', '${googleAdsId}');` : ""}
        `}
      </Script>
    </>
  );
}
