import type { Metadata } from "next";
import Image from "next/image";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { TrustBar } from "@/components/TrustBar";
import { EditorialBlock } from "@/components/EditorialBlock";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `About ${SITE.name}`,
  description: `${SITE.name} is an operator-led US acquirer of logistics LLCs and Amazon Relay carriers. Founded by drivers and owner-operators. 400+ LLCs closed across the United States, average close in under two weeks.`,
  keywords: [
    "about Veritor Group",
    "operator-led LLC acquirer",
    "trucking company buyer USA",
    "Amazon Relay carrier acquirer",
    "owner-operator exit partner",
    "logistics M&A firm",
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About ${SITE.name} — operator-led LLC acquirer`,
    description:
      "Founded by operators, not brokers. We acquire US logistics LLCs and operate them ourselves. Every deal goes into our book — that's why we close fast and pay fair.",
    url: "/about",
    images: ["/about/founder-context.png"],
  },
};

export default function AboutPage() {
  return (
    <>
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/about/founder-context.png"
          alt="Veritor Group dispatcher's office at first light — desk with ledger, printouts and a closed laptop, an out-of-focus white semi-truck visible through the window"
          eyebrow="About"
          headlineLine1="Operator-led."
          headlineLine2="Acquirer-focused."
          subhead={`${SITE.name} acquires US logistics LLCs — with a focus on those running Amazon Relay contracts and those holding fresh MC authority we can put to work immediately.`}
          objectPosition="object-[50%_60%]"
        />

        <EditorialBlock
          eyebrow="The story"
          heading={
            <>
              Operators buying <span className="italic font-light text-white/85">from operators.</span>
            </>
          }
        >
          <p>
            We&rsquo;re not brokers and we&rsquo;re not flippers. Every LLC we buy goes
            into our operating book. That&rsquo;s why we close fast and pay fairly:
            we&rsquo;re not waiting on a third-party buyer or shopping your deal around.
          </p>
          <h3>How we got here</h3>
          <p>
            Veritor was founded by operators who started as drivers, became
            owner-operators, and grew into multi-LLC fleet management. We know exactly
            what an LLC is worth because we know exactly how to run it.
          </p>
          <p>
            Today we&rsquo;ve completed {SITE.trust.acquisitionsCompleted} acquisitions
            across the United States, with an average close time of{" "}
            {SITE.trust.averageCloseDays.toLowerCase()}. Our process is deliberately
            boring: clear requirements, written offers, standard paperwork. No surprises.
          </p>
          <h3>What we promise sellers</h3>
          <ul>
            <li>A response within hours, not days</li>
            <li>A written offer, not a verbal handshake</li>
            <li>Full discretion — your identity stays private</li>
            <li>We pay our own legal fees</li>
            <li>If you don&rsquo;t qualify, we&rsquo;ll tell you why</li>
          </ul>
        </EditorialBlock>

        <section className="relative bg-[#0a0a0b] pb-20 md:pb-28">
          <div className="mx-auto max-w-[1300px] px-5 md:px-6">
            <div className="rounded-2xl bg-white/[0.025] p-6 ring-1 ring-white/10 backdrop-blur-md md:rounded-3xl md:p-12 lg:p-16">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#ff8a1a] md:mb-5 md:text-[11px]">
                Leadership
              </p>
              <h2 className="mb-10 max-w-[40rem] text-[1.625rem] font-semibold leading-[1.05] tracking-[-0.025em] text-white md:mb-14 md:text-[2rem] lg:text-[2.25rem]">
                The team behind every{" "}
                <span className="italic font-light text-white/85">written offer.</span>
              </h2>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 md:gap-10">
                <div className="flex flex-col">
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
                    <Image
                      src="/about/team-luka.png"
                      alt="Luka S., Founder of Veritor Group"
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
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
                    Drives every acquisition personally — from the first seller
                    call through the final wire transfer. Decade in
                    owner-operator and small-fleet operations.
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
                    <Image
                      src="/about/team-lisa.jpg"
                      alt="Lisa K., Senior Manager at Veritor Group"
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
                    Senior Manager
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

                <div className="flex flex-col">
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
                    <Image
                      src="/about/team-giorgi.jpg"
                      alt="Giorgi S., Customer Relations at Veritor Group"
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
                    Customer Relations
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white md:text-2xl">
                    Giorgi S.
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/65 md:text-[15px]">
                    Owns post-close seller satisfaction — checks in after the
                    wire transfer, resolves anything that surfaces, and keeps
                    every relationship clean.
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
                    <Image
                      src="/about/team-keira.png"
                      alt="Keira T., Assistant Manager at Veritor Group"
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
                    Assistant Manager
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white md:text-2xl">
                    Keira T.
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/65 md:text-[15px]">
                    First point of contact for sellers — handles intake calls,
                    NDA paperwork, and scheduling.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <TrustBar locale="en" />
        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
