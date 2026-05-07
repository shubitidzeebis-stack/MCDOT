import type { Metadata } from "next";
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
    },
  },
  robots: { index: true, follow: true },
};

export default function GetOfferEsPage() {
  return (
    <main id="main">
      <ValuationWizard locale="es" />
    </main>
  );
}
