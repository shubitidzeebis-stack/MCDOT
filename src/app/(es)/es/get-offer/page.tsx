import type { Metadata } from "next";
import { Suspense } from "react";
import { ValuationWizard } from "@/components/ValuationWizard";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Valuación gratis — ${SITE.name}`,
  description:
    "Obtenga un rango de valuación escrita de su LLC de logística en 90 segundos. Datos públicos de FMCSA, sin compromiso.",
  alternates: {
    canonical: "/es/get-offer",
    languages: {
      "en-US": "/get-offer",
      es: "/es/get-offer",
      ru: "/ru/get-offer",
      "x-default": "/get-offer",
    },
  },
  robots: { index: true, follow: true },
};

export default function GetOfferEsPage() {
  return (
    <main id="main">
      <Suspense fallback={null}>
        <ValuationWizard locale="es" />
      </Suspense>
    </main>
  );
}
