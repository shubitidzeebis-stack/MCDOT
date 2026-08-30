import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { TrustBar } from "@/components/TrustBar";
import { EditorialBlock } from "@/components/EditorialBlock";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import {
  BreadcrumbSchema,
  FAQPageSchema,
  LeadershipPersonSchemas,
} from "@/components/seo/Schema";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About — built by drivers, for owner-operators",
  description:
    "Veritor Group handles US trucking company sales, including carriers running Amazon Relay. Founded by drivers and owner-operators. 10+ companies sold since June 2026, average close in 3–5 business days.",
  keywords: [
    "about Veritor Group",
    "Veritor Group reviews",
    "sell trucking company USA",
    "Amazon Relay carrier sale",
    "owner-operator exit partner",
    "logistics M&A firm",
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About ${SITE.name} — built by drivers, for owner-operators`,
    description:
      "Founded by people who started as drivers and became owner-operators. 10+ company sales closed since June 2026, average 3–5 business days, in person at the seller's own bank.",
    url: "/about",
    // Image is auto-injected by `src/app/about/opengraph-image.tsx`. Don't
    // set `images` here or it overrides the dynamic OG card.
  },
};

export default function AboutPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "About" }]}
      />
      <LeadershipPersonSchemas />
      <FAQPageSchema
        items={[
          {
            q: "Who is Veritor Group?",
            a: "Veritor Group handles the sale of US trucking companies, including carriers running Amazon Relay contracts. Founded by people who started as drivers and became owner-operators. 10+ companies sold since June 2026, each closed in person at the seller's bank and documented. Headquartered in Dayton, Ohio — Veritor Group LLC, an Ohio limited liability company (see groupveritor.com/verification).",
          },
          {
            q: "What does Veritor Group actually do?",
            a: "Veritor Group runs the sale of your trucking company end to end. That means pulling your FMCSA record and valuing the company, coming back with a written number, preparing the purchase agreement, coordinating any lender payoff, and closing in person at your own bank with the funds moving through a closing attorney's escrow account. You keep 100% of the number you accept — no fees, no commission, nothing deducted at closing.",
          },
          {
            q: "How many trucking company sales has Veritor Group closed?",
            a: "More than ten since June 2026, across the United States, with an average close time of 3 to 5 business days — every one documented and closed in person at the seller's bank. Veritor Group LLC was formed in Ohio in May 2026; the entity and its public filings are listed at groupveritor.com/verification.",
          },
          {
            q: "Where is Veritor Group based?",
            a: "Veritor Group is headquartered at 1918 Brownell Rd, Dayton, Ohio 45403, and operates nationwide across the United States.",
          },
          {
            q: "Who founded Veritor Group?",
            a: "Veritor Group was founded by operators who started as drivers, became owner-operators, and grew into multi-LLC fleet management. Luka S. is the founder; the leadership team includes Temuka K. (Managing Partner) and Lisa K. (Customer Relations).",
          },
        ]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/about/founder-context.webp"
          alt="Veritor Group dispatcher's office at first light — desk with ledger, printouts and a closed laptop, an out-of-focus white semi-truck visible through the window"
          eyebrow="About"
          headlineLine1="Built by drivers."
          headlineLine2="For owner-operators."
          subhead={`${SITE.name} handles the sale of US trucking companies — with a focus on carriers running Amazon Relay contracts and those already past the 180-day mark.`}
          objectPosition="object-[50%_60%]"
        />

        <section className="relative bg-[#0a0a0b] pt-12 pb-20 md:pt-16 md:pb-28">
          <div className="mx-auto max-w-[1300px] px-5 md:px-6">
            <div className="rounded-2xl bg-white/[0.025] p-6 ring-1 ring-white/10 backdrop-blur-md md:rounded-3xl md:p-12 lg:p-16">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#ff8a1a] md:mb-5 md:text-[11px]">
                Leadership
              </p>
              <h2 className="mb-10 max-w-[40rem] text-[1.625rem] font-semibold leading-[1.05] tracking-[-0.025em] text-white md:mb-14 md:text-[2rem] lg:text-[2.25rem]">
                The team behind every{" "}
                <span className="italic font-light text-white/85">written offer.</span>
              </h2>
              <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 md:gap-8">
                <div className="flex flex-col">
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
                    <Image
                      src="/about/team-luka.webp"
                      alt="Luka S., Founder of Veritor Group"
                      fill
                      sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
                    Founder
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white md:text-2xl">
                    Luka S.
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/65 md:text-[15px]">
                    Drives every sale personally — from the first seller
                    call through the final wire transfer. Decade in
                    owner-operator and small-fleet operations.
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
                    {/* Source image is a circular portrait centered on a
                        dark square background, so we scale up inside
                        the overflow-clipped frame to push the circle's
                        edges past the frame edges — no dark corners
                        visible alongside the other portraits. */}
                    <Image
                      src="/about/team-managing-partner.jpg"
                      alt="Temuka K., Managing Partner at Veritor Group"
                      fill
                      sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover scale-[1.55] object-[50%_42%]"
                    />
                  </div>
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
                    Managing Partner
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white md:text-2xl">
                    Temuka K.
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/65 md:text-[15px]">
                    Co-leads every deal with Luka. Owns the
                    pipeline, diligence playbook, and the in-person bank-floor
                    handover that defines a Veritor close.
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
                    <Image
                      src="/about/team-lisa.jpg"
                      alt="Lisa K., Senior Manager at Veritor Group"
                      fill
                      sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover object-[50%_42%]"
                    />
                  </div>
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
                    Customer Relations
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white md:text-2xl">
                    Lisa K.
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/65 md:text-[15px]">
                    Oversees deal flow and diligence. Owns the relationship
                    from accepted offer through wire transfer and FMCSA
                    filings.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </section>

        <EditorialBlock
          eyebrow="The story"
          heading={
            <>
              We started <span className="italic font-light text-white/85">in the seat.</span>
            </>
          }
        >
          <p>
            Veritor was founded by people who started as drivers, became owner-operators,
            and grew into running several companies at once. That history is the whole
            reason the valuations are honest: we know what a trucking company is actually
            worth because we know what it takes to run one.
          </p>
          <h3>Why the process is deliberately boring</h3>
          <p>
            Nothing here is designed to be exciting. Clear requirements, a written number,
            standard paperwork, a bank counter. That&rsquo;s on purpose. In a market where
            trade press keeps documenting authorities being acquired for cargo-theft
            schemes, boring is the feature. Every step leaves something you can check.
          </p>
          <p>
            Veritor Group LLC was formed in Ohio in May 2026, and since June it has
            closed {SITE.trust.companiesSold} company sales across the United States —
            each one documented, closed in person, with an average close time of{" "}
            {SITE.trust.averageCloseDays.toLowerCase()}. The entity, the filings, and
            what to demand from us before signing are all published on the{" "}
            <Link href="/verification">verification page</Link>.
          </p>
          <h3>What you get from us, every time</h3>
          <ul>
            <li>A response within hours, not days</li>
            <li>A written offer, never a verbal handshake</li>
            <li>Funds through a closing attorney&rsquo;s escrow account</li>
            <li>Funds landing as the documents execute — at your bank or online, your call</li>
            <li>100% of the number you accept — no fees, no commission, no deductions</li>
            <li>Full discretion — your identity stays private and nothing is shopped around</li>
            <li>If your company isn&rsquo;t a fit, you hear that the same day, with the reason</li>
          </ul>
        </EditorialBlock>

        <TrustBar locale="en" />
        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
