import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import { AnalyticsGate } from "@/components/AnalyticsGate";
import { AttributionCapture } from "@/components/AttributionCapture";
import { CookieBanner } from "@/components/CookieBanner";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/Schema";
import { SITE } from "@/lib/site";
import "./globals.css";

// Read pathname (forwarded by middleware as x-pathname) and derive the
// right <html lang> attribute per locale. SSR-correct, no JS handoff,
// proper SEO + a11y for Spanish + Russian roots.
async function getLang(): Promise<string> {
  const h = await headers();
  const path = h.get("x-pathname") ?? "/";
  if (path === "/es" || path.startsWith("/es/")) return "es";
  if (path === "/ru" || path.startsWith("/ru/")) return "ru";
  return "en";
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

// Use `||` not `??` so an empty string env var (which `new URL("")` rejects)
// also falls through to the localhost default during build.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";

const KEYWORDS = [
  "sell my trucking LLC",
  "sell logistics company",
  "buy Amazon Relay LLC",
  "sell Amazon Relay business",
  "MC authority for sale",
  "sell MC number",
  "buy trucking LLC",
  "logistics LLC acquisition",
  "Amazon Relay acquisition",
  "trucking company buyer",
  "owner-operator exit",
  "DOT authority transfer",
  "trucking M&A",
  "sell trucking business with insurance",
  "fresh MC authority sale",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} — We buy US logistics LLCs & Amazon Relay carriers`,
    template: `%s · ${SITE.name}`,
  },
  description:
    "Veritor Group acquires US logistics LLCs — including carriers with active Amazon Relay contracts. Written offers, two-week close, 40+ acquisitions completed. Operator-led, not brokers.",
  keywords: KEYWORDS,
  applicationName: SITE.name,
  authors: [{ name: SITE.legalName }],
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  openGraph: {
    // Image is auto-injected by `src/app/opengraph-image.tsx` (Next.js
    // file convention) — don't set `images` here or it'll override the
    // dynamic OG.
    type: "website",
    siteName: SITE.name,
    locale: "en_US",
    alternateLocale: ["es", "ru"],
    url: SITE_URL,
    title: `${SITE.name} — We buy US logistics LLCs & Amazon Relay carriers`,
    description:
      "Veritor Group acquires US logistics LLCs — written offers, closed in under two weeks. 40+ acquisitions completed.",
  },
  twitter: {
    // Same — Next.js falls back to opengraph-image when no twitter-image
    // is defined.
    card: "summary_large_image",
    title: `${SITE.name} — We buy US logistics LLCs`,
    description:
      "Operator-led acquirer of US logistics LLCs and Amazon Relay carriers. Written offers, two-week close.",
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      es: "/es",
      ru: "/ru",
      "x-default": "/",
    },
    types: {
      "application/rss+xml": "/blog/feed.xml",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0b] text-white">
        <OrganizationSchema />
        <WebSiteSchema />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AttributionCapture />
        {children}
        <CookieBanner />
        <AnalyticsGate />
      </body>
    </html>
  );
}
