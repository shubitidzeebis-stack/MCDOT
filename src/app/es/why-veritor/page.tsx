import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { TrustBar } from "@/components/TrustBar";
import { WhyVeritor } from "@/components/WhyVeritor";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";

export const metadata: Metadata = {
  title: "Por qué Veritor",
  description:
    "Operadores comprando a operadores. Cierre rápido, ofertas por escrito, transferencia completa, confidencialidad total. 40+ adquisiciones completadas.",
  alternates: { canonical: "/es/why-veritor", languages: { en: "/why-veritor", es: "/es/why-veritor", ru: "/ru/why-veritor" } },
};

export default function WhyVeritorEs() {
  return (
    <>
      <Header locale="es" />
      <main id="main" className="relative pt-16">
        <TrustBar locale="es" />
        <WhyVeritor locale="es" />
        <ContactForm locale="es" />
      </main>
      <Footer locale="es" />
      <MobileCTA locale="es" />
    </>
  );
}
