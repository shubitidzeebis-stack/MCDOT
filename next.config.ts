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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://va.vercel-scripts.com https://vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://challenges.cloudflare.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
      "frame-src https://challenges.cloudflare.com",
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
