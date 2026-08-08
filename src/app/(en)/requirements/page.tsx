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
  title: "What qualifies — trucking company sale criteria",
  description:
    "Two profiles: Amazon Relay carriers (lapsed insurance workable) or authority plus insurance continuously active 180+ days. Clean violation history, safety rating not Conditional. Full transfer at closing.",
  keywords: [
    "sell trucking company requirements",
    "sell trucking LLC requirements",
    "Amazon Relay carrier qualifications",
    "MC authority 180 days Amazon Relay",
    "sell trucking LLC with lapsed insurance",
    "does my trucking company qualify",
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
    title: "What qualifies — trucking company sale criteria",
    description:
      "Two profiles: Amazon Relay carriers (lapsed insurance workable), or authority plus insurance continuously active 180+ days. Clean violation history. Full transfer at closing.",
    url: "/requirements",
    images: ["/requirements/document-table.png"],
  },
};

export default function RequirementsPage() {
  return (
    <>
      <ServiceSchema
        name="Trucking company sale — US qualification criteria"
        description="Sale criteria for US trucking companies and Amazon Relay carriers: active MC authority in good standing, continuous insurance history, clean violation record, and a safety rating that is not Conditional or Unsatisfactory."
        url="/requirements"
      />
      <FAQPageSchema
        items={[
          {
            q: "Does my company qualify if insurance is currently lapsed?",
            a: "It depends on whether the company has an active Amazon Relay contract. A Relay carrier can have lapsed coverage — Relay blocks booking while insurance is off, but access resumes once coverage is re-bound, and that happens as part of closing. A company without Relay needs an in-force policy, because Amazon's 180-day onboarding clock measures continuous coverage and a lapse resets what that record shows.",
          },
          {
            q: "Why does the 180-day mark matter so much?",
            a: "Amazon Relay will not onboard a carrier until the MC authority and the BIPD insurance policy attached to it have been continuously active for at least 180 days. That is Amazon's own published rule, and it is the single hardest gate to get through. A company past that mark is worth materially more than one approaching it, because the waiting is already done.",
          },
          {
            q: "What violation history disqualifies a trucking company?",
            a: "FMCSA records get pulled as part of diligence. Minor or resolved violations are usually fine. What is not a fit: a Conditional or Unsatisfactory safety rating, authority that has been revoked or is not authorised to operate, and a high out-of-service rate. Amazon's own thresholds run stricter than the federal ones — under 60% on Unsafe Driving and Hours-of-Service, under 75% on Vehicle Maintenance, Controlled Substances and Driver Fitness — so a record that clears FMCSA can still fail Relay.",
          },
          {
            q: "Can I sell a trucking company that has an active loan on a truck?",
            a: "Yes, if the truck is titled to the LLC and the lien is paid off at closing. The payoff is coordinated directly with the lender: the price splits between the lender and you, and you take the remainder. If you would rather keep the truck, the truck and the loan are excluded from the sale.",
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
            Two profiles qualify, and both of them come back to the same thing: Amazon
            Relay. A company already running Relay carries the contract itself, which is
            the most valuable configuration there is. A company past 180 days with
            continuous insurance is one that can get through Relay onboarding. Everything
            below is downstream of Amazon&rsquo;s own published rules, not ours.
          </p>
          <h3>Lapsed vs. active insurance</h3>
          <p>
            These are two different answers depending on Relay. A carrier that already
            holds a Relay contract can have lapsed coverage — Amazon blocks booking while
            insurance is off, but the account isn&rsquo;t gone, and access resumes once
            coverage is re-bound at closing. A carrier <strong>without</strong> Relay
            needs a policy in force, because the 180-day clock measures continuous
            coverage and a lapse is exactly what it&rsquo;s looking for.
          </p>
          <h3>The 180-day minimum</h3>
          <p>
            Amazon won&rsquo;t onboard a carrier until the MC authority and the BIPD
            policy attached to it have been continuously active for at least 180 days.
            They want a real paper trail: six months of premium payments, six months of
            FMCSA standing, six months without a gap. A company <strong>past</strong>{" "}
            that mark is worth materially more than one approaching it, because the
            waiting is already done and it can&rsquo;t be shortcut.
          </p>
          <h3>Safety rating and violations</h3>
          <p>
            FMCSA records get pulled as part of diligence, and minor or resolved
            violations are usually fine. What isn&rsquo;t a fit: a{" "}
            <strong>Conditional or Unsatisfactory safety rating</strong>, authority that
            has been <strong>revoked or is not authorised to operate</strong>, and a{" "}
            <strong>high out-of-service rate</strong>. Amazon screens tighter than the
            federal thresholds — under 60% on Unsafe Driving and Hours-of-Service, under
            75% on Vehicle Maintenance, Controlled Substances and Driver Fitness — plus,
            since early 2026, a driver violation rate at or under 35% and a vehicle
            violation rate at or under 50%. A record that clears FMCSA can still fail
            Relay. If yours is in that territory you&rsquo;ll hear so the same day rather
            than being strung along.
          </p>
          <h3>Active loans</h3>
          <p>
            Outstanding equipment or working-capital loans are not a deal-breaker.
            Disclose them up front and the payoff is structured at closing — funds wired
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
