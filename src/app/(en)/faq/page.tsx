import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { FAQ } from "@/components/FAQ";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import {
  BreadcrumbSchema,
  FAQPageSchema,
  SpeakableSchema,
} from "@/components/seo/Schema";
import { DICT, flattenFaqItems } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "FAQ — Selling a US logistics LLC",
  description:
    "Answers to common questions about selling a trucking LLC: MC authority age, insurance status, Amazon Relay contracts, timeline, transfers, and wire transfer.",
  keywords: [
    "selling trucking LLC FAQ",
    "how long to sell trucking company",
    "what transfers when selling LLC",
    "trucking LLC sale confidentiality",
    "sell LLC with active loan",
    "Amazon Relay LLC questions",
    "MC authority transfer questions",
  ],
  alternates: {
    canonical: "/faq",
    languages: {
      "en-US": "/faq",
      es: "/es/faq",
      ru: "/ru/faq",
      "x-default": "/faq",
    },
  },
  openGraph: {
    title: "FAQ — Selling a US logistics LLC | Veritor Group",
    description:
      "Timeline, transfer scope, debt, confidentiality, Amazon Relay specifics — the questions sellers ask before signing.",
    url: "/faq",
  },
};

export default function FAQPage() {
  const faqs = flattenFaqItems(DICT.en.faq);
  return (
    <>
      <FAQPageSchema items={faqs} />
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "FAQ" }]} />
      <SpeakableSchema cssSelector={["h1", "h2", "h3"]} />
      <Header locale="en" />
      <main id="main" className="relative pt-16">
        <h1 className="sr-only">FAQ — selling a US logistics LLC</h1>
        <FAQ locale="en" />
        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
