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

// Russian root layout. Hardcoded `lang="ru"`. Inter loads Cyrillic
// subsets here only — English/Spanish pages ship without them.

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} — Выкупаем логистические LLC в США`,
    template: `%s · ${SITE.name}`,
  },
  description:
    "Veritor Group покупает логистические LLC в США, в том числе с действующим контрактом Amazon Relay. Письменные офферы, закрытие за 3–5 рабочих дней.",
  applicationName: SITE.name,
  authors: [{ name: SITE.legalName }],
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "ru_RU",
    alternateLocale: ["en_US", "es"],
    url: `${SITE_URL}/ru`,
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
    <html lang="ru" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0b] text-white">
        <OrganizationSchema />
        <LocalBusinessSchema />
        <WebSiteSchema />
        <a href="#main" className="skip-link">
          Перейти к содержимому
        </a>
        <AttributionCapture />
        {children}
        <WhatsAppFAB locale="ru" />
        <CookieBanner />
        <AnalyticsGate />
      </body>
    </html>
  );
}
