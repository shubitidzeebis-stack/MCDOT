import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { WhyVeritor } from "@/components/WhyVeritor";
import { TrustBar } from "@/components/TrustBar";
import { EditorialBlock } from "@/components/EditorialBlock";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { CheckIcon } from "@/components/Icons";
import { BreadcrumbSchema, ServiceSchema } from "@/components/seo/Schema";

export const metadata: Metadata = {
  title: "Why sell to Veritor — operators, not brokers",
  description:
    "We're operators, not brokers. Every LLC goes into our operating book — that's why we move fast and pay fair. 400+ US logistics LLCs acquired.",
  keywords: [
    "Veritor Group reviews",
    "best trucking LLC buyer",
    "operator LLC acquirer",
    "trustworthy trucking company buyer",
    "fastest LLC sale",
    "confidential trucking M&A",
    "Amazon Relay carrier acquirer",
  ],
  alternates: {
    canonical: "/why-veritor",
    languages: {
      "en-US": "/why-veritor",
      es: "/es/why-veritor",
      ru: "/ru/why-veritor",
      "x-default": "/why-veritor",
    },
  },
  openGraph: {
    title: "Why sellers choose Veritor Group",
    description:
      "Operators buying from operators. Written offers, close in 3–5 business days, full transfer handled, complete confidentiality.",
    url: "/why-veritor",
  },
};

const HIGHLIGHT_ROWS: Array<{ topic: string; veritor: string; marketplace: string }> = [
  {
    topic: "Who buys",
    veritor: "Us — we run every LLC we acquire ourselves.",
    marketplace: "A broker re-selling to whoever shows up.",
  },
  {
    topic: "Where the money comes from",
    veritor: "Our own balance sheet — funds wired at the table.",
    marketplace: "An end-buyer the broker hasn't yet closed with.",
  },
  {
    topic: "Time to close",
    veritor: "3–5 business days, one wire, one signing.",
    marketplace: "21–60 days, two transactions stacked, two sets of lawyers.",
  },
  {
    topic: "How many people see your file",
    veritor: "Our lawyers and lender. That's it.",
    marketplace: "Shopped to every potential end-buyer on their list.",
  },
];

export default function WhyVeritorPage() {
  return (
    <>
      <ServiceSchema
        name="Operator-led trucking LLC acquisition"
        description="Operator-led acquisition of US logistics LLCs and Amazon Relay carriers. Written offers, 3–5 business day close, full transfer handled, complete confidentiality."
        url="/why-veritor"
      />
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Why Veritor" }]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <h1 className="sr-only">Why sellers choose Veritor Group to buy their trucking LLC</h1>

        <PageHero
          image="/how-it-works/handshake-keys.png"
          alt="Two hands meeting in a handshake across a matte-black desk over a folded purchase agreement and a set of truck keys"
          eyebrow="Why Veritor"
          headlineLine1="Operators buying"
          headlineLine2="from operators."
          subhead="Every LLC we buy goes into our own operating book. That single fact is what lets us write the offer before diligence, close in 3–5 business days, and never shop your file."
          objectPosition="object-[50%_40%]"
        />

        <TrustBar locale="en" />

        <EditorialBlock
          eyebrow="What we actually are"
          heading={
            <>
              An operator,{" "}
              <span className="italic font-light text-white/85">not an intermediary.</span>
            </>
          }
        >
          <p>
            Most companies buying trucking LLCs are intermediaries — brokers, aggregators,
            listing platforms. Their business model is finding sellers, wrapping a purchase
            agreement around an LLC, and re-selling it to a third party. They never run the
            LLC. They never intended to.
          </p>
          <p>
            Veritor is the opposite. We acquire US logistics LLCs to operate them. The day
            we sign the wire is the day our dispatchers start booking loads on your authority,
            our compliance team starts filing on your DOT, and your insurance gets re-bound
            under our policy. There is no &ldquo;next buyer.&rdquo; We are the next buyer.
          </p>
          <p>
            That changes everything about how the sale works for you. Our offer is written
            before diligence because we&rsquo;re the ones who have to live with the answer —
            we already have funding lined up, lanes mapped, and a dispatch desk that knows
            what to do with a freshly transferred authority on Monday morning.
          </p>
          <h3>Why this matters in practice</h3>
          <p>
            When the buyer is the operator, three things stop happening to you. The price
            doesn&rsquo;t shrink at closing — there&rsquo;s no end-buyer whose separate
            diligence could blow up the number. Confidentiality stays tight — your details
            don&rsquo;t get circulated to a network of prospective end-buyers. And the
            timeline collapses — one signing, one wire, the same week.
          </p>
        </EditorialBlock>

        <WhyVeritor locale="en" />

        {/* Condensed broker comparison + handoff to /operators-vs-brokers */}
        <section className="relative bg-[#0a0a0b] py-20 md:py-28 lg:py-32">
          <div className="mx-auto max-w-[1300px] px-5 md:px-6">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] md:text-[11px]">
              Selling to us vs a broker marketplace
            </p>
            <h2 className="max-w-[820px] text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-4xl md:text-5xl">
              Four differences{" "}
              <span className="italic font-light text-white/85">that move the close date.</span>
            </h2>

            <div className="mt-12 overflow-hidden rounded-2xl bg-white/[0.025] ring-1 ring-white/10 backdrop-blur-md md:rounded-3xl">
              <div className="hidden border-b border-white/10 bg-white/[0.03] md:grid md:grid-cols-[1fr_1.4fr_1.4fr]">
                <div className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
                  Topic
                </div>
                <div className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff8a1a]">
                  Veritor (operator)
                </div>
                <div className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
                  Broker marketplace
                </div>
              </div>

              <ul className="divide-y divide-white/8">
                {HIGHLIGHT_ROWS.map((row, i) => (
                  <li
                    key={i}
                    className="grid gap-3 p-6 md:grid-cols-[1fr_1.4fr_1.4fr] md:gap-0 md:p-0"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff8a1a] md:hidden">
                      {row.topic}
                    </p>
                    <div className="hidden md:block md:px-6 md:py-5">
                      <p className="text-[14px] font-semibold text-white leading-snug">
                        {row.topic}
                      </p>
                    </div>

                    <div className="md:px-6 md:py-5">
                      <p className="flex items-start gap-2 text-[14px] leading-relaxed text-white/85">
                        <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#ff8a1a]/15 text-[#ff8a1a]">
                          <CheckIcon size={9} />
                        </span>
                        {row.veritor}
                      </p>
                    </div>

                    <div className="md:px-6 md:py-5">
                      <p className="text-[14px] leading-relaxed text-white/55">
                        {row.marketplace}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <p className="max-w-[560px] text-[15px] leading-relaxed text-white/65">
                Four more differences sit on the full comparison page — diligence depth,
                authority-misuse risk, who pays legal fees, and how aged-MC pricing actually
                works.
              </p>
              <Link
                href="/operators-vs-brokers"
                className="group inline-flex items-center gap-3 rounded-full bg-[#ff8a1a] py-2 pl-5 pr-2 text-sm font-semibold text-[#0a0a0b] transition-all duration-300 hover:bg-[#ffb371]"
              >
                <span>See the full comparison</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0b]/15 transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </div>
        </section>

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
