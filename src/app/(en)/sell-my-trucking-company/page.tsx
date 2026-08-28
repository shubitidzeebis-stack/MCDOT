import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { EditorialBlock } from "@/components/EditorialBlock";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { McQuickForm } from "@/components/McQuickForm";
import {
  BreadcrumbSchema,
  FAQPageSchema,
  ServiceSchema,
} from "@/components/seo/Schema";

// SEO money page for the head-query family GSC shows us impressing on with
// zero clicks ("sell my trucking company" 0/45, "how to sell my trucking
// business" 0/30, "selling my trucking company" 0/14 — 3-mo, 2026-08-28).
// Transactional intent → transactional page: answer, price factors, process,
// wizard entry. Content stays inside the positioning rules: Veritor is never
// the buyer; process verbs only.

export const metadata: Metadata = {
  title: "Sell my trucking company — valuation, process, and timeline",
  description:
    "How to sell a trucking company: what decides the price, what transfers with the LLC, and how a sale closes in 3–5 business days. Free FMCSA-based valuation by MC or DOT number.",
  keywords: [
    "sell my trucking company",
    "selling my trucking company",
    "how to sell my trucking business",
    "how to sell a trucking company",
    "trucking company valuation",
    "sell trucking LLC",
  ],
  alternates: {
    canonical: "/sell-my-trucking-company",
    languages: { "x-default": "/sell-my-trucking-company" },
  },
  openGraph: {
    title: "Sell my trucking company — valuation, process, and timeline",
    description:
      "What decides a trucking company's price, what transfers with the LLC, and how a sale closes in 3–5 business days.",
    url: "/sell-my-trucking-company",
    images: ["/how-it-works/handshake-keys.png"],
  },
};

export default function SellMyTruckingCompanyPage() {
  return (
    <>
      <ServiceSchema
        name="Sell a trucking company — end-to-end sale handling"
        description="End-to-end handling of a US trucking company sale: FMCSA-based valuation, written offer, diligence, and an in-person closing at the seller's bank. Average 3–5 business days."
        url="/sell-my-trucking-company"
      />
      <FAQPageSchema
        items={[
          {
            q: "How much is my trucking company worth?",
            a: "Five variables decide most of the price: an active Amazon Relay contract (the single biggest premium), the age of the MC authority, insurance status and continuity, the violation and safety record, and any active loans. A company past 180 days of continuous authority and insurance is worth materially more than one approaching that mark. The fastest way to a number is the free valuation: enter your MC or DOT and the FMCSA record prices the company in about 90 seconds.",
          },
          {
            q: "How long does it take to sell a trucking company?",
            a: "With a specialist process, the average is 3–5 business days from accepted offer to funds wired: valuation the same day, a written offer within 24 hours, then diligence, a purchase agreement, and an in-person closing at your own bank. Listing on a marketplace typically runs months instead, because generalist buyers must be found and educated first.",
          },
          {
            q: "What transfers when I sell my trucking company?",
            a: "In an equity sale of the LLC: the entity itself, MC authority, DOT records, EIN, company phone number, company email, company bank account, and vehicle titles if included. An active Amazon Relay contract continues, because it is bound to the LLC entity rather than to the individual owner.",
          },
          {
            q: "Can I sell a trucking company that still has a loan on the truck?",
            a: "Yes. If the truck is titled to the LLC, the lien is paid off at closing: the payoff amount is confirmed with the lender, the purchase price splits between the lender and you, and you take the remainder. If you would rather keep the truck, it and its loan are excluded from the sale.",
          },
          {
            q: "Do I need a broker to sell my trucking company?",
            a: "No. A broker lists the company and takes a commission when someone eventually bites. The alternative is a handled sale: the company is valued from its FMCSA record, a written offer follows within 24 hours, and closing happens at your bank — no listing fees, no commissions, and you keep 100% of the sale price.",
          },
          {
            q: "Is it legal to sell a trucking company with its MC number?",
            a: "Yes — as a sale of the company itself. FMCSA prohibits selling an MC or DOT number as a standalone commodity, but a legitimate corporate transaction that transfers ownership of the LLC keeps the operating authority with the entity. The sale is documented with a purchase agreement and bill of sale for the LLC, and FMCSA records are updated after closing.",
          },
        ]}
      />
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Sell my trucking company" }]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/how-it-works/handshake-keys.png"
          alt="Handshake over a set of truck keys at a closing table"
          eyebrow="Sell your company"
          headlineLine1="Sell your trucking company."
          headlineLine2="Handled end to end."
          objectPosition="object-center"
        />

        <section className="mx-auto max-w-3xl px-5 py-10 md:px-6 md:py-14">
          <McQuickForm headline="What is your trucking company worth? Enter your MC or DOT." />
        </section>

        <EditorialBlock
          eyebrow="The price"
          heading={
            <>
              What decides what your company is{" "}
              <span className="italic font-light text-white/85">actually worth.</span>
            </>
          }
        >
          <p>
            Trucking companies do not sell on revenue multiples the way most small
            businesses do. What a buyer of the LLC is paying for is the{" "}
            <strong>regulatory position</strong> the company has already earned — the
            things that cannot be bought quickly at any price. Five variables carry
            most of the number:
          </p>
          <p>
            <strong>1. An active Amazon Relay contract.</strong> The single largest
            premium. Relay onboarding is closed to carriers younger than 180 days, so a
            company already inside the program carries value that cannot be replicated
            quickly. <strong>2. MC authority age.</strong> Older authority clears more
            broker and load-board screens. <strong>3. Insurance status.</strong>{" "}
            Continuous coverage history is what Amazon and brokers actually audit — see{" "}
            <Link href="/blog/active-vs-inactive-insurance">
              active vs inactive insurance
            </Link>{" "}
            for when a lapse is workable. <strong>4. The violation record.</strong>{" "}
            Clean beats fast: a Conditional safety rating or high out-of-service rate
            caps the price. <strong>5. Active loans.</strong> Not a deal-breaker — the
            payoff is wired to the lender at closing and the remainder to you — but the
            balance shapes your net. The full framework is in{" "}
            <Link href="/blog/what-is-my-mc-authority-worth">
              what&rsquo;s my MC authority worth
            </Link>
            .
          </p>
          <h3>The process, start to finish</h3>
          <p>
            Enter your MC or DOT number and the FMCSA record returns an indicative
            range in about 90 seconds — no calls required. A written offer follows
            within 24 hours. Diligence covers the FMCSA record, insurance history, and
            any liens; then a purchase agreement and bill of sale for the LLC are
            prepared, and closing happens <strong>in person at your own bank</strong>:
            the wire lands before ownership transfers. The average sale runs 3–5
            business days; the full sequence is on{" "}
            <Link href="/how-it-works">how it works</Link>.
          </p>
          <h3>Selling legally: the company, not the number</h3>
          <p>
            FMCSA prohibits selling an MC or DOT number as a standalone commodity.
            What the law recognises is a legitimate corporate transaction: the LLC
            itself changes ownership, and the operating authority stays with the
            entity it was issued to. That distinction is the difference between a
            clean sale and the identity-flipping schemes the industry press warns
            about — the details are on{" "}
            <Link href="/sell-my-mc-authority">selling your MC authority</Link> and{" "}
            <Link href="/operators-vs-brokers">selling safely</Link>.
          </p>
          <h3>Running Amazon Relay?</h3>
          <p>
            A Relay contract makes your company a different asset class — see{" "}
            <Link href="/sell-amazon-relay-account">
              selling a company with an Amazon Relay account
            </Link>{" "}
            for how the contract survives the ownership change.
          </p>
        </EditorialBlock>

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
