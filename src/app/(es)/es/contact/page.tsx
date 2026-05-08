import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { ContactForm } from "@/components/ContactForm";
import { ExitIntent } from "@/components/ExitIntent";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";

export const metadata: Metadata = {
  title: "Contacto — Valuación gratis de su LLC",
  description:
    "Envíenos los datos de su LLC y reciba una valuación por escrito en pocas horas. Teléfono, email y WhatsApp disponibles. Sin compromiso.",
  alternates: {
    canonical: "/es/contact",
    languages: {
      "en-US": "/contact",
      es: "/es/contact",
      ru: "/ru/contact",
      "x-default": "/contact",
    },
  },
};

export default function ContactPageEs() {
  return (
    <>
      <Header locale="es" />
      <main id="main" className="relative pt-16">
        <ContactForm locale="es" />
      </main>
      <ExitIntent />
      <Footer locale="es" />
      <MobileCTA locale="es" />
    </>
  );
}
