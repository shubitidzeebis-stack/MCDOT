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
import { DEFAULT_OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Why sell through Veritor — a sale you can verify",
  description:
    "Written purchase agreement, funds through a closing attorney's escrow account, money landing as the documents execute. You keep 100% of the number you accept. 400+ sales closed.",
  keywords: [
    "Veritor Group reviews",
    "safe way to sell a trucking company",
    "trucking company sale scam",
    "is selling my MC authority safe",
    "fastest trucking company sale",
    "confidential trucking M&A",
    "Amazon Relay carrier sale",
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
      "A sale you can verify at every step. Written offer, attorney escrow, in-person bank closing in 3–5 business days, complete confidentiality.",
    url: "/why-veritor",
    images: [DEFAULT_OG_IMAGE],
  },
};

const HIGHLIGHT_ROWS: Array<{ topic: string; veritor: string; marketplace: string }> = [
  {
    topic: "The agreement",
    veritor: "A written purchase agreement you can hand to your own lawyer before signing.",
    marketplace: "A verbal number on a phone call. Paperwork promised 'later'.",
  },
  {
    topic: "How the money moves",
    veritor: "Through a closing attorney's escrow account, released when the documents are signed.",
    marketplace: "Straight from a personal account. Or cash.",
  },
  {
    topic: "The order things happen in",
    veritor: "Escrow releases on signature — funds land as the documents execute, at your bank or online, your choice.",
    marketplace: "Documents and logins go first. The money comes 'after'.",
  },
  {
    topic: "What gets asked for first",
    veritor: "Your MC or DOT number — public FMCSA information, nothing sensitive.",
    marketplace: "Your LLC documents and account logins, before anything is signed.",
  },
];

export default function WhyVeritorPage() {
  return (
    <>
      <ServiceSchema
        name="Trucking company sale — documented, escrow-backed closing"
        description="Sell a US trucking company or Amazon Relay carrier with a written purchase agreement and funds moving through a closing attorney's escrow account. Close at your own bank or remotely, in 3–5 business days."
        url="/why-veritor"
      />
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Why Veritor" }]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <h1 className="sr-only">Why sellers choose Veritor Group to sell their trucking company</h1>

        <PageHero
          image="/how-it-works/handshake-keys.png"
          alt="Two hands meeting in a handshake across a matte-black desk over a folded purchase agreement and a set of truck keys"
          eyebrow="Why Veritor"
          headlineLine1="A sale you can"
          headlineLine2="actually verify."
          subhead="Every step here leaves something you can check — the agreement, the escrow account, the bank counter. In this market that isn't a nicety. It's the difference between a real sale and the pattern FMCSA has spent 2026 warning carriers about."
          objectPosition="object-[50%_40%]"
        />

        <TrustBar locale="en" />

        <EditorialBlock
          eyebrow="What a safe sale looks like"
          heading={
            <>
              Three checks,{" "}
              <span className="italic font-light text-white/85">and they take a minute.</span>
            </>
          }
        >
          <p>
            Overdrive and CCJ have both documented rings acquiring trucking authorities to
            run cargo-theft and double-brokering schemes. In March 2026 FMCSA put out a
            bulletin telling carriers not to sell, buy, or lease a USDOT or MC number
            outside a legitimate corporate transaction. If you are thinking about selling,
            you are selling into a market that has a real fraud problem — and you should be
            checking whoever you talk to. Including us.
          </p>
          <p>
            There are three things worth checking, and they sort the legitimate from the
            rest almost every time. First, is there a written purchase agreement you can put
            in front of your own lawyer before you sign anything? Second, do the funds move
            through a closing attorney&rsquo;s escrow account rather than person to person?
            Third, does the money land as the documents execute, rather than you handing
            over the company and waiting for a wire that may never come?
          </p>
          <p>
            A fraud operation will not agree to any of the three. It cannot — escrow creates
            a paper trail, a written agreement creates liability, and releasing funds on
            signature closes the only window the whole thing depends on. What it will do
            instead is push for speed, offer cash, refuse legal counsel, and ask for your
            LLC documents and logins before any money moves. That last one is the clearest
            signal there is. Note that closing remotely is not itself a red flag — a remote
            closing run through escrow is perfectly legitimate, and plenty of sellers prefer
            it. What matters is the order, not the location.
          </p>
          <h3>What this means for your sale</h3>
          <p>
            The whole process here is built so those three checks pass. You get one written
            number, not a verbal figure that shrinks at the table. Nothing comes out of that
            number — no fees, no commission, no deductions at closing. And the sale stays
            between you and us: nothing is listed publicly, nothing is advertised, and your
            company is never shopped around.
          </p>
        </EditorialBlock>

        <WhyVeritor locale="en" />

        {/* Condensed safety comparison + handoff to the full guide */}
        <section className="relative bg-[#0a0a0b] py-20 md:py-28 lg:py-32">
          <div className="mx-auto max-w-[1300px] px-5 md:px-6">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] md:text-[11px]">
              A documented sale vs the pattern to avoid
            </p>
            <h2 className="max-w-[820px] text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-4xl md:text-5xl">
              Four checks{" "}
              <span className="italic font-light text-white/85">that tell you which one you&rsquo;re in.</span>
            </h2>

            <div className="mt-12 overflow-hidden rounded-2xl bg-white/[0.025] ring-1 ring-white/10 backdrop-blur-md md:rounded-3xl">
              <div className="hidden border-b border-white/10 bg-white/[0.03] md:grid md:grid-cols-[1fr_1.4fr_1.4fr]">
                <div className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
                  Topic
                </div>
                <div className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff8a1a]">
                  A documented sale
                </div>
                <div className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
                  The pattern to avoid
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
                Four more checks sit on the full guide — what a purchase agreement should
                actually contain, why escrow matters more than the number, what FMCSA&rsquo;s
                2026 bulletin changed, and how the $30K aged-authority pitch really works.
              </p>
              <Link
                href="/operators-vs-brokers"
                className="group inline-flex items-center gap-3 rounded-full bg-[#ff8a1a] py-2 pl-5 pr-2 text-sm font-semibold text-[#0a0a0b] transition-all duration-300 hover:bg-[#ffb371]"
              >
                <span>Read the full guide</span>
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
