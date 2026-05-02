import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { FAQ } from "@/components/FAQ";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { BreadcrumbSchema, FAQPageSchema } from "@/components/seo/Schema";
import { DICT, flattenFaqItems } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "FAQ — Selling a US logistics LLC",
  description:
    "Common questions about selling a trucking LLC: timeline, what transfers, active loans, confidentiality, qualification, Amazon Relay specifics, and what happens if your LLC doesn't fit.",
  keywords: [
    "selling trucking LLC FAQ",
    "how long to sell trucking company",
    "what transfers when selling LLC",
    "trucking LLC sale confidentiality",
    "sell LLC with active loan",
    "Amazon Relay LLC questions",
    "MC authority transfer questions",
  ],
  alternates: { canonical: "/faq" },
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
      <Header locale="en" />
      <main id="main" className="relative pt-16">
        <FAQ locale="en" />
        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
