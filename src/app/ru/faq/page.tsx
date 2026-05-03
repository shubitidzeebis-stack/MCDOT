import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { FAQ } from "@/components/FAQ";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { BreadcrumbSchema, FAQPageSchema } from "@/components/seo/Schema";
import { DICT, flattenFaqItems } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Частые вопросы — Продажа логистической LLC",
  description:
    "Частые вопросы о продаже LLC: сроки, что передаётся, активные кредиты, конфиденциальность, особенности Amazon Relay, что если LLC не подходит.",
  alternates: { canonical: "/ru/faq", languages: { en: "/faq", es: "/es/faq", ru: "/ru/faq" } },
};

export default function FaqRu() {
  const faqs = flattenFaqItems(DICT.ru.faq);
  return (
    <>
      <FAQPageSchema items={faqs} />
      <BreadcrumbSchema items={[{ name: "Главная", url: "/ru" }, { name: "Вопросы" }]} />
      <Header locale="ru" />
      <main id="main" className="relative pt-16">
        <FAQ locale="ru" />
        <ContactForm locale="ru" />
      </main>
      <Footer locale="ru" />
      <MobileCTA locale="ru" />
    </>
  );
}
