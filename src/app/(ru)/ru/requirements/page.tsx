import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { Requirements } from "@/components/Requirements";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";

export const metadata: Metadata = {
  title: "Требования — Какие LLC мы покупаем",
  description:
    "Veritor Group выкупает логистические LLC в США. Два профиля: с активным контрактом Amazon Relay или с MC authority младше 180 дней. Точные критерии.",
  alternates: {
    canonical: "/ru/requirements",
    languages: {
      "en-US": "/requirements",
      es: "/es/requirements",
      ru: "/ru/requirements",
      "x-default": "/requirements",
    },
  },
};

export default function RequirementsRu() {
  return (
    <>
      <Header locale="ru" />
      <main id="main" className="relative">
        <PageHero
          image="/requirements/document-table.png"
          alt="Стол из ореха с папкой документов, перьевой ручкой, ключами от грузовика и смартфоном"
          eyebrow="Требования"
          headlineLine1="Чёткие требования."
          headlineLine2="Никаких догадок."
        />
        <Requirements locale="ru" compact />
        <ContactForm locale="ru" />
      </main>
      <Footer locale="ru" />
      <MobileCTA locale="ru" />
    </>
  );
}
