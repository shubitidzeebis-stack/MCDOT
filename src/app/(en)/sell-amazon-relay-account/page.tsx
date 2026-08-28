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

// SEO money page for the Relay family — the only organic query earning
// clicks ("amazon relay account for sale", pos ~11, 13.79% CTR) and the
// deal-predictor segment (7 of 9 closed deals are Relay carriers,
// 2026-08-27 audit). Pushes the position-11 ranking toward top-5 with a
// dedicated transactional page; the existing blog post stays as the
// deep-dive and gets linked as such.

export const metadata: Metadata = {
  title: "Amazon Relay account for sale? Sell the carrier that holds it",
  description:
    "A Relay contract can't be sold on its own — it transfers with the LLC in an equity sale, performance scores intact. What Relay carriers are worth and how the sale closes in 3–5 days.",
  keywords: [
    "amazon relay account for sale",
    "sell my amazon relay account",
    "transfer amazon relay account",
    "sell amazon relay carrier",
    "amazon relay LLC for sale",
    "selling trucking company with amazon relay",
  ],
  alternates: {
    canonical: "/sell-amazon-relay-account",
    languages: { "x-default": "/sell-amazon-relay-account" },
  },
  openGraph: {
    title: "Amazon Relay account for sale? Sell the carrier that holds it",
    description:
      "Relay contracts transfer with the LLC in an equity sale — performance scores intact. What Relay carriers are worth and how the sale works.",
    url: "/sell-amazon-relay-account",
    images: ["/hero/hero1.webp"],
  },
};

export default function SellAmazonRelayAccountPage() {
  return (
    <>
      <ServiceSchema
        name="Amazon Relay carrier sale — end-to-end handling"
        description="Sale handling for US carriers with active Amazon Relay contracts: the LLC transfers by equity sale, the Relay contract and performance scores continue with the entity. Written offer, in-person bank closing, 3–5 business days."
        url="/sell-amazon-relay-account"
      />
      <FAQPageSchema
        items={[
          {
            q: "Can I sell my Amazon Relay account?",
            a: "Not the account by itself — Relay contracts are not transferable as standalone assets, and account-selling violates Amazon's terms. What sells is the carrier: the LLC that holds the Relay contract. In an equity sale the LLC's ownership changes while the entity continues, so the Relay contract, the performance scores, and the operating history all stay with the company.",
          },
          {
            q: "Does the Amazon Relay contract survive the sale?",
            a: "Yes, when the sale is structured as an equity sale of the LLC. The contract is bound to the legal entity, not the individual owner. Amazon's beneficial-ownership disclosure is updated to reflect the new ownership as part of the transition; the contract itself does not restart.",
          },
          {
            q: "What is a trucking company with Amazon Relay worth?",
            a: "Relay carriers command the largest premium in the market, because Relay onboarding requires an MC authority and insurance continuously active for 180+ days — a gate that can't be shortcut at any price. The exact number depends on authority age, insurance history, and the violation record. Enter your MC or DOT in the free valuation for a range priced from your FMCSA record.",
          },
          {
            q: "My insurance lapsed — can I still sell my Relay carrier?",
            a: "Usually yes. A carrier that already holds a Relay contract can have lapsed coverage: Relay blocks load booking while insurance is off, but the account isn't terminated, and access resumes once coverage is re-bound — which happens as part of closing. This is different from a non-Relay carrier, where a lapse resets the 180-day continuous-coverage record Amazon audits at onboarding.",
          },
          {
            q: "How long does selling a Relay carrier take?",
            a: "The same 3–5 business day average as any handled trucking-company sale: valuation from the FMCSA record the same day, written offer within 24 hours, diligence, purchase agreement, and an in-person closing at the seller's bank with the wire landing before ownership transfers.",
          },
        ]}
      />
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Sell an Amazon Relay carrier" }]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/hero/hero1.webp"
          alt="Class 8 truck on the road at dusk"
          eyebrow="Amazon Relay"
          headlineLine1="A Relay contract makes your LLC"
          headlineLine2="a different asset class."
          objectPosition="object-center"
        />

        <section className="mx-auto max-w-3xl px-5 py-10 md:px-6 md:py-14">
          <McQuickForm headline="Running Relay? See what that makes your company worth." />
        </section>

        <EditorialBlock
          eyebrow="How it transfers"
          heading={
            <>
              The account doesn&rsquo;t sell.{" "}
              <span className="italic font-light text-white/85">
                The carrier does — scores intact.
              </span>
            </>
          }
        >
          <p>
            People search <em>Amazon Relay account for sale</em>, but that&rsquo;s not
            how the transfer actually works. A Relay contract can&rsquo;t be handed
            over on its own — account-selling violates Amazon&rsquo;s terms. What the
            market actually trades is the <strong>carrier</strong>: the LLC that holds
            the contract. In an equity sale the entity continues and only its
            ownership changes, so the Relay contract, the performance metrics, and the
            operating history stay exactly where they are. Amazon&rsquo;s
            beneficial-ownership disclosure is updated as part of the transition —
            the mechanics are covered in{" "}
            <Link href="/blog/selling-amazon-relay-llc">
              selling an LLC with an active Relay contract
            </Link>
            .
          </p>
          <h3>Why Relay carriers price at a premium</h3>
          <p>
            Relay onboarding is gated on an MC authority and BIPD insurance{" "}
            <strong>continuously active for at least 180 days</strong> — six months of
            premium payments, FMCSA standing, and zero coverage gaps that cannot be
            compressed at any price (see{" "}
            <Link href="/blog/mc-authority-180-days">the 180-day rule</Link>). A
            company already inside the program has finished the waiting. That is why
            an active contract is the single largest pricing variable, ahead of
            authority age and fleet size.
          </p>
          <h3>Lapsed insurance is usually workable</h3>
          <p>
            A Relay carrier with lapsed coverage hasn&rsquo;t lost its contract —
            booking pauses until coverage is re-bound, and re-binding happens as part
            of closing. The full breakdown of when a lapse matters is in{" "}
            <Link href="/blog/active-vs-inactive-insurance">
              active vs inactive insurance
            </Link>
            .
          </p>
          <h3>The sale itself</h3>
          <p>
            Same handled process as any{" "}
            <Link href="/sell-my-trucking-company">trucking company sale</Link>:
            FMCSA-based valuation in 90 seconds, written offer within 24 hours,
            diligence, purchase agreement, and an in-person closing at your own bank —
            funds wired before ownership transfers, average 3–5 business days.
            Qualification criteria are on{" "}
            <Link href="/requirements">what qualifies</Link>.
          </p>
        </EditorialBlock>

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
