import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { ContactForm } from "@/components/ContactForm";
import { ExitIntent } from "@/components/ExitIntent";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";

export const metadata: Metadata = {
  title: "Контакты — Бесплатная оценка вашей LLC",
  description:
    "Отправьте данные о вашей LLC и получите письменную оценку в течение нескольких часов. Телефон, email и WhatsApp. Без обязательств.",
  alternates: { canonical: "/ru/contact", languages: { en: "/contact", es: "/es/contact", ru: "/ru/contact" } },
};

export default function ContactRu() {
  return (
    <>
      <Header locale="ru" />
      <main id="main" className="relative pt-16">
        <ContactForm locale="ru" />
      </main>
      <ExitIntent />
      <Footer locale="ru" />
      <MobileCTA locale="ru" />
    </>
  );
}
