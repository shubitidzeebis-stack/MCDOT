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
  HowToSchema,
} from "@/components/seo/Schema";

// Brand-query answer page. Search Console (Sep 12–14, 2026) showed people
// searching the company name plus a question — "veritor group llc can you
// transfer an llc", "veritor group llc how to transfer an llc" — 26 impressions
// in 28 days with ZERO clicks, because no page answered the question in its
// title. They are almost all cold-outreach recipients checking us out before
// they reply. This page exists to be the #1 result for exactly those searches.
// Every fact here is lifted from /how-it-works and the "what transfers" post;
// nothing new is claimed.

export const metadata: Metadata = {
  // The root layout's title template appends "· Veritor Group", so the brand
  // must not be repeated here (it rendered "...with Veritor Group · Veritor
  // Group" on first deploy). The openGraph title below is not templated.
  title: "Can you transfer an LLC? How the transfer works",
  description:
    "Yes — a trucking LLC transfers by selling the company itself. The MC and DOT stay registered to it, the EIN doesn't change, and the money moves through a closing attorney's escrow. Here is the exact sequence, step by step.",
  keywords: [
    "can you transfer an llc",
    "how to transfer an llc",
    "transfer trucking llc",
    "transfer llc with mc number",
    "veritor group transfer",
    "how the llc transfer works",
  ],
  alternates: {
    canonical: "/llc-transfer",
    languages: { "x-default": "/llc-transfer" },
  },
  openGraph: {
    title: "Can you transfer an LLC? How the transfer works with Veritor Group",
    description:
      "The LLC transfers as a company sale. MC and DOT stay with it, the EIN stays the same, funds move through escrow, and the whole thing usually takes 3–5 business days.",
    url: "/llc-transfer",
    images: ["/how-it-works/handshake-keys.png"],
  },
};

