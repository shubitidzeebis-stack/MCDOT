import type { NextConfig } from "next";
import createMDX from "@next/mdx";

// Security headers applied to every response. Tightened deliberately so
// browsers reject unexpected behavior (mixed content, framing,
// MIME-sniffing) and the site doesn't leak referer to ad networks.
//
// CSP notes:
// - 'unsafe-inline' on script-src is needed for Next.js inlined nonce
//   scripts and analytics; we'd lose hydration without it. Acceptable
//   trade-off for a marketing site without user-supplied scripts.
// - challenges.cloudflare.com is allowed for Turnstile.
// - vercel-scripts.com + vitals.vercel-insights.com for Speed Insights.
// - va.vercel-scripts.com for Vercel Analytics.
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' + 'unsafe-eval' required for Next.js hydration.
      // blob: in script-src lets analytics scripts spin up Web Workers
      // from Blob URLs (Vercel Analytics + Speed Insights both do this
      // post-consent). Without blob: in worker-src specifically, the
      // Vercel Analytics worker fails to load and Chrome aborts the
      // page render with "This page couldn't load."
      // Google Ads (AW-*) conversion + remarketing endpoints:
      //   www.googleadservices.com         — conversion.js
      //   www.google.com                   — /ccm/collect (enhanced
      //                                       conversions linker) and
      //                                       /rmkt/collect (remarketing)
      //   googleads.g.doubleclick.net      — legacy remarketing pixel
      // GA4 alone doesn't need these — AW-* does.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://challenges.cloudflare.com https://va.vercel-scripts.com https://vercel-scripts.com https://www.clarity.ms https://*.clarity.ms https://www.googletagmanager.com https://www.googleadservices.com https://www.google.com https://app.cal.eu https://app.cal.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://challenges.cloudflare.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://vercel.live wss://*.vercel.live https://www.clarity.ms https://*.clarity.ms https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.googleadservices.com https://www.google.com https://googleads.g.doubleclick.net https://app.cal.eu https://app.cal.com https://cal.eu https://cal.com",
      // blob: lets the admin Bill of Sale preview render its locally
      // generated PDF in an iframe (blob URLs are same-origin only).
      "frame-src blob: https://challenges.cloudflare.com https://vercel.live https://app.cal.eu https://app.cal.com https://cal.eu https://cal.com https://www.cal.eu https://www.cal.com",
      // worker-src + child-src don't fall back cleanly to script-src
      // in all browsers — declare them explicitly so blob workers and
      // Vercel preview iframes work without breaking the page.
      "worker-src 'self' blob:",
      "child-src 'self' blob: https://challenges.cloudflare.com",
      "manifest-src 'self'",
      // 'self' (not 'none') because blob: documents inherit this CSP —
      // the admin Bill of Sale PDF preview frames a same-origin blob and
      // 'none' makes the PDF block itself. Cross-origin framing is still
      // denied by 'self', and X-Frame-Options: DENY above still blocks
      // ALL framing of real pages (it doesn't apply to blob documents).
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  experimental: {
    mdxRs: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      // Allow Clarity's replay player (clarity.microsoft.com) to fetch
      // static CSS/JS assets cross-origin so session replays render with
      // correct styling instead of blank/unstyled.
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Timing-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
