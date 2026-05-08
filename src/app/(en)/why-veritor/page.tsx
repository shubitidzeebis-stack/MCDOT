import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { WhyVeritor } from "@/components/WhyVeritor";
import { TrustBar } from "@/components/TrustBar";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { BreadcrumbSchema, ServiceSchema } from "@/components/seo/Schema";

export const metadata: Metadata = {
  title: "Why sell to Veritor — operators, not brokers",
  description:
    "We're operators, not brokers. Every LLC goes into our operating book — that's why we move fast and pay fair. 400+ US logistics LLCs acquired.",
  keywords: [
    "Veritor Group reviews",
    "best trucking LLC buyer",
    "operator LLC acquirer",
    "trustworthy trucking company buyer",
    "fastest LLC sale",
    "confidential trucking M&A",
    "Amazon Relay carrier acquirer",
  ],
  alternates: {
    canonical: "/why-veritor",
    languages: {
      "en-US": "/why-veritor",
      es: "/es/why-veritor",
      ru: "/ru/why-veritor",
      "x-default": "/why-veritor",
    },
  },
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
      <ServiceSchema
        name="Operator-led trucking LLC acquisition"
        description="Operator-led acquisition of US logistics LLCs and Amazon Relay carriers. Written offers, 3–5 business day close, full transfer handled, complete confidentiality."
        url="/why-veritor"
      />
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Why Veritor" }]}
      />
      <Header locale="en" />
      <main id="main" className="relative pt-16">
        <h1 className="sr-only">Why sellers choose Veritor Group to buy their trucking LLC</h1>
        <TrustBar locale="en" />
        <WhyVeritor locale="en" />
        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
