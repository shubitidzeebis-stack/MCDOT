import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { HowItWorks } from "@/components/HowItWorks";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";

export const metadata: Metadata = {
  title: "Как это работает — Продажа LLC за 4 шага",
  description:
    "Продайте логистическую LLC за четыре шага: отправьте данные, получите письменный оффер за часы, подпишите и проверьте, перевод и закрытие. Большинство сделок — менее двух недель.",
  alternates: { canonical: "/ru/how-it-works", languages: { en: "/how-it-works", es: "/es/how-it-works", ru: "/ru/how-it-works" } },
};

export default function HowItWorksRu() {
  return (
    <>
      <Header locale="ru" />
      <main id="main" className="relative">
        <PageHero
          image="/how-it-works/handshake-keys.png"
          alt="Рукопожатие над договором купли-продажи и ключами от грузовика"
          eyebrow="Как это работает"
          headlineLine1="Четыре шага,"
          headlineLine2="две недели или меньше."
          subhead="Отправьте данные, получите письменный оффер в течение часов, подпишите и проверьте, перевод и закрытие. Большинство сделок завершается в пределах двух недель."
          objectPosition="object-[50%_35%]"
        />
        <HowItWorks locale="ru" compact />
        <ContactForm locale="ru" />
      </main>
      <Footer locale="ru" />
      <MobileCTA locale="ru" />
    </>
  );
}
