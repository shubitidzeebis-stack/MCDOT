import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { FAQ } from "@/components/FAQ";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { BreadcrumbSchema, FAQPageSchema } from "@/components/seo/Schema";
import { DICT, flattenFaqItems } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Preguntas frecuentes — Vender una LLC de logística",
  description:
    "Preguntas comunes al vender una LLC de transporte: tiempos, qué se transfiere, préstamos activos, confidencialidad, Amazon Relay, qué pasa si su LLC no califica.",
  alternates: {
    canonical: "/es/faq",
    languages: {
      "en-US": "/faq",
      es: "/es/faq",
      ru: "/ru/faq",
      "x-default": "/faq",
    },
  },
};

export default function FaqEs() {
  const faqs = flattenFaqItems(DICT.es.faq);
  return (
    <>
      <FAQPageSchema items={faqs} />
      <BreadcrumbSchema items={[{ name: "Inicio", url: "/es" }, { name: "Preguntas" }]} />
      <Header locale="es" />
      <main id="main" className="relative pt-16">
        <FAQ locale="es" />
        <ContactForm locale="es" />
      </main>
      <Footer locale="es" />
      <MobileCTA locale="es" />
    </>
  );
}
