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
  title: { absolute: "Veritor Group — Venda su empresa de transporte en 3–5 días" },
  description:
    "Venda su empresa de transporte en EE. UU. — incluidos los carriers que operan con Amazon Relay. Valuación FMCSA gratuita, oferta por escrito en 24 horas, cierre en 3–5 días hábiles. Sin comisiones.",
  alternates: {
    canonical: "/es",
    languages: {
      "en-US": "/",
      es: "/es",
      ru: "/ru",
      "x-default": "/",
    },
  },
  openGraph: { locale: "es_US", images: [DEFAULT_OG_IMAGE] },
};

export default function HomeES() {
  return (
    <>
      <Header locale="es" />
      <main id="main" className="relative">
        <Hero locale="es" />
        <TrustBar locale="es" />
        <Requirements locale="es" />
        <HowItWorks locale="es" />
        <WhyVeritor locale="es" />
        <ContactForm locale="es" />
      </main>
      <Footer locale="es" />
      <MobileCTA locale="es" />
    </>
  );
}
