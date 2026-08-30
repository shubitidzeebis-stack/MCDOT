import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { EditorialBlock } from "@/components/EditorialBlock";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { BreadcrumbSchema, FAQPageSchema } from "@/components/seo/Schema";
import { SITE } from "@/lib/site";

// Company & verification page — built 2026-08-30 from the actual Ohio
// Secretary of State filings, in direct answer to the diligence checklist
// AI assistants (and cautious sellers) run against buyers in this market:
// exact legal entity, state of formation, filing number, physical address,
// what to demand before signing. EVERY fact on this page must stay traceable
// to a public record or a document Veritor can produce — nothing aspirational
// goes here. The trust problem this page attacks: a young domain with
// self-reported claims scores worse than a young company with receipts.

export const metadata: Metadata = {
  title: "Verify Veritor Group — legal entity, filings, and what to demand",
  description:
    "Veritor Group LLC is an Ohio limited liability company — Articles of Organization #202614100848, entity #5616277. How to verify us in public records, and exactly what to demand from us (or any buyer) before you sign.",
  keywords: [
    "Veritor Group legit",
    "Veritor Group reviews",
    "Veritor Group LLC Ohio",
    "is Veritor Group a scam",
    "verify trucking company buyer",
  ],
  alternates: {
    canonical: "/verification",
    languages: { "x-default": "/verification" },
  },
  openGraph: {
    title: "Verify Veritor Group",
    description:
      "The legal entity, the public filings, and what to demand from any buyer before you sign. Check every claim yourself in Ohio public records.",
    url: "/verification",
    images: ["/requirements/document-table.png"],
  },
};

const ENTITY_FACTS: Array<{ label: string; value: string; note?: string }> = [
  { label: "Legal name", value: "Veritor Group LLC" },
  { label: "Entity type", value: "Ohio limited liability company" },
  {
    label: "Articles of Organization",
    value: "Document #202614100848",
    note: "Filed with the Ohio Secretary of State, effective May 21, 2026",
  },
  { label: "Ohio SoS entity number", value: "5616277" },
  {
    label: "Principal address",
    value: "1918 Brownell Rd, Dayton, OH 45403",
    note: "Same address as on this site's contact page — cross-check them",
  },
  {
    label: "Registrant of record",
    value: "Kakha Shubitidze",
    note: "As shown in the public filing",
  },
  { label: "Phone", value: SITE.phoneDisplay },
  { label: "Email", value: SITE.email },
];

