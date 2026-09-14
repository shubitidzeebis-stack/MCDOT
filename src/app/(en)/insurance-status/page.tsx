import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { EditorialBlock } from "@/components/EditorialBlock";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { McQuickForm } from "@/components/McQuickForm";
import { BreadcrumbSchema, FAQPageSchema } from "@/components/seo/Schema";

// Brand-query answer page. Search Console (Sep 12–14, 2026) showed "check if
// insurance is active veritor group llc" and "what does inactive insurance
// mean veritor group llc" — 12 impressions in 28 days, zero clicks, no page
// answering the question in its title. The wizard already reads insurance
// status off the FMCSA record for every lookup, so this page puts the lookup
// box next to the explanation. Facts come from the active-vs-inactive
// insurance post, /requirements and the FMCSA-status logic in src/lib/fmcsa.ts.

export const metadata: Metadata = {
  title: "Is my insurance active? What active and inactive insurance mean on your FMCSA record",
  description:
    "Check whether your trucking company's insurance shows as active or inactive on the FMCSA record, what an inactive filing means for your authority, and how each case affects a sale. Enter your MC or DOT to see your status.",
  keywords: [
    "check if insurance is active",
    "is my insurance active fmcsa",
    "what does inactive insurance mean",
    "inactive insurance trucking company",
    "bipd insurance on file",
    "veritor group insurance",
  ],
  alternates: {
    canonical: "/insurance-status",
    languages: { "x-default": "/insurance-status" },
  },
  openGraph: {
    title: "Is my insurance active? What active and inactive insurance mean on your FMCSA record",
    description:
      "What the FMCSA record shows, what an inactive filing means for your authority, and which sale structures still work when coverage has lapsed.",
    url: "/insurance-status",
    images: ["/requirements/document-table.png"],
  },
};

