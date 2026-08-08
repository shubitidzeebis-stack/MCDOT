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
    "Four steps: MC/DOT lookup, written offer, diligence, in-person bank wire. Close in 3–5 business days. No fees, no commission — you keep 100% of the number you accept.",
  keywords: [
    "how to sell trucking LLC",
    "how to sell a trucking company",
    "Amazon Relay carrier sale process",
    "trucking LLC ownership transfer",
    "sell trucking company steps",
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
    title: "How to sell your trucking company — the Veritor process",
    description:
      "Four steps: check, valuation, sign, in-person wire at your own bank. Average 3–5 business days.",
    url: "/how-it-works",
    images: ["/how-it-works/handshake-keys.png"],
  },
};

export default function HowItWorksPage() {
  return (
    <>
      <ServiceSchema
        name="Trucking company sale process"
        description="Four steps from the initial FMCSA check to an in-person wire at the seller's own bank. Average close in 3–5 business days. No fees or commission to the seller."
        url="/how-it-works"
      />
      <HowToSchema
        name="How to sell your trucking company through Veritor Group"
        description="Four steps from FMCSA check to in-person bank wire. Average 3–5 business days. Nothing is deducted from the seller's number."
        steps={[
          {
            name: "Check your MC or DOT number",
            text: "Enter your MC or DOT number at groupveritor.com/get-offer. Veritor pulls your FMCSA record — authority status, insurance, violation history, Amazon Relay status — within hours. No signup, no obligation.",
          },
          {
            name: "Receive a written offer",
            text: "If the company qualifies, a written offer with a specific dollar amount comes back along with a short Letter of Intent. No verbal commitments — everything is on paper before any documents are signed.",
          },
          {
            name: "Sign and complete diligence",
            text: "The Membership Interest Purchase Agreement is signed by both parties. Standard diligence: tax filings current, no undisclosed liens, violation history matching what was disclosed. Typically 2–3 business days, and legal costs don't come out of the seller's number.",
          },
          {
            name: "In-person bank wire and transfer",
            text: "Closing happens at the seller's own bank in person, or remotely if that suits better. Either way funds move through a closing attorney's escrow account and release on signature, so the money lands as the documents execute rather than after. The bank updates account signatories, and the company phone, email, and bank account hand over per the closing checklist.",
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
            You enter your MC or DOT number — nothing else, because nothing else is
            needed at this stage. Within hours, every day of the week, we pull your
            FMCSA record, check the authority is in good standing, and look at insurance
            status, safety rating and violation history. You get one of two answers: a
            specific number, or a straight explanation of why it isn&rsquo;t a fit. The
            second answer comes the same day. Nobody gets strung along.
          </p>
          <h3>Day 2 — Written offer and LOI</h3>
          <p>
            If it&rsquo;s a fit, you get a written offer and a short letter of intent
            that locks the price and sets out what transfers at closing: the LLC itself,
            its authority and DOT records, the company phone number, email account, bank
            account, and any vehicle titles if they apply. No verbal commitments —
            everything on paper, before you commit to anything.
          </p>
          <h3>Day 2&ndash;3 — Diligence and document prep</h3>
          <p>
            Standard diligence: tax filings current, no undisclosed liens, violation
            history matching what you disclosed. Legal counsel drafts the purchase
            agreement and those costs don&rsquo;t come out of your number. Take it to
            your own lawyer — you should, and the agreement is sent over precisely so
            you can.
          </p>
          <h3>Day 3&ndash;5 — Signing, wire, and the in-person handover</h3>
          <p>
            <strong>Most sellers close in person.</strong> We meet you at the bank that
            holds the company&rsquo;s account and run the transfer at the counter
            together. Final purchase agreement signed face to face, the bank updates
            signatories on the spot, and the closing funds move through a closing
            attorney&rsquo;s escrow account into your account while everyone is standing
            there. You walk out with the money already in your account. Phone number,
            email, and portal credentials hand over according to the closing checklist.
          </p>
          <p>
            If getting to a branch is impractical, the whole thing runs remotely instead
            — signed electronically, same escrow, same timeline. The protection was never
            the handshake; it&rsquo;s the escrow releasing on signature, so the money
            lands as the documents execute rather than after. That&rsquo;s the part worth
            insisting on wherever you sell, because it&rsquo;s the part a fraud operation
            cannot agree to. Anyone who wants the entity, the documents, or the logins
            moved before the funds are yours is telling you what they are.
          </p>
          <p className="!text-[12px] !leading-relaxed !text-white/40">
            <strong className="font-medium text-white/55">A note on
            timing.</strong>{" "}
            Bottlenecks are usually outside anyone&rsquo;s control: the bank takes a day
            to update signatories, portal access has to transfer, an active loan needs
            lender consent. All of these are familiar and none of them are surprises. The
            job is to keep the wire on track no matter what shows up in diligence.
          </p>
        </EditorialBlock>

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
