import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { HowItWorks } from "@/components/HowItWorks";
import { EditorialBlock } from "@/components/EditorialBlock";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import {
  BreadcrumbSchema,
  HowToSchema,
  ServiceSchema,
} from "@/components/seo/Schema";

export const metadata: Metadata = {
  title: "Selling your trucking LLC — the 4-step process",
  description:
    "Four steps: MC/DOT lookup, written offer, diligence, in-person bank wire. Close in 3–5 business days. No third-party buyers, no broker fees.",
  keywords: [
    "how to sell trucking LLC",
    "selling logistics company process",
    "Amazon Relay LLC sale process",
    "MC authority transfer",
    "DOT number transfer",
    "trucking LLC closing",
    "purchase agreement trucking LLC",
    "wire transfer trucking sale",
    "in-person bank closing trucking",
  ],
  alternates: {
    canonical: "/how-it-works",
    languages: {
      "en-US": "/how-it-works",
      es: "/es/how-it-works",
      ru: "/ru/how-it-works",
      "x-default": "/how-it-works",
    },
  },
  openGraph: {
    title: "How to sell your logistics LLC — the Veritor process",
    description:
      "Four-step acquisition process: check, valuation, sign, in-person wire. Average 3–5 business days.",
    url: "/how-it-works",
    images: ["/how-it-works/handshake-keys.png"],
  },
};

export default function HowItWorksPage() {
  return (
    <>
      <ServiceSchema
        name="LLC acquisition process — buy-side"
        description="Four-step acquisition process from initial check to in-person wire transfer at the bank. Average close in 3–5 business days. Veritor pays legal fees on our side."
        url="/how-it-works"
      />
      <HowToSchema
        name="How to sell your trucking LLC to Veritor Group"
        description="Four-step process from FMCSA check to in-person bank wire. Average 3–5 business days. Veritor pays its own legal fees."
        steps={[
          {
            name: "Check your MC or DOT number",
            text: "Enter your MC or DOT number at groupveritor.com/get-offer. Veritor pulls your FMCSA record — authority status, insurance, violation history, Amazon Relay status — within hours. No signup, no obligation.",
          },
          {
            name: "Receive a written offer",
            text: "If the LLC qualifies, Veritor sends a written offer with a specific dollar amount and a short Letter of Intent. No verbal commitments — everything is on paper before any documents are signed.",
          },
          {
            name: "Sign and complete diligence",
            text: "Both parties sign the Membership Interest Purchase Agreement. Veritor pays legal fees on its side. Standard diligence: tax filings current, no undisclosed liens, violation history matches what was disclosed. Typically 2–3 business days.",
          },
          {
            name: "In-person bank wire and transfer",
            text: "The close happens in person at the seller's bank. Veritor wires the closing payment from its account to the seller's account while both parties are at the counter. The bank updates account signatories. MC authority, DOT records, phone, email, and bank account all hand over per the closing checklist.",
          },
        ]}
      />
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "How it works" }]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/how-it-works/handshake-keys.png"
          alt="Two hands meeting in a handshake across a matte-black desk over a folded purchase agreement and a set of truck keys"
          eyebrow="How it works"
          headlineLine1="Four steps,"
          headlineLine2="3 to 5 business days."
          subhead="Check your MC, get a written offer within hours, sign and verify, then meet us at your bank to wire and transfer in person. Most deals wrap in 3–5 business days."
          objectPosition="object-[50%_35%]"
        />
        <HowItWorks locale="en" compact />

        <EditorialBlock
          eyebrow="The detail"
          heading={
            <>
              The honest version <span className="italic font-light text-white/85">of the process.</span>
            </>
          }
        >
          <p>
            The four steps above are the headline. The reality is a bit more granular —
            here&rsquo;s what actually happens between &ldquo;I submitted the form&rdquo;
            and &ldquo;the wire just hit.&rdquo;
          </p>
          <h3>Day 1 — Check and triage</h3>
          <p>
            You enter your MC or DOT number. Within hours, every day of the week, we
            pull your FMCSA record, verify the MC authority is in good standing, and
            check insurance status. If the LLC has an active Amazon Relay contract, we
            verify it through standard channels. We come back with either &ldquo;we
            want to move&rdquo; (with a specific number) or &ldquo;here&rsquo;s why
            we&rsquo;re passing.&rdquo;
          </p>
          <h3>Day 2 — Written offer and LOI</h3>
          <p>
            If we&rsquo;re moving, you get a written offer and a short letter of intent
            that locks the price and outlines what transfers at closing: the LLC itself,
            MC authority, DOT records, company phone number, company email account,
            company bank account, and any vehicle titles if applicable. No verbal
            commitments — everything is on paper.
          </p>
          <h3>Day 2&ndash;3 — Diligence and document prep</h3>
          <p>
            Standard diligence: tax filings current, no undisclosed liens, violation
            history matches what you told us. Our legal counsel drafts the purchase
            agreement; we pay those fees. You review with your own counsel if you want,
            and we go back and forth on edits.
          </p>
          <h3>Day 3&ndash;5 — Signing, wire, and the in-person handover</h3>
          <p>
            <strong>The close happens in person.</strong> We meet you at the bank that
            holds the LLC&rsquo;s account — typically the same bank that&rsquo;s
            attached to the Amazon Relay payments — and we run the transfer at the
            counter together. Final purchase agreement signed face to face, the bank
            updates signatories on the spot, and we wire the closing payment from our
            account to yours while we&rsquo;re both standing there. You walk out with
            the funds in your account, we walk out with the LLC. Phone number, email,
            and FMCSA portal credentials hand over according to the closing checklist;
            MC authority re-registration paperwork is filed by us in the days after.
          </p>
          <p>
            The reason we close at the bank, in person: it removes every ambiguity that
            normally drags a small-business sale out for weeks. No remote signature
            chasing, no &ldquo;the wire didn&rsquo;t arrive yet,&rdquo; no waiting on
            scanned IDs. The teller sees you, sees us, and the transfer is final
            before any of us leaves the branch.
          </p>
          <p className="!text-[12px] !leading-relaxed !text-white/40">
            <strong className="font-medium text-white/55">A note on
            timing.</strong>{" "}
            Bottlenecks are usually outside our control: the bank takes a day to
            update signatories, FMCSA portal access has to transfer, an active loan
            needs lender consent. We&rsquo;ve seen all of these and we know how to
            handle them. Our job is to keep the wire on track no matter what shows up
            in diligence.
          </p>
        </EditorialBlock>

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
