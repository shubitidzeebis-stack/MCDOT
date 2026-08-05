"use client";

import { useEffect } from "react";
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

// Last path we counted a PageView for, held at module scope rather than in
// a ref so it survives remounts. A ref got this wrong twice:
//   - toggling advertising consent off and on remounts this component, but
//     next/script will not re-run an inline script with the same id, so the
//     bootstrap PageView does NOT fire again — while a fresh ref would
//     swallow the following route change, permanently losing one PageView;
//   - React StrictMode double-invokes effects in dev, so a "skip the first
//     run" ref fires an extra PageView on top of the bootstrap's.
// Comparing paths instead makes both cases no-ops.
let lastCountedPath: string | null = null;

export function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    // First run of the page lifetime: the bootstrap snippet's own
    // fbq('track','PageView') already covered this path.
    if (lastCountedPath === null) {
      lastCountedPath = pathname;
      return;
    }
    if (lastCountedPath === pathname) return;
    lastCountedPath = pathname;
    trackMetaPageView();
  }, [pathname]);

  if (!pixelId) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
    </Script>
  );
}
