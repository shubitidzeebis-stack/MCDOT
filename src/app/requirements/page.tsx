import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { Requirements } from "@/components/Requirements";
import { EditorialBlock } from "@/components/EditorialBlock";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { BreadcrumbSchema, ServiceSchema } from "@/components/seo/Schema";

export const metadata: Metadata = {
  title: "Requirements — What we buy",
  description:
    "Veritor Group acquires US logistics LLCs that meet two profiles: active Amazon Relay contracts (insurance can be inactive), or fresh MC authority under 180 days old with active insurance. See the exact criteria.",
  keywords: [
    "MC authority for sale",
    "sell trucking LLC requirements",
    "Amazon Relay LLC qualifications",
    "MC number 180 days",
    "sell LLC with active insurance",
    "trucking company buyer requirements",
    "owner-operator LLC sale criteria",
  ],
  alternates: { canonical: "/requirements" },
  openGraph: {
    title: "What Veritor Group buys — LLC acquisition criteria",
    description:
      "Two profiles: Amazon Relay carriers (insurance flexible) or fresh MC authority under 180 days. Clean violation history. Full transfer at closing.",
    url: "/requirements",
    images: ["/requirements/document-table.png"],
  },
};

export default function RequirementsPage() {
  return (
    <>
      <ServiceSchema
        name="Logistics LLC acquisition — US"
        description="Acquisition of US logistics LLCs and Amazon Relay carriers with active insurance, valid MC authority, and clean violation history."
        url="/requirements"
      />
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Requirements" }]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/requirements/document-table.png"
          alt="Top-down flat lay on a warm walnut desk — folder with documents, fountain pen, set of truck keys on a leather fob, smartphone"
          eyebrow="Requirements"
          headlineLine1="Clear requirements."
          headlineLine2="No guesswork."
          objectPosition="object-center"
        />
        <Requirements locale="en" compact />

        <EditorialBlock
          eyebrow="The reasoning"
          heading={
            <>
              Why these <span className="italic font-light text-white/85">specific criteria.</span>
            </>
          }
        >
          <p>
            We acquire two distinct types of US logistics LLCs because they map to two
            different operating plans on our side. An LLC that already runs Amazon Relay
            is the contract — we step into an existing book of work the moment the
            ownership transfer closes. An LLC with fresh MC authority under 180 days old
            is a clean operating shell we can onboard into Amazon Relay or other freight
            networks immediately, before any violation history accumulates.
          </p>
          <h3>Active vs. inactive insurance</h3>
          <p>
            Carriers with an active Amazon Relay contract can have inactive insurance —
            we re-bind coverage as part of closing. Carriers without Relay must have an
            in-force policy, because Amazon&rsquo;s onboarding requires continuous
            coverage history.
          </p>
          <h3>The 180-day MC authority rule</h3>
          <p>
            Amazon Relay&rsquo;s onboarding logic favors fresh authority with no operating
            history. After roughly six months, MC numbers without operating activity
            become harder to onboard, and any small violations weigh more heavily against
            approval. That&rsquo;s why we draw a clean line at 180 days.
          </p>
          <h3>What &ldquo;good standing on violations&rdquo; means</h3>
          <p>
            We pull FMCSA records as part of diligence. Minor or resolved violations are
            usually fine. Out-of-service orders, unsafe-driving thresholds, or HOS
            pattern violations make an LLC much harder to operate post-close, and we
            generally pass on those.
          </p>
          <h3>Active loans</h3>
          <p>
            Outstanding equipment or working-capital loans are not a deal-breaker.
            Disclose them up front and we structure the payoff at closing — funds wired
            direct to the lender, remainder to you.
          </p>
        </EditorialBlock>

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
