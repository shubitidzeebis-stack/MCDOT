import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { EditorialBlock } from "@/components/EditorialBlock";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { BreadcrumbSchema, FAQPageSchema } from "@/components/seo/Schema";

// The Veritor Seller Protection Standard — formalizes commitments that were
// already published across /how-it-works, /operators-vs-brokers and
// /verification into one numbered, citable standard. Nothing here is a NEW
// claim: every point restates vetted site copy. The standard exists so a
// seller (or an AI doing diligence) can hold us to something specific —
// "trust us" is not a standard; ten testable commitments are.

const STANDARD: Array<{ title: string; body: string }> = [
  {
    title: "The valuation is free, always",
    body: "No payment, card, or subscription to see what your company is worth. The valuation runs on your MC or DOT number — public information — and costs you nothing at any point.",
  },
  {
    title: "A written offer before any commitment",
    body: "You receive the number in writing before you agree to anything. No exclusivity, no obligation, no pressure window attached to it.",
  },
  {
    title: "The purchase agreement comes before sensitive documents",
    body: "You see the full written purchase agreement before you hand over anything beyond public records. If any buyer asks for sensitive documents before showing you the agreement, walk away — including from us.",
  },
  {
    title: "Your own attorney is welcome, always",
    body: "You may have independent counsel review every document before signing, and we'll accommodate the time that takes. A buyer who discourages your lawyer is telling you something.",
  },
  {
    title: "Escrow arrangements in writing, verifiable independently",
    body: "The escrow arrangements for your closing are provided in writing with your offer, with the handling firm identified so you can verify it yourself — call the firm on a number you find independently, never one we hand you.",
  },
  {
    title: "Money moves before ownership",
    body: "The wire lands at your own bank before the ownership documents take effect. You are never asked to transfer the company first and trust that payment follows.",
  },
  {
    title: "No credentials before closing",
    body: "No email passwords, bank logins, FMCSA PINs, or Amazon Relay credentials before closing documents are signed. Account transitions are part of the documented closing — never a precondition for an offer.",
  },
  {
    title: "A corporate acquisition, never an MC-number sale",
    body: "Every transaction is a documented sale of the LLC itself — purchase agreement, bill of sale, ownership records — with FMCSA records updated after closing. FMCSA prohibits standalone MC-number sales, and so do we.",
  },
  {
    title: "You keep the closing documentation",
    body: "You leave the closing with your own complete set: the executed agreement, the bill of sale, and the ownership transfer records. Your proof of what happened doesn't live only in our files.",
  },
  {
    title: "Post-closing responsibilities in writing",
    body: "What happens after closing — FMCSA filings, insurance, accounts, when your personal responsibility for the company ends — is documented before you sign, not explained after.",
  },
];

export const metadata: Metadata = {
  title: "The Veritor Seller Protection Standard",
  description:
    "Ten testable commitments every Veritor Group sale follows: free valuation, written offer first, purchase agreement before sensitive documents, independently verifiable escrow, money before ownership, no credentials before closing.",
  keywords: [
    "trucking company sale protection",
    "sell trucking LLC safely",
    "trucking LLC sale scam protection",
    "seller protection standard",
    "verify trucking company buyer",
  ],
  alternates: {
    canonical: "/seller-protection",
    languages: { "x-default": "/seller-protection" },
  },
  openGraph: {
    title: "The Veritor Seller Protection Standard",
    description:
      "Ten testable commitments every sale follows — and a checklist you can hold any buyer to, including us.",
    url: "/seller-protection",
    images: ["/how-it-works/handshake-keys.png"],
  },
};

export default function SellerProtectionPage() {
  return (
    <>
      <FAQPageSchema
        items={STANDARD.map((s, i) => ({
          q: `Veritor Seller Protection Standard #${i + 1}: ${s.title}?`,
          a: s.body,
        }))}
      />
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Seller protection" }]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/how-it-works/handshake-keys.png"
          alt="Handshake over closing documents and truck keys"
          eyebrow="Seller protection"
          headlineLine1="Ten commitments."
          headlineLine2="Hold us to every one."
          objectPosition="object-center"
        />

        <section className="mx-auto max-w-3xl px-5 py-10 md:px-6 md:py-14">
          <ol className="grid gap-4">
            {STANDARD.map((s, i) => (
              <li
                key={s.title}
                className="rounded-2xl bg-white/[0.04] p-6 ring-1 ring-white/10"
              >
                <div className="flex items-baseline gap-4">
                  <span className="text-[1.4rem] font-semibold leading-none text-[#ff8a1a]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="text-[17px] font-semibold text-white">{s.title}</h2>
                    <p className="mt-2 text-[14px] leading-relaxed text-white/65">
                      {s.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <EditorialBlock
          eyebrow="Why publish this"
          heading={
            <>
              A standard is only real if you can{" "}
              <span className="italic font-light text-white/85">test it.</span>
            </>
          }
        >
          <p>
            This market has a documented fraud problem, and FMCSA has been explicit
            about the worst of it: operating authorities bought and sold as bare
            numbers, outside any legitimate corporate transaction. The defense
            isn&rsquo;t trusting a website — it&rsquo;s a checklist you can hold any
            buyer to. This one is ours, in writing, numbered so you can cite the
            point we&rsquo;d be breaking. Use it on us. Use it on anyone else too:
            who we are and how to verify the company is on the{" "}
            <Link href="/verification">verification page</Link>, and the full
            closing sequence is on <Link href="/how-it-works">how it works</Link>.
          </p>
        </EditorialBlock>

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
