"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { trackMetaPageView } from "@/lib/meta";

// Meta (Facebook) Pixel loader. Mounted only after the visitor accepts the
// ADVERTISING consent category — gated upstream in AnalyticsGate. Unlike
// Clarity (which auto-masks and builds no ad profile) the pixel exists
// purely to build ad audiences, so it never loads on analytics-only
// consent.
//
// The bootstrap snippet is Meta's standard one. It ends with an init +
// PageView, so the first pageview is covered here; client-side route
// changes are not (the snippet only runs once), which is what the effect
// below handles.

export function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  // The bootstrap already fired PageView for the entry page. Skipping the
  // first effect run stops a duplicate PageView on load, which would
  // otherwise inflate landing-page traffic in Events Manager.
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!bootstrapped.current) {
      bootstrapped.current = true;
      return;
    }
    trackMetaPageView();
  }, [pathname]);

  if (!pixelId) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
    </Script>
  );
}
