import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { WhyVeritor } from "@/components/WhyVeritor";
import { TrustBar } from "@/components/TrustBar";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";

export const metadata: Metadata = {
  title: "Why sellers choose Veritor Group",
  description:
    "Veritor is operator-led, not brokers. We close fast on US logistics LLCs, pay legal fees on our side, write offers on paper, and keep seller identity confidential. 400+ LLCs closed.",
  keywords: [
    "Veritor Group reviews",
    "best trucking LLC buyer",
    "operator LLC acquirer",
    "trustworthy trucking company buyer",
    "fastest LLC sale",
    "confidential trucking M&A",
    "Amazon Relay carrier acquirer",
  ],
  alternates: { canonical: "/why-veritor" },
  openGraph: {
    title: "Why sellers choose Veritor Group",
    description:
      "Operators buying from operators. Written offers, close in 3–5 business days, full transfer handled, complete confidentiality.",
    url: "/why-veritor",
  },
};

export default function WhyVeritorPage() {
  return (
    <>
      <Header locale="en" />
      <main id="main" className="relative pt-16">
        <TrustBar locale="en" />
        <WhyVeritor locale="en" />
        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
