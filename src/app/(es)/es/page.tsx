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
  title: "Veritor Group — Compramos LLCs de logística en EE. UU.",
  description:
    "Veritor Group adquiere LLCs de logística en EE. UU., incluyendo aquellas con contrato activo de Amazon Relay. Cierre rápido y oferta justa. Más de 40 adquisiciones completadas.",
  alternates: {
    canonical: "/es",
    languages: {
      "en-US": "/",
      es: "/es",
      ru: "/ru",
      "x-default": "/",
    },
  },
  openGraph: { locale: "es_US" },
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
