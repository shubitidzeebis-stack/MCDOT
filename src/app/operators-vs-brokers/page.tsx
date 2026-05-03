import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { EditorialBlock } from "@/components/EditorialBlock";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { CheckIcon } from "@/components/Icons";
import { BreadcrumbSchema } from "@/components/seo/Schema";

export const metadata: Metadata = {
  title: "Operators vs brokers — who should you sell your trucking LLC to?",
  description:
    "Operators buy LLCs to run them. Brokers buy them to flip. The structural difference shows up at exactly the wrong moment — usually during diligence or at closing. Side-by-side comparison.",
  keywords: [
    "trucking LLC operator vs broker",
    "should I sell to a broker",
    "who buys trucking LLCs",
    "Amazon Relay carrier acquirer",
    "operator buyer trucking",
    "trucking M&A broker",
    "chameleon carrier risk",
  ],
  alternates: { canonical: "/operators-vs-brokers" },
  openGraph: {
    title: "Operators vs brokers — who should you sell to?",
    description:
      "The structural difference between an operator-buyer and a broker-buyer changes everything about how a trucking LLC sale closes.",
    url: "/operators-vs-brokers",
  },
};

const ROWS: Array<{
  topic: string;
  operator: string;
  broker: string;
  matters: string;
}> = [
  {
    topic: "Where the money comes from",
    operator: "Their own balance sheet — funds wired from their attorney's escrow at closing.",
    broker: "An end-buyer they haven't closed with yet. Verbal commitment, not committed capital.",
    matters: "Operator offers don't shrink at closing. Broker offers often do.",
  },
  {
    topic: "Who runs the LLC after closing",
    operator: "Them. The acquisition is the first day of operations.",
    broker: "A third-party they're flipping to. Sometimes still being shopped during diligence.",
    matters: "Operators have actually verified what works. Broker resales surface issues weeks later.",
  },
  {
    topic: "How thorough is diligence",
    operator: "Deep — they need to actually run what they buy.",
    broker: "Shallow. Their end-buyer does separate diligence on a different timeline.",
    matters: "Shallow diligence leads to last-minute price drops or busted deals.",
  },
  {
    topic: "Closing timeline",
    operator: "7–14 days. One transaction, one bank wire.",
    broker: "Often 21–60 days. Two transactions stacked. Two banks. Two sets of lawyers.",
    matters: "Every extra day is a day your LLC sits in limbo while you can't operate or commit elsewhere.",
  },
  {
    topic: "Confidentiality",
    operator: "Tight. LLC info goes to their lawyers and lender only.",
    broker: "Wider — your details get shopped to multiple potential end-buyers.",
    matters: "Surface area for leaks correlates with how many people see your file.",
  },
  {
    topic: "Who pays legal fees",
    operator: "Each side pays its own lawyers. Often the buyer covers the bulk.",
    broker: "Sellers often end up paying both sides via 'bundled fees.'",
    matters: "Legal fees on a trucking LLC sale are $2,500–$8,000. Real money.",
  },
  {
    topic: "Risk of authority misuse post-close",
    operator: "Low — they're operating it themselves.",
    broker: "Higher — they don't control what the end-buyer does. Trade press has documented authorities being acquired for double-brokering and cargo-theft schemes.",
    matters: "Even with a clean release, your name is associated with a sold MC. Misuse during the transition window can drag you in.",
  },
  {
    topic: "Aged-MC pricing claims",
    operator: "Realistic — usually below the $20K–$30K headline.",
    broker: "Often inflated to win the listing, then revised down at closing.",
    matters: "The $30K-for-an-aged-MC figure is fraud-ring bait per Overdrive. Real fair-market sits well below it.",
  },
];

