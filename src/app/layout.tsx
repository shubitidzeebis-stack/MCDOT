import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/Schema";
import { SITE } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";

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
    type: "website",
    siteName: SITE.name,
    locale: "en_US",
    alternateLocale: ["es", "ru"],
    url: SITE_URL,
    title: `${SITE.name} — We buy US logistics LLCs & Amazon Relay carriers`,
    description:
      "Veritor Group acquires US logistics LLCs — written offers, closed in under two weeks. 40+ acquisitions completed.",
    images: [
      { url: "/hero/hero1.png", width: 1536, height: 1024, alt: SITE.name },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — We buy US logistics LLCs`,
    description:
      "Operator-led acquirer of US logistics LLCs and Amazon Relay carriers. Written offers, two-week close.",
    images: ["/hero/hero1.png"],
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      es: "/es",
      ru: "/ru",
      "x-default": "/",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0b] text-white">
        <OrganizationSchema />
        <WebSiteSchema />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
