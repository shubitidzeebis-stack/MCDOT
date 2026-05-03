import type { Metadata } from "next";
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

        <TrustBar locale="en" />
        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
