import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { Requirements } from "@/components/Requirements";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";

export const metadata: Metadata = {
  title: "Requisitos — Qué LLCs compramos",
  description:
    "Veritor Group adquiere LLCs de logística en EE. UU. Dos perfiles: con contrato activo de Amazon Relay, o autoridad MC nueva (menos de 180 días). Vea los criterios exactos.",
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