export default function LlcTransferPage() {
  return (
    <>
      <FAQPageSchema
        items={[
          {
            q: "Can you transfer an LLC?",
            a: "Yes. A limited liability company changes hands by transferring its membership interest: the operating agreement is amended to name the new owner and the state filing is updated to match. The company itself continues without interruption — same EIN, same state registration, same name — so anyone who looks it up afterwards sees continuity, not a new entity.",
          },
          {
            q: "How do you transfer an LLC that holds an MC number?",
            a: "By selling the company, never the number. The MC and USDOT numbers are registered to the LLC, not to you personally, so when the LLC's ownership changes in a documented sale the authority stays exactly where it is. After closing, the FMCSA record is updated to reflect the new ownership. Selling or leasing the MC number on its own is prohibited by FMCSA.",
          },
          {
            q: "What transfers with the company?",
            a: "The LLC itself, its MC authority and DOT records, the company phone number, the company email account, the company bank account, the insurance policy (re-bound under the new owner at closing), any vehicle titles held by the LLC if you want them included, and an Amazon Relay contract if the LLC has one. Equipment loans and factoring relationships are disclosed up front and paid off at closing from the wire.",
          },
          {
            q: "How long does the transfer take?",
            a: "Most deals wrap in 3 to 5 business days: your FMCSA record is checked within hours, a written offer and letter of intent follow, diligence and document preparation take about two days, and closing happens on day three to five.",
          },
          {
            q: "Do I have to be there in person?",
            a: "Most sellers close in person at the bank that holds the company's account, so signatories update on the spot and the funds land while everyone is standing there. If getting to a branch is impractical, the whole closing runs remotely instead — signed electronically, same escrow, same timeline.",
          },
          {
            q: "When do I get paid?",
            a: "At signature. The closing funds move through a closing attorney's escrow account and release into your account as the documents execute — not after you have handed the company over. Nothing about the entity, the logins or the documents moves before the money is yours.",
          },
        ]}
      />
      <HowToSchema
        name="How a trucking LLC is transferred through Veritor Group"
        description="Four steps from the FMCSA check to an in-person closing at the seller's own bank. The LLC transfers as a company sale; the MC and DOT stay registered to it."
        steps={[
          {
            name: "Check the FMCSA record",
            text: "Enter the MC or DOT number at groupveritor.com/get-offer. Authority status, insurance, safety rating and violation history are pulled within hours — no signup, no obligation.",
          },
          {
            name: "Written offer and letter of intent",
            text: "If the company qualifies, a written offer with a specific dollar amount comes back with a short letter of intent that locks the price and lists exactly what transfers at closing.",
          },
          {
            name: "Diligence and documents",
            text: "Standard checks: tax filings current, no undisclosed liens, violation history matching what was disclosed. Legal counsel drafts the membership-interest purchase agreement; those costs do not come out of the seller's number.",
          },
          {
            name: "Closing and transfer",
            text: "Signed in person at the seller's own bank, or remotely. Funds release from a closing attorney's escrow on signature, the bank updates signatories, and the phone number, email and portal access hand over per the closing checklist.",
          },
        ]}
      />
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "How the LLC transfer works" }]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/how-it-works/handshake-keys.png"
          alt="Two people shaking hands over a set of truck keys at a closing"
          eyebrow="The transfer"
          headlineLine1="Yes, an LLC transfers."
          headlineLine2="Here is exactly how."
          subhead="The company sells as a whole. The MC and DOT stay registered to it, the EIN never changes, and the money clears through escrow before anything is handed over. Most closings take 3–5 business days."
          objectPosition="object-[50%_35%]"
        />

        <section className="mx-auto max-w-3xl px-5 py-10 md:px-6 md:py-14">
          <McQuickForm headline="Want to see what your company would transfer for? Enter your MC or DOT." />
        </section>

        <EditorialBlock
          eyebrow="The short answer"
          heading={
            <>
              You don&rsquo;t transfer the number.{" "}
              <span className="italic font-light text-white/85">
                You transfer the company that holds it.
              </span>
            </>
          }
        >
          <p>
            A trucking LLC changes hands the way any company does: its{" "}
            <strong>membership interest</strong> is sold. The operating agreement is
            amended to name the new owner and the state filing is updated to match.
            The EIN stays the same. The state registration stays the same. Anyone who
            looks the company up afterwards sees continuity, not a fresh entity.
          </p>
          <p>
            The part sellers most often ask about is the authority. Your MC and DOT
            numbers are registered to the LLC, not to you, so they{" "}
            <strong>never change hands at all</strong> &mdash; they stay exactly where
            they are while the ownership behind the entity changes. That is also why
            the number is never sold on its own: FMCSA prohibits selling, leasing or
            transferring an MC or DOT number outside a legitimate sale of the company.
            The rules on that are on{" "}
            <Link href="/sell-my-mc-authority">selling your MC authority</Link>.
          </p>
        </EditorialBlock>

        <EditorialBlock
          eyebrow="What moves"
          heading={
            <>
              Everything that makes the company{" "}
              <span className="italic font-light text-white/85">a company.</span>
            </>
          }
        >
          <p>
            On its own an LLC is a Secretary of State filing. What makes a trucking LLC
            worth anything is the bundle of authorities, accounts and relationships
            attached to it, and all of it is on the closing checklist:
          </p>
          <ul>
            <li>
              <strong>The LLC entity</strong> &mdash; membership interest, amended
              operating agreement, updated state filing. Same EIN.
            </li>
            <li>
              <strong>MC authority and DOT records</strong> &mdash; stay registered to
              the LLC; the FMCSA record is updated to the new ownership after closing.
            </li>
            <li>
              <strong>Insurance</strong> &mdash; re-bound under the new owner at
              closing, with the existing carrier or a new one. See{" "}
              <Link href="/insurance-status">what active and inactive insurance mean</Link>.
            </li>
            <li>
              <strong>Company phone number</strong> &mdash; ported at closing. The
              line your dispatchers and freight partners already know.
            </li>
            <li>
              <strong>Company email account</strong> &mdash; admin access transfers,
              inbox history stays.
            </li>
            <li>
              <strong>Company bank account</strong> &mdash; signatories update on the
              existing account, or a new account opens in the same name.
            </li>
            <li>
              <strong>Vehicle titles</strong> &mdash; only if they are titled to the
              LLC and you want them included.
            </li>
            <li>
              <strong>Amazon Relay contract</strong>, if the LLC has one &mdash; it is
              held by the LLC, so it travels with it. See{" "}
              <Link href="/sell-amazon-relay-account">selling a Relay carrier</Link>.
            </li>
          </ul>
          <p>
            Equipment loans, working-capital lines and factoring relationships are
            disclosed up front and paid off at closing from the wire, with the
            remainder going to you. The full list is in{" "}
            <Link href="/blog/what-transfers-when-selling-trucking-llc">
              what transfers when you sell a trucking LLC
            </Link>
            .
          </p>
        </EditorialBlock>

        <EditorialBlock
          eyebrow="The sequence"
          heading={
            <>
              Four steps,{" "}
              <span className="italic font-light text-white/85">3 to 5 business days.</span>
            </>
          }
        >
          <h3>Day 1 &mdash; The FMCSA check</h3>
          <p>
            You enter your MC or DOT number and nothing else. Within hours, every day
            of the week, your FMCSA record is pulled: authority in good standing,
            insurance status, safety rating, violation history. You get one of two
            answers the same day &mdash; a specific number, or a straight explanation
            of why it isn&rsquo;t a fit.
          </p>
          <h3>Day 2 &mdash; Written offer and letter of intent</h3>
          <p>
            If it&rsquo;s a fit, a written offer and a short letter of intent lock the
            price and list exactly what transfers at closing. No verbal commitments;
            everything on paper before you commit to anything.
          </p>
          <h3>Day 2&ndash;3 &mdash; Diligence and documents</h3>
          <p>
            Tax filings current, no undisclosed liens, violation history matching what
            you disclosed. Legal counsel drafts the membership-interest purchase
            agreement, and those costs don&rsquo;t come out of your number. Take it to
            your own lawyer &mdash; it is sent over precisely so you can.
          </p>
          <h3>Day 3&ndash;5 &mdash; Closing</h3>
          <p>
            <strong>Most sellers close in person</strong> at the bank that holds the
            company&rsquo;s account. The agreement is signed face to face, the bank
            updates signatories on the spot, and the funds move through a closing
            attorney&rsquo;s escrow account into your account while everyone is
            standing there. Phone number, email and portal credentials hand over per
            the closing checklist. If a branch is impractical, the same closing runs
            remotely: signed electronically, same escrow, same timeline.
          </p>
          <p>
            The protection was never the handshake. It is the escrow releasing{" "}
            <strong>on signature</strong>, so the money lands as the documents execute
            rather than after. Anyone who wants the entity, the documents or the logins
            moved before the funds are yours is telling you what they are. The wider
            picture is on <Link href="/how-it-works">how it works</Link> and{" "}
            <Link href="/seller-protection">seller protection</Link>.
          </p>
        </EditorialBlock>

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
