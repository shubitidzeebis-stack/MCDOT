import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { Requirements } from "@/components/Requirements";
import { HowItWorks } from "@/components/HowItWorks";
import { WhyVeritor } from "@/components/WhyVeritor";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";

export const metadata: Metadata = {
  title: "Veritor Group — Выкупаем логистические LLC в США",
  description:
    "Veritor Group покупает логистические LLC в США, в том числе с действующим контрактом Amazon Relay. Быстрое закрытие, честная цена. Более 40 успешных сделок.",
  alternates: {
    canonical: "/ru",
    languages: {
      "en-US": "/",
      es: "/es",
      ru: "/ru",
      "x-default": "/",
    },
  },
  openGraph: { locale: "ru_RU" },
};

export default function HomeRU() {
  return (
    <>
      <Header locale="ru" />
      <main id="main" className="relative">
        <Hero locale="ru" />
        <TrustBar locale="ru" />
        <Requirements locale="ru" />
        <HowItWorks locale="ru" />
        <WhyVeritor locale="ru" />
        <ContactForm locale="ru" />
      </main>
      <Footer locale="ru" />
      <MobileCTA locale="ru" />
    </>
  );
}
