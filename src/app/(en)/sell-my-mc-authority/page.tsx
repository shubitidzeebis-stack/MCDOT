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

// SEO money page for the authority-query family — the same intent pool the
// paid account's best keywords buy ("sell my mc number" $18 CPA, "sell my
// mc authority" QS10) and the search terms that convert as close variants
// every window ("can i sell my dot authority" — 5 consecutive converting
// windows by 2026-08-28). The FMCSA framing mirrors the /requirements FAQ
// and llms.txt: the LLC sells, the number rides with it — never the number
// alone.

export const metadata: Metadata = {
  title: "Sell my MC authority — the legal way to sell an MC number",
  description:
    "You can't sell an MC number by itself — FMCSA prohibits it. You can sell the LLC that holds the authority, and the MC rides with it. What authority is worth, and how the sale works.",
  keywords: [
    "sell my mc authority",
    "sell my mc number",
    "can i sell my mc number",
    "can i sell my dot authority",
    "mc authority for sale",
    "trucking authority for sale",
    "aged mc for sale",
  ],
  alternates: {
    canonical: "/sell-my-mc-authority",
    languages: { "x-default": "/sell-my-mc-authority" },
  },
  openGraph: {
    title: "Sell my MC authority — the legal way to sell an MC number",
    description:
      "FMCSA prohibits selling an MC number by itself. Selling the LLC that holds it is legal — and that's how authority actually changes hands.",
    url: "/sell-my-mc-authority",
    images: ["/requirements/document-table.png"],
  },
};

export default function SellMyMcAuthorityPage() {
  return (
    <>
      <ServiceSchema
        name="MC authority sale — via legitimate LLC sale"
        description="Handling of US operating-authority sales structured the FMCSA-compliant way: the LLC that holds the MC authority is sold as a corporate transaction, and the authority remains with the entity."
        url="/sell-my-mc-authority"
      />
      <FAQPageSchema
        items={[
          {
            q: "Can I sell my MC number?",
            a: "Not by itself. FMCSA prohibits selling, leasing, or transferring an MC or DOT number outside a legitimate sale of the underlying entity. What you can sell is the company — the LLC the authority was issued to. In a legitimate corporate transaction the LLC changes ownership and the operating authority stays with the entity, which is exactly the structure FMCSA's guidance describes.",
          },
          {
            q: "Can I sell my DOT authority?",
            a: "Yes, the same way: by selling the LLC that holds it. The USDOT number is attached to the legal entity, so when the entity's ownership changes in a documented sale, the number remains with the company. FMCSA records are updated to reflect the new ownership after closing.",
          },
          {
            q: "What is my MC authority worth?",
            a: "It depends on what the company around it has earned: authority age (older clears more broker screens), continuous insurance history, the violation record, and above all whether an Amazon Relay contract is attached — Relay carriers command the largest premium because Relay onboarding is closed to authorities younger than 180 days. Enter your MC or DOT in the free valuation for a number priced from your actual FMCSA record.",
          },
          {
            q: "Is an aged MC worth more?",
            a: "Generally yes. Authority age is one of the five main pricing variables: an older MC with continuous insurance and a clean record clears more broker and load-board requirements, and a company past the 180-day continuous-coverage mark qualifies for Amazon Relay onboarding — the hardest gate in the market and the one that moves price most.",
          },
          {
            q: "Why do buyers warn against buying just an MC number?",
            a: "Because a bare number sale is the structure behind carrier-identity fraud: operating under someone else's authority and safety history. FMCSA prohibits it, brokers blacklist it, and any legitimate transaction avoids it by transferring the entity itself — purchase agreement, bill of sale, ownership documents, and updated FMCSA records.",
          },
        ]}
      />
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Sell my MC authority" }]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/requirements/document-table.png"
          alt="Documents, pen, and truck keys arranged on a desk before a closing"
          eyebrow="Operating authority"
          headlineLine1="Selling your MC authority,"
          headlineLine2="done the legal way."
          objectPosition="object-center"
        />

        <section className="mx-auto max-w-3xl px-5 py-10 md:px-6 md:py-14">
          <McQuickForm headline="What is your authority worth? Enter your MC or DOT." />
        </section>

        <EditorialBlock
          eyebrow="The rule"
          heading={
            <>
              You don&rsquo;t sell the number.{" "}
              <span className="italic font-light text-white/85">
                You sell the company that holds it.
              </span>
            </>
          }
        >
          <p>
            The searches all phrase it the same way — <em>sell my MC number</em>,{" "}
            <em>MC authority for sale</em> — but FMCSA is explicit:{" "}
            <strong>
              an MC or DOT number cannot be sold, leased, or transferred as a
              standalone commodity.
            </strong>{" "}
            The number is not property. It is a registration attached to a legal
            entity.
          </p>
          <p>
            What the rules do recognise is a{" "}
            <strong>legitimate corporate transaction</strong>: the LLC that holds the
            authority is sold — purchase agreement, bill of sale, ownership documents
            — and the authority stays with the entity through the ownership change.
            Sell the company and the MC rides along; try to sell the MC alone and
            you&rsquo;re in the territory FMCSA&rsquo;s guidance and the industry
            press warn about, where bought numbers are used to borrow another
            carrier&rsquo;s identity and safety record.
          </p>
          <h3>What your authority is actually worth</h3>
          <p>
            Priced as part of the company, authority value comes from what it has
            already earned: <strong>age</strong> (older authority clears broker
            screens that block fresh MCs), <strong>continuous insurance history</strong>{" "}
            (the record Amazon&rsquo;s 180-day rule audits — see{" "}
            <Link href="/blog/mc-authority-180-days">the 180-day rule</Link>),{" "}
            <strong>the violation record</strong>, and whether an{" "}
            <strong>Amazon Relay contract</strong> is attached — the configuration
            that commands the largest premium of all (see{" "}
            <Link href="/sell-amazon-relay-account">
              selling a Relay carrier
            </Link>
            ).
          </p>
          <h3>How the sale runs</h3>
          <p>
            The FMCSA record prices the company in about 90 seconds; a written offer
            follows within 24 hours. Closing is in person at your own bank — funds
            wire before ownership transfers, then FMCSA records are updated. The
            complete sequence is on <Link href="/how-it-works">how it works</Link>,
            and the wider picture on{" "}
            <Link href="/sell-my-trucking-company">
              selling your trucking company
            </Link>
            .
          </p>
        </EditorialBlock>

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