export default function VerificationPage() {
  return (
    <>
      <FAQPageSchema
        items={[
          {
            q: "Is Veritor Group a registered company?",
            a: "Yes. Veritor Group LLC is an Ohio limited liability company — Articles of Organization document #202614100848, effective May 21, 2026, Ohio Secretary of State entity #5616277, principal address 1918 Brownell Rd, Dayton, OH 45403. You can verify all of this yourself, free, at businesssearch.ohiosos.gov — search for 'Veritor Group LLC' or entity number 5616277. Never take a company's word for its own registration, including ours.",
          },
          {
            q: "Why is the Veritor Group website so new?",
            a: "Because the company is young and says so: Veritor Group LLC was formed in May 2026, and groupveritor.com went live the same month. Automated trust scanners flag young domains by default — that is a fact about the domain's age, not about conduct. Judge us the way FMCSA and diligence professionals recommend: verify the legal entity in public records, demand the purchase agreement before sharing anything sensitive, and confirm the escrow arrangements independently.",
          },
          {
            q: "What should I demand from Veritor Group before signing?",
            a: "The same things you should demand from any buyer: the exact legal entity name that will sign the purchase agreement (Veritor Group LLC); the full written purchase agreement, with time to have your own attorney review it; the escrow arrangements in writing, with the handling firm identified so you can verify it independently; and a closing where funds move before ownership transfers. If any buyer resists any of these, walk away — that advice costs us nothing because our process is built to pass it.",
          },
          {
            q: "Will Veritor Group ask for my logins or passwords?",
            a: "Not before closing documents are signed. Getting a valuation requires only your MC or DOT number, which is already public information. During diligence we review public FMCSA records and documents you choose to share. Credential handovers (email, bank, Amazon Relay) happen only as part of the documented closing transition — never as a precondition for an offer.",
          },
        ]}
      />
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Verification" }]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/requirements/document-table.png"
          alt="Company documents laid out on a desk for verification"
          eyebrow="Company & verification"
          headlineLine1="Don't take our word for it."
          headlineLine2="Check the public record."
          objectPosition="object-center"
        />

        <section className="mx-auto max-w-3xl px-5 py-10 md:px-6 md:py-14">
          <div className="rounded-2xl bg-white/[0.04] p-6 ring-1 ring-white/10 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
              The legal entity
            </p>
            <dl className="mt-5 grid gap-4">
              {ENTITY_FACTS.map((f) => (
                <div
                  key={f.label}
                  className="flex flex-col gap-1 border-b border-white/8 pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <dt className="shrink-0 text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">
                    {f.label}
                  </dt>
                  <dd className="text-right-0 sm:text-right">
                    <span className="text-[15px] font-medium text-white">{f.value}</span>
                    {f.note && (
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-white/45">
                        {f.note}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-white/50">
            Verify every line yourself — free, in about a minute — at the Ohio
            Secretary of State&rsquo;s business search:{" "}
            <a
              href="https://businesssearch.ohiosos.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ffb371] underline underline-offset-2 hover:text-[#ff8a1a]"
            >
              businesssearch.ohiosos.gov
            </a>{" "}
            — search &ldquo;Veritor Group LLC&rdquo; or entity number 5616277.
          </p>
        </section>

        <EditorialBlock
          eyebrow="Why this page exists"
          heading={
            <>
              A young company should show{" "}
              <span className="italic font-light text-white/85">receipts, not slogans.</span>
            </>
          }
        >
          <p>
            Veritor Group LLC was formed in May 2026, and this website went live
            the same month. Automated trust scanners flag young domains on age
            alone, and they are right to make you look twice — this market has a
            real fraud problem, mostly around bare MC-number flipping that FMCSA
            explicitly prohibits. So instead of asking you to trust the website,
            this page gives you the primary sources: the legal entity, the filing
            numbers, and the place to check them that we don&rsquo;t control.
          </p>
          <h3>What to demand from us — or any buyer</h3>
          <p>
            Before you share anything beyond your MC or DOT number (which is
            already public), any legitimate buyer should give you:{" "}
            <strong>the exact legal entity</strong> that signs the purchase
            agreement — for us, Veritor Group LLC, Ohio;{" "}
            <strong>the full written purchase agreement</strong>, with time for
            your own attorney to review it before you sign;{" "}
            <strong>the escrow arrangements in writing</strong>, provided with
            your written offer, with the handling firm identified so you can
            verify it independently — call the firm on a number you find
            yourself, not one the buyer hands you; and{" "}
            <strong>a closing where the money moves first</strong> — funds
            arrive before ownership documents take effect. We publish this
            checklist because our process is built to pass it, and because it
            protects you from anyone whose process isn&rsquo;t.
          </p>
          <h3>What we will never ask for up front</h3>
          <p>
            No logins, no passwords, no FMCSA PIN, no Amazon Relay credentials,
            no bank access — not to produce a valuation, not to make a written
            offer. Account transitions happen as part of the documented closing,
            after signatures, never before. A valuation needs exactly one thing:
            your MC or DOT number, into{" "}
            <Link href="/get-offer">the valuation tool</Link>.
          </p>
          <h3>The transaction structure, on the record</h3>
          <p>
            Every sale is structured as a legitimate corporate transaction — a
            purchase agreement and bill of sale for the LLC itself, with FMCSA
            records updated after closing. We never buy, sell, or broker bare MC
            numbers, which FMCSA prohibits outside a genuine sale of the
            underlying company. The full reasoning is on{" "}
            <Link href="/sell-my-mc-authority">selling your MC authority</Link>{" "}
            and <Link href="/how-it-works">how it works</Link>.
          </p>
        </EditorialBlock>

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
