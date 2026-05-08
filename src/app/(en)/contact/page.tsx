import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { ContactForm } from "@/components/ContactForm";
import { ExitIntent } from "@/components/ExitIntent";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { BreadcrumbSchema } from "@/components/seo/Schema";

export const metadata: Metadata = {
  title: "Contact — Get a free LLC valuation",
  description:
    "Send your trucking LLC details and get a free written valuation within hours. Phone, email, and WhatsApp available. No obligation, no fee, no broker.",
  keywords: [
    "contact Veritor Group",
    "free trucking LLC valuation",
    "sell my LLC contact",
    "Amazon Relay LLC offer",
    "MC authority valuation",
  ],
  alternates: {
    canonical: "/contact",
    languages: {
      "en-US": "/contact",
      es: "/es/contact",
      ru: "/ru/contact",
      "x-default": "/contact",
    },
  },
  openGraph: {
    title: "Contact Veritor Group — Free LLC valuation",
    description:
      "Send LLC details, receive a written valuation within hours. Phone, email, WhatsApp.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Contact" }]}
      />
      <Header locale="en" />
      <main id="main" className="relative pt-16">
        <h1 className="sr-only">Contact Veritor Group — get a written offer on your trucking LLC</h1>
        <ContactForm locale="en" />
      </main>
      <ExitIntent />
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
