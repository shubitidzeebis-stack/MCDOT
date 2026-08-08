import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { Requirements } from "@/components/Requirements";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";

export const metadata: Metadata = {
  title: "Requisitos — Qué LLCs califican",
  description:
    "Dos perfiles: carriers con Amazon Relay (seguro vencido es manejable), o autoridad y seguro activos de forma continua 180+ días. Historial de violaciones limpio, calificación de seguridad no Conditional. Traspaso completo al cierre.",
  alternates: {
    canonical: "/es/requirements",
    languages: {
      "en-US": "/requirements",
      es: "/es/requirements",
      ru: "/ru/requirements",
      "x-default": "/requirements",
    },
  },
};

export default function RequirementsEs() {
  return (
    <>
      <Header locale="es" />
      <main id="main" className="relative">
        <PageHero
          image="/requirements/document-table.png"
          alt="Mesa de roble con carpeta, pluma fuente, llaves de camión y smartphone"
          eyebrow="Requisitos"
          headlineLine1="Requisitos claros."
          headlineLine2="Sin sorpresas."
        />
        <Requirements locale="es" compact />
        <ContactForm locale="es" />
      </main>
      <Footer locale="es" />
      <MobileCTA locale="es" />
    </>
  );
}
