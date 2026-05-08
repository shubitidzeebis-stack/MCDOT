import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { Requirements } from "@/components/Requirements";
import { EditorialBlock } from "@/components/EditorialBlock";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import {
  BreadcrumbSchema,
  FAQPageSchema,
  ServiceSchema,
} from "@/components/seo/Schema";

export const metadata: Metadata = {
  title: "What Veritor buys — LLC acquisition criteria",
  description:
    "Two profiles: Amazon Relay carriers (insurance flexible) or MC authority + insurance active 6+ months. Clean violation history. Full LLC transfer at closing.",
  keywords: [
    "MC authority for sale",
    "sell trucking LLC requirements",
    "Amazon Relay LLC qualifications",
    "MC number 180 days",
    "sell LLC with active insurance",
    "trucking company buyer requirements",
    "owner-operator LLC sale criteria",
  ],
  alternates: {
    canonical: "/requirements",
    languages: {
      "en-US": "/requirements",
      es: "/es/requirements",
      ru: "/ru/requirements",
      "x-default": "/requirements",
    },
  },
  openGraph: {
    title: "What Veritor Group buys — LLC acquisition criteria",
    description:
      "Two profiles: Amazon Relay carriers (insurance flexible), or MC authority + insurance active for 6+ months. Clean violation history. Full transfer at closing.",
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
      <FAQPageSchema
        items={[
          {
            q: "Does my LLC qualify if insurance is currently inactive?",
            a: "It depends on whether the LLC has an active Amazon Relay contract. Carriers with an active Relay contract can have inactive insurance — Veritor re-binds coverage as part of closing. Carriers without Relay must have an in-force policy because Amazon's onboarding requires continuous coverage history.",
          },
          {
            q: "Why does Veritor require 180 days of active MC authority and insurance?",
            a: "Amazon Relay won't onboard a carrier until the MC authority and the BIPD insurance policy attached to it have been continuously active for at least 180 days. Veritor specifically looks for LLCs past that 6-month mark — the authority is mature enough for Relay onboarding but still fresh enough to have a clean operating record.",
          },
          {
            q: "What does 'good standing on violations' mean for a trucking LLC sale?",
            a: "Veritor pulls FMCSA records as part of diligence. Minor or resolved violations are usually fine. Out-of-service orders, unsafe-driving thresholds, or Hours-of-Service pattern violations make an LLC much harder to operate post-close, and Veritor generally passes on those.",
          },
          {
            q: "Can I sell a trucking LLC that has an active loan on a truck?",
            a: "Yes, if the truck is titled to the LLC and the lien is paid off at closing. Veritor coordinates the payoff wire directly with the lender — the purchase price splits between the lender (for payoff) and the seller (for the remainder). If the seller wants to keep the truck, the truck and loan are excluded from the LLC sale.",
          },
          {
            q: "What transfers when a trucking LLC is sold?",
            a: "In an equity sale: the LLC entity, MC authority, DOT records, EIN, company phone number, company email account, company bank account, and any vehicle titles (if the seller includes them). Active Amazon Relay contracts continue because they're bound to the LLC entity, not to the individual owner.",
          },
          {
            q: "Can I sell only the MC number and keep the LLC?",
            a: "No. FMCSA prohibits selling, leasing, or transferring an MC or DOT number outside a legitimate sale of the underlying entity. The number stays with the entity. What transfers is the LLC; the MC number moves with it.",
          },
        ]}
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
            ownership transfer closes. An LLC with at least six months of paid insurance
            and active MC authority is a clean operating shell we can onboard into
            Amazon Relay or other freight networks the moment we take over.
          </p>
          <h3>Active vs. inactive insurance</h3>
          <p>
            Carriers with an active Amazon Relay contract can have inactive insurance —
            we re-bind coverage as part of closing. Carriers without Relay must have an
            in-force policy, because Amazon&rsquo;s onboarding requires continuous
            coverage history.
          </p>
          <h3>The six-month minimum (insurance + MC authority)</h3>
          <p>
            Amazon Relay won&rsquo;t onboard a carrier until the MC authority and the
            BIPD insurance policy attached to it have been continuously active for at
            least 180 days. They look for a real paper trail: six months of premium
            payments, six months of FMCSA standing, six months without lapses. That&rsquo;s
            why we&rsquo;re specifically looking for LLCs that are <strong>past</strong>{" "}
            that 6-month mark — the authority is mature enough for Relay onboarding but
            still fresh enough to have a clean operating record. If your MC has been
            paying insurance and active for six months or more, you&rsquo;re in the
            sweet spot.
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
