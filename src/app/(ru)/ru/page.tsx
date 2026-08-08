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
import { DEFAULT_OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  // `absolute` bypasses the layout's "%s · Veritor Group" template — the
  // brand is already in this title, and letting the template run appends
  // it a second time.
  title: { absolute: "Veritor Group — Продайте транспортную компанию за 3–5 дней" },
  description:
    "Продайте свою транспортную компанию в США — включая перевозчиков, работающих с Amazon Relay. Бесплатная оценка по данным FMCSA, письменный оффер за 24 часа, закрытие за 3–5 рабочих дней. Без комиссий.",
  alternates: {
    canonical: "/ru",
    languages: {
      "en-US": "/",
      es: "/es",
      ru: "/ru",
      "x-default": "/",
    },
  },
  openGraph: { locale: "ru_RU", images: [DEFAULT_OG_IMAGE] },
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
