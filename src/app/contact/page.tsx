import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";

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
  alternates: { canonical: "/contact" },
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
      <Header locale="en" />
      <main id="main" className="relative pt-16">
        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
