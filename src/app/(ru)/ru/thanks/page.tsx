import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ThanksContent } from "@/components/ThanksContent";

export const metadata: Metadata = {
  title: "Спасибо — ваш запрос принят",
  description: "Мы получили ваши данные и скоро свяжемся с вами.",
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  return (
    <>
      <Header locale="ru" />
      <ThanksContent locale="ru" />
      <Footer locale="ru" />
    </>
  );
}
