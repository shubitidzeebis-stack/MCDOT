import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AnalyticsGate } from "@/components/AnalyticsGate";
import { AttributionCapture } from "@/components/AttributionCapture";
import { CookieBanner } from "@/components/CookieBanner";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import {
  LocalBusinessSchema,
  OrganizationSchema,
  WebSiteSchema,
} from "@/components/seo/Schema";
import { SITE } from "@/lib/site";
import "../globals.css";

// English root layout. Hardcoded `lang="en"` — no `headers()` call,
// which means every page rendered under this group is statically
// generatable and edge-cacheable. Replaces the old single-root layout
// pattern that opted the entire site into dynamic rendering.

const inter = Inter({
  variable: "--font-inter",
  // English-only: drop Cyrillic subsets to save ~43KB of preloaded
  // font payload per page.
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

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
    "Veritor Group acquires US logistics LLCs and Amazon Relay carriers. Written offers, close in 3–5 business days. 400+ LLCs closed nationwide.",
  keywords: KEYWORDS,
  applicationName: SITE.name,
  authors: [{ name: SITE.legalName }],
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_US",
    alternateLocale: ["es", "ru"],
    url: SITE_URL,
    title: `${SITE.name} — We buy US logistics LLCs & Amazon Relay carriers`,
    description:
      "Veritor Group acquires US logistics LLCs — written offers, closed in 3–5 business days. 400+ LLCs closed.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — We buy US logistics LLCs`,
    description:
      "Operator-led acquirer of US logistics LLCs and Amazon Relay carriers. Written offers, close in 3–5 business days.",
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
  verification: {
    google: "bQWOKwbXkSkIDHuV2KBtyYnXA6KsPmvGYrOoAdDkXJI",
    other: {
      "msvalidate.01": "EC004A9D9176E1CB6ECF98E9FC295C4E",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0b] text-white">
        <OrganizationSchema />
        <LocalBusinessSchema />
        <WebSiteSchema />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AttributionCapture />
        {children}
        <WhatsAppFAB locale="en" />
        <CookieBanner />
        <AnalyticsGate />
      </body>
    </html>
  );
}