export default function InsuranceStatusPage() {
  return (
    <>
      <FAQPageSchema
        items={[
          {
            q: "How do I check if my insurance is active?",
            a: "Your FMCSA record shows whether liability (BIPD) insurance is on file for your authority. Enter your MC or DOT number in the free lookup on this page and the current status comes back with the rest of your record in about 90 seconds. The other reliable check is to call your insurance agent and ask whether the policy is currently in force and whether the FMCSA filing is current.",
          },
          {
            q: "What does inactive insurance mean on my FMCSA record?",
            a: "For-hire carriers must keep liability insurance on file with FMCSA. When that filing lapses — the policy was cancelled, expired, or the insurer withdrew the filing — the record shows no coverage on file and the insurance reads as inactive. FMCSA can revoke operating authority over a lapsed filing, so an inactive reading is usually the first sign an authority is at risk.",
          },
          {
            q: "Can I still sell my trucking company if my insurance is inactive?",
            a: "It depends on what else the company holds. If the LLC has an active Amazon Relay contract, yes: the contract is the asset, and coverage is re-bound immediately at closing as part of the transfer. If the company has neither active insurance nor a Relay contract, it generally does not qualify, because there is no active operating relationship to step into.",
          },
          {
            q: "Do I keep paying premiums until closing?",
            a: "If the policy is active, yes — it should not lapse mid-deal. Any prepaid coverage from the closing date forward is reimbursed pro-rata.",
          },
          {
            q: "Does my insurance transfer with the company?",
            a: "Coverage is re-bound under the new owner at closing, either with the existing carrier or a new one. If it had lapsed, it is re-bound from scratch. Either way, you are not responsible for coverage after closing.",
          },
          {
            q: "Does an open claim stop the sale?",
            a: "No, but disclose it up front. Open claims are not deal-breakers; the carrier needs to know about them during the transfer.",
          },
        ]}
      />
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Is my insurance active?" }]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/requirements/document-table.png"
          alt="Documents, pen, and truck keys arranged on a desk before a closing"
          eyebrow="Insurance status"
          headlineLine1="Is your insurance active?"
          headlineLine2="Check it in 90 seconds."
          subhead="Your FMCSA record shows whether liability insurance is on file. Enter your MC or DOT below to see your current status, and read what active and inactive actually mean for your authority and for a sale."
          objectPosition="object-center"
        />

        <section className="mx-auto max-w-3xl px-5 py-10 md:px-6 md:py-14">
          <McQuickForm headline="See your insurance status on the FMCSA record. Enter your MC or DOT." />
        </section>

        <EditorialBlock
          eyebrow="What the record shows"
          heading={
            <>
              Active means on file.{" "}
              <span className="italic font-light text-white/85">
                Inactive means the filing has lapsed.
              </span>
            </>
          }
        >
          <p>
            Every for-hire carrier has to keep liability insurance &mdash; the BIPD
            filing &mdash; on record with FMCSA. When a policy is in force and the
            insurer has filed it, your record shows coverage on file and the insurance
            reads as <strong>active</strong>. When the policy is cancelled, expires, or
            the insurer withdraws the filing, the record shows nothing on file and the
            insurance reads as <strong>inactive</strong>.
          </p>
          <p>
            That distinction matters beyond paperwork. FMCSA can revoke operating
            authority over a lapsed filing, so an inactive reading is usually the first
            sign that an authority is at risk. It is also the first thing a serious
            acquirer looks at, for three reasons: an active policy is a continuity
            signal, it is the onboarding gate that networks like Amazon Relay require
            before they take on a carrier, and it means an underwriter has already
            verified the authority, the vehicle registrations and the DOT compliance.
          </p>
          <p>
            If you are not sure which state you are in, the lookup box above reads it
            straight off your FMCSA record. The other reliable check is a call to your
            insurance agent asking whether the policy is in force <em>and</em> whether
            the FMCSA filing is current &mdash; they are not always the same thing.
          </p>
        </EditorialBlock>

        <EditorialBlock
          eyebrow="What it means for a sale"
          heading={
            <>
              Active works either way.{" "}
              <span className="italic font-light text-white/85">
                Inactive depends on Relay.
              </span>
            </>
          }
        >
          <h3>Insurance active</h3>
          <p>
            The straightforward case. Coverage is re-bound under the new owner at
            closing, with the existing carrier or a new one, and the transition is
            invisible to anyone checking the company&rsquo;s coverage. This works
            whether or not the company has an Amazon Relay contract. For a company
            without Relay, active coverage is usually a hard requirement, because
            without it the company cannot move into Relay onboarding without
            re-binding from scratch.
          </p>
          <h3>Insurance inactive, active Amazon Relay contract</h3>
          <p>
            Still qualifies. The contract is the asset: even with lapsed coverage the
            company has a current relationship with Amazon, and insurance is re-bound
            immediately at closing as part of the transfer. How a Relay sale runs is on{" "}
            <Link href="/sell-amazon-relay-account">selling a Relay carrier</Link>.
          </p>
          <h3>Insurance inactive, no Relay contract</h3>
          <p>
            Generally does not qualify. There is no active operating relationship to
            step into, and a bare authority with no operating history and no contract
            is not worth much on its own. The full eligibility list is on{" "}
            <Link href="/requirements">requirements</Link>.
          </p>
          <h3>Practical points at closing</h3>
          <ul>
            <li>
              If the policy is active, keep paying premiums until closing so it does
              not lapse mid-deal. Prepaid coverage from the closing date forward is
              reimbursed pro-rata.
            </li>
            <li>
              Open claims are not deal-breakers, but disclose them up front.
            </li>
            <li>
              Commercial auto, cargo and general liability policies all transfer
              together; nothing is cherry-picked.
            </li>
          </ul>
          <p>
            The longer version is in{" "}
            <Link href="/blog/active-vs-inactive-insurance">
              active vs. inactive insurance
            </Link>
            , and how the company itself changes hands is on{" "}
            <Link href="/llc-transfer">how the LLC transfer works</Link>.
          </p>
        </EditorialBlock>

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
