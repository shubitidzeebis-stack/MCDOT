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
        name="Veritor Group — US logistics LLC acquisition"
        description="Acquisition of US logistics LLCs and Amazon Relay carriers. Written offers, two-week close, 40+ acquisitions completed."
        url="/"
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <Hero locale="en" />
        <LiveTicker />
        <TrustBar locale="en" />
        <Requirements locale="en" />
        <Testimonials />
        <HowItWorks locale="en" />
        <WhyVeritor locale="en" />
        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
