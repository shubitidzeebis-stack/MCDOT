"use client";

import Script from "next/script";

// Microsoft Clarity — free session recordings + heatmaps. Loaded only
// after the visitor accepts the analytics consent category. Renders
// nothing visible; injects the official Clarity bootstrap into <head>.
//
// Note: Clarity has its own privacy posture (no PII collection by
// default, scrubs forms automatically) but consent is still gated under
// the "analytics" category for legal cleanliness across CCPA / VCDPA /
// CPA / CTDPA / UCPA.

export function Clarity({ projectId }: { projectId: string }) {
  if (!projectId) return null;
  return (
    <Script id="ms-clarity" strategy="lazyOnload">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${projectId}");`}
    </Script>
  );
}
