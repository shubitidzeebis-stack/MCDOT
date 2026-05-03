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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://challenges.cloudflare.com https://va.vercel-scripts.com https://vercel-scripts.com https://www.clarity.ms https://*.clarity.ms",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://challenges.cloudflare.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://vercel.live wss://*.vercel.live https://www.clarity.ms https://*.clarity.ms",
      "frame-src https://challenges.cloudflare.com https://vercel.live",
      // worker-src + child-src don't fall back cleanly to script-src
      // in all browsers — declare them explicitly so blob workers and
      // Vercel preview iframes work without breaking the page.
      "worker-src 'self' blob:",
      "child-src 'self' blob: https://challenges.cloudflare.com",
      "manifest-src 'self'",
      "frame-ancestors 'none'",
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
    ];
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