export default function OperatorsVsBrokersPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Operators vs brokers" },
        ]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/how-it-works/handshake-keys.png"
          alt="Two hands meeting in a handshake across a matte-black desk over a folded purchase agreement and a set of truck keys"
          eyebrow="Operators vs brokers"
          headlineLine1="Who buys your LLC"
          headlineLine2="changes everything."
          subhead="Operators run what they buy. Brokers flip it. The structural difference shows up at exactly the wrong moment — usually during diligence or at closing."
          objectPosition="object-[50%_35%]"
        />

        {/* Comparison table */}
        <section className="bg-[#0a0a0b] py-20 md:py-28 lg:py-32">
          <div className="mx-auto max-w-[1300px] px-5 md:px-6">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] md:text-[11px]">
              Side-by-side
            </p>
            <h2 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-4xl md:text-5xl">
              Eight differences <span className="italic font-light text-white/85">that hit your wallet.</span>
            </h2>

            <div className="mt-12 overflow-hidden rounded-2xl bg-white/[0.025] ring-1 ring-white/10 backdrop-blur-md md:rounded-3xl">
              {/* Header row — desktop only */}
              <div className="hidden border-b border-white/10 bg-white/[0.03] md:grid md:grid-cols-[1fr_1.4fr_1.4fr_1.4fr]">
                <div className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
                  Topic
                </div>
                <div className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff8a1a]">
                  Operator buyer
                </div>
                <div className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
                  Broker buyer
                </div>
                <div className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
                  Why it matters
                </div>
              </div>

              <ul className="divide-y divide-white/8">
                {ROWS.map((row, i) => (
                  <li
                    key={i}
                    className="grid gap-3 p-6 md:grid-cols-[1fr_1.4fr_1.4fr_1.4fr] md:gap-0 md:p-0"
                  >
                    {/* Mobile labels — hidden on desktop */}
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff8a1a] md:hidden">
                      {row.topic}
                    </p>
                    <div className="hidden md:block md:px-6 md:py-5">
                      <p className="text-[14px] font-semibold text-white leading-snug">
                        {row.topic}
                      </p>
                    </div>

                    <div className="md:px-6 md:py-5">
                      <p className="hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ff8a1a]/70 md:hidden">
                        Operator
                      </p>
                      <p className="flex items-start gap-2 text-[14px] leading-relaxed text-white/85">
                        <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#ff8a1a]/15 text-[#ff8a1a]">
                          <CheckIcon size={9} />
                        </span>
                        {row.operator}
                      </p>
                    </div>

                    <div className="md:px-6 md:py-5">
                      <p className="text-[14px] leading-relaxed text-white/55">
                        {row.broker}
                      </p>
                    </div>

                    <div className="md:px-6 md:py-5">
                      <p className="text-[13.5px] leading-relaxed text-white/65 italic">
                        {row.matters}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <EditorialBlock
          eyebrow="Quick test"
          heading={
            <>
              Four questions <span className="italic font-light text-white/85">that cut through.</span>
            </>
          }
        >
          <p>
            If you&rsquo;re not sure which kind of buyer you&rsquo;re talking to, ask these four
            things directly. Operators answer them quickly. Brokers tend to dance.
          </p>
          <ol>
            <li>
              <strong>&ldquo;Are you the operator or are you re-selling?&rdquo;</strong> Direct
              and the answer reveals a lot. &ldquo;We work with a network of operators&rdquo;
              is a re-sell.
            </li>
            <li>
              <strong>&ldquo;Where will the LLC operate after closing?&rdquo;</strong> Operators
              answer with specifics &mdash; lanes, depots, dispatch markets. Brokers say
              &ldquo;wherever the new owner chooses.&rdquo;
            </li>
            <li>
              <strong>&ldquo;Who pays legal fees?&rdquo;</strong> Operators usually pay their own
              side. Brokers often pass legal costs to the seller.
            </li>
            <li>
              <strong>&ldquo;Can I see the wire confirmation timing?&rdquo;</strong> Operators
              wire same-day or next-day after signing. Brokers often have a 72-hour or 7-day
              processing window because they&rsquo;re waiting on their end-buyer&rsquo;s wire.
            </li>
          </ol>
          <h3>Where Veritor sits</h3>
          <p>
            We&rsquo;re an operator. Every LLC we acquire goes into our operating book. The
            acquisition is the first day of running the LLC, not a step toward reselling it.
            That&rsquo;s why our offers are written before diligence and don&rsquo;t shift at
            closing &mdash; we already have everything we need lined up.
          </p>
        </EditorialBlock>

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
