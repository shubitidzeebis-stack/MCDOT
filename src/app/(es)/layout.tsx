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

// Spanish root layout. Hardcoded `lang="es"` — no `headers()` call.

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} — Compramos LLCs de logística en EE. UU.`,
    template: `%s · ${SITE.name}`,
  },
  description:
    "Veritor Group adquiere LLCs de logística en EE. UU. y carriers con Amazon Relay activo. Ofertas por escrito, cierre en 3–5 días hábiles.",
  applicationName: SITE.name,
  authors: [{ name: SITE.legalName }],
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "es_US",
    alternateLocale: ["en_US", "ru"],
    url: `${SITE_URL}/es`,
  },
  twitter: { card: "summary_large_image" },
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
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0b] text-white">
        <OrganizationSchema />
        <LocalBusinessSchema />
        <WebSiteSchema />
        <a href="#main" className="skip-link">
          Saltar al contenido
        </a>
        <AttributionCapture />
        {children}
        <WhatsAppFAB locale="es" />
        <CookieBanner />
        <AnalyticsGate />
      </body>
    </html>
  );
}
