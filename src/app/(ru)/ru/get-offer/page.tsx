import type { Metadata } from "next";
import { Suspense } from "react";
import { ValuationWizard } from "@/components/ValuationWizard";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Бесплатная оценка — ${SITE.name}`,
  description:
    "Получите диапазон письменной оценки вашей логистической LLC за 90 секунд. Публичные данные FMCSA, без обязательств.",
  alternates: {
    canonical: "/ru/get-offer",
    languages: {
      "en-US": "/get-offer",
      es: "/es/get-offer",
      ru: "/ru/get-offer",
      "x-default": "/get-offer",
    },
  },
  robots: { index: true, follow: true },
};

export default function GetOfferRuPage() {
  return (
    <main id="main">
      <Suspense fallback={null}>
        <ValuationWizard locale="ru" />
      </Suspense>
    </main>
  );
}
