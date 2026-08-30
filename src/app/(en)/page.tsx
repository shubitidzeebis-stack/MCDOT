import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { LiveTicker } from "@/components/LiveTicker";
import { Requirements } from "@/components/Requirements";
import { HowItWorks } from "@/components/HowItWorks";
import { WhyVeritor } from "@/components/WhyVeritor";
import { Testimonials } from "@/components/Testimonials";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { ServiceSchema } from "@/components/seo/Schema";

export default function Home() {
  return (
    <>
      <ServiceSchema
        name="Veritor Group — US trucking company sales"
        description="Sell a US trucking company, including carriers running Amazon Relay. Free FMCSA valuation, written offer in 24 hours, in-person bank closing in 3–5 business days. No fees or commission to the seller — every sale closed in person and documented."
        url="/"
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <Hero locale="en" />
        <LiveTicker />
        <TrustBar locale="en" />
        <Requirements locale="en" />
        <HowItWorks locale="en" />
        <WhyVeritor locale="en" />
        <Testimonials />
        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
