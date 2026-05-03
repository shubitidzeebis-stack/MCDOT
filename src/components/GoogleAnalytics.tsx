"use client";

import Script from "next/script";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// Google Analytics 4 (gtag.js). Loaded only after the visitor accepts the
// analytics consent category — gated upstream in AnalyticsGate. Renders
// nothing visible; injects the gtag bootstrap into <head>.
//
// We default ad-related signals OFF (ad_storage, ad_user_data,
// ad_personalization) so a vanilla install never silently shares data
// with Google Ads. When we wire conversion tracking later, we'll either
// flip these post-consent or add an "advertising" consent category.

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  if (!measurementId) return null;
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
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'granted'
          });
          gtag('js', new Date());
          gtag('config', '${measurementId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
