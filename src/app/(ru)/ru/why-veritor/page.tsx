import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { TrustBar } from "@/components/TrustBar";
import { WhyVeritor } from "@/components/WhyVeritor";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";

export const metadata: Metadata = {
  title: "Почему Veritor",
  description:
    "Быстрое закрытие, письменные офферы, полный перевод документов, полная конфиденциальность. Каждая сделка закрывается лично и документируется.",
  alternates: {
    canonical: "/ru/why-veritor",
    languages: {
      "en-US": "/why-veritor",
      es: "/es/why-veritor",
      ru: "/ru/why-veritor",
      "x-default": "/why-veritor",
    },
  },
};

export default function WhyVeritorRu() {
  return (
    <>
      <Header locale="ru" />
      <main id="main" className="relative pt-16">
        <TrustBar locale="ru" />
        <WhyVeritor locale="ru" />
        <ContactForm locale="ru" />
      </main>
      <Footer locale="ru" />
      <MobileCTA locale="ru" />
    </>
  );
}
