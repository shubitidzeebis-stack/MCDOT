import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { HowItWorks } from "@/components/HowItWorks";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";

export const metadata: Metadata = {
  title: "Cómo funciona — Vender su LLC en 4 pasos",
  description:
    "Venda su LLC de logística en cuatro pasos: envíe los datos, reciba una oferta por escrito, firme y verifique, transferencia y cierre. Mayoría cierra en menos de dos semanas.",
  alternates: { canonical: "/es/how-it-works", languages: { en: "/how-it-works", es: "/es/how-it-works", ru: "/ru/how-it-works" } },
};

export default function HowItWorksEs() {
  return (
    <>
      <Header locale="es" />
      <main id="main" className="relative">
        <PageHero
          image="/how-it-works/handshake-keys.png"
          alt="Apretón de manos sobre un contrato de compra y llaves de camión"
          eyebrow="Cómo funciona"
          headlineLine1="Cuatro pasos,"
          headlineLine2="dos semanas o menos."
          subhead="Envíe sus datos, reciba una oferta por escrito en horas, firme y verifique, transferencia y cierre. La mayoría cierra dentro de dos semanas."
          objectPosition="object-[50%_35%]"
        />
        <HowItWorks locale="es" compact />
        <ContactForm locale="es" />
      </main>
      <Footer locale="es" />
      <MobileCTA locale="es" />
    </>
  );
}
