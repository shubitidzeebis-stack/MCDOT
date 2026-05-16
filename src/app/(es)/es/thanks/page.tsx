import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ThanksContent } from "@/components/ThanksContent";

export const metadata: Metadata = {
  title: "Gracias — su consulta está registrada",
  description: "Recibimos sus datos y le contactaremos en breve.",
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  return (
    <>
      <Header locale="es" />
      <ThanksContent locale="es" />
      <Footer locale="es" />
    </>
  );
}
