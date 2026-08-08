import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { EditorialBlock } from "@/components/EditorialBlock";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { CheckIcon } from "@/components/Icons";
import { BreadcrumbSchema, FAQPageSchema } from "@/components/seo/Schema";
import { DEFAULT_OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Selling a trucking company: how to spot a fraud setup",
  description:
    "Eight checks that separate a documented trucking company sale from the cargo-theft pattern FMCSA warned carriers about in 2026. Written agreement, attorney escrow, in-person closing.",
  keywords: [
    "trucking company sale scam",
    "is selling my MC authority safe",
    "MC number scam",
    "cargo theft authority scheme",
    "how to sell a trucking company safely",
    "trucking authority fraud",
    "chameleon carrier risk",
  ],
  alternates: { canonical: "/operators-vs-brokers" },
  openGraph: {
    title: "How to tell a real trucking company sale from a fraud setup",
    description:
      "Eight checks, each takes about a minute. Written agreement, attorney escrow, in-person bank closing — and the requests that should end the conversation.",
    url: "/operators-vs-brokers",
    images: [DEFAULT_OG_IMAGE],
  },
};

const ROWS: Array<{
  topic: string;
  safe: string;
  risky: string;
  matters: string;
}> = [
  {
    topic: "The purchase agreement",
    safe: "A written agreement handed to you before you commit, so your own lawyer can read it.",
    risky: "A verbal number on a phone call. Paperwork promised once things 'get started'.",
    matters: "A verbal number isn't a deal. It costs nothing to change at the table, and it usually does.",
  },
  {
    topic: "How the funds move",
    safe: "Into a closing attorney's escrow account, released to you when the documents are signed.",
    risky: "Straight from a personal account, a payment app, or cash.",
    matters: "Escrow is the one step that still protects you if the other side walks after you've signed.",
  },
  {
    topic: "The order things happen in",
    safe: "Funds land as the documents execute — escrow releases on signature, whether you close at your bank or online.",
    risky: "Documents and logins go first. The money comes 'after'.",
    matters: "Hand over the company before the money moves and you have no leverage left. This is the test, not whether you meet face to face.",
  },
  {
    topic: "What gets asked for first",
    safe: "Your MC or DOT number. That's public FMCSA information and nothing else is needed to price it.",
    risky: "LLC documents, EIN letter, bank and portal logins — before anything is signed.",
    matters: "Nobody needs your logins to value a company. That request is the clearest tell there is.",
  },
  {
    topic: "Legal counsel",
    safe: "Encouraged. You're told to have your own lawyer read the agreement.",
    risky: "Discouraged, or framed as an unnecessary delay and expense.",
    matters: "The only reason to talk you out of a lawyer is that a lawyer would stop it.",
  },
  {
    topic: "Pace",
    safe: "Fast because the paperwork is already prepared — but you set the timeline.",
    risky: "Urgent. A deadline that exists for their benefit and never quite gets explained.",
    matters: "Manufactured urgency is the oldest pressure tactic in this market.",
  },
  {
    topic: "What actually changes hands",
    safe: "The company itself, as a documented corporate transaction — the structure FMCSA recognises.",
    risky: "An arrangement to hand over the MC or DOT number on its own.",
    matters: "FMCSA's March 2026 bulletin is explicit: sell, buy, or lease a number outside a real corporate transaction and the authority gets revoked.",
  },
  {
    topic: "The number itself",
    safe: "Priced off your actual FMCSA record and Relay status, then put in writing.",
    risky: "$30,000 quoted sight-unseen, with no diligence and no agreement.",
    matters: "Overdrive has reported the $30K aged-authority figure as fraud-ring bait. A real number requires looking at your record first.",
  },
];

export default function OperatorsVsBrokersPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Selling safely" },
        ]}
      />
      <FAQPageSchema
        items={[
          {
            q: "How do I know a trucking company sale is legitimate and not a fraud setup?",
            a: "Three checks sort it almost every time. First, is there a written purchase agreement handed to you before you commit, so your own lawyer can read it? Second, do the funds move through a closing attorney's escrow account rather than person to person? Third, does the money land as the documents execute — rather than you handing over the company and waiting? A fraud operation won't agree to any of the three, because escrow creates a paper trail, a written agreement creates liability, and releasing funds on signature removes the entire window it depends on. Note that closing remotely is not itself a warning sign — a remote closing run through escrow is perfectly legitimate, and plenty of sellers prefer it. What matters is the order things happen in.",
          },
          {
            q: "Is it safe to send my LLC documents and logins before signing anything?",
            a: "No, and being asked for them early is the clearest warning sign there is. Pricing a trucking company requires nothing more than your MC or DOT number, which is public FMCSA information. Formation documents, EIN letters, bank credentials, and portal logins are closing-stage items that come after there is a signed agreement and escrow in place.",
          },
          {
            q: "Can I sell just my MC number and keep the company?",
            a: "No. FMCSA issued a bulletin in March 2026 stating plainly that a USDOT or MC number must not be sold, purchased, or leased outside a legitimate corporate transaction, and that it will move to inactivate the number and revoke related registrations where that happens. The legitimate structure is a sale of the company itself, with the authority staying attached to the entity it belongs to.",
          },
          {
            q: "Are $20,000–$30,000 offers for aged MC authority legitimate?",
            a: "Be cautious. Overdrive and other trade press have reported that $30K headline offers for 'aged authority' often come from operations planning to use the number for double-brokering or cargo theft rather than legitimate freight. Real fair-market pricing for a clean company sits well below those headline figures in most cases. If someone offers $30,000 with no diligence and no written agreement, slow down and verify who you're talking to.",
          },
          {
            q: "Why does escrow matter when selling a trucking company?",
            a: "Escrow is the step that protects you after you have signed but before the money has cleared. Funds go into a closing attorney's escrow account and are released when the documents are executed, so neither side can take the asset and walk. Money offered directly from a personal account, a payment app, or in cash removes that protection entirely — and removing it is usually the point.",
          },
          {
            q: "Should I have my own lawyer review the purchase agreement?",
            a: "Yes, always, and how the other side reacts to that question is itself a test. A legitimate transaction expects it and has the agreement ready to send. Being told a lawyer is an unnecessary delay or expense is a reason to stop, because the only motive for talking you out of counsel is that counsel would end the deal.",
          },
          {
            q: "How fast should a legitimate trucking company sale close?",
            a: "Three to five business days is achievable when the paperwork is prepared in advance, and 7–14 days is common once loans, liens, or factoring lines are involved. Speed on its own isn't the warning sign — manufactured urgency is. A deadline that exists for the other side's benefit, and never quite gets explained, is a pressure tactic rather than a schedule.",
          },
          {
            q: "What protects me from what happens to the company after I sell it?",
            a: "The purchase agreement carries a release of seller liability for post-close events, and the closing has a clear effective date that draws the line between what was yours and what wasn't. Your CDL and personal driving record are separate from the company either way. The specifics of what is and isn't covered are worth going through directly with whoever you're selling to before you sign.",
          },
        ]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/how-it-works/handshake-keys.png"
          alt="Two hands meeting in a handshake across a matte-black desk over a folded purchase agreement and a set of truck keys"
          eyebrow="Before you sign anything"
          headlineLine1="Who you sell to"
          headlineLine2="changes everything."
          subhead="Trucking authorities are being acquired to run cargo-theft and double-brokering schemes, and FMCSA spent 2026 warning carriers about it. Eight checks separate a documented sale from that pattern. Each one takes about a minute."
          objectPosition="object-[50%_35%]"
        />

        {/* Comparison table */}
        <section className="bg-[#0a0a0b] py-20 md:py-28 lg:py-32">
          <div className="mx-auto max-w-[1300px] px-5 md:px-6">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] md:text-[11px]">
              Side-by-side
            </p>
            <h2 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-4xl md:text-5xl">
              Eight checks <span className="italic font-light text-white/85">worth a minute each.</span>
            </h2>

            <div className="mt-12 overflow-hidden rounded-2xl bg-white/[0.025] ring-1 ring-white/10 backdrop-blur-md md:rounded-3xl">
              {/* Header row — desktop only */}
              <div className="hidden border-b border-white/10 bg-white/[0.03] md:grid md:grid-cols-[1fr_1.4fr_1.4fr_1.4fr]">
                <div className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
                  Topic
                </div>
                <div className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff8a1a]">
                  A documented sale
                </div>
                <div className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
                  The pattern to avoid
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
                        Documented
                      </p>
                      <p className="flex items-start gap-2 text-[14px] leading-relaxed text-white/85">
                        <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#ff8a1a]/15 text-[#ff8a1a]">
                          <CheckIcon size={9} />
                        </span>
                        {row.safe}
                      </p>
                    </div>

                    <div className="md:px-6 md:py-5">
                      <p className="text-[14px] leading-relaxed text-white/55">
                        {row.risky}
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
            If you&rsquo;re unsure about who you&rsquo;re dealing with, ask these four things
            directly. How they answer matters more than what they answer.
          </p>
          <ol>
            <li>
              <strong>&ldquo;Can I see the purchase agreement before I commit to anything?&rdquo;</strong>{" "}
              A real one is already drafted and gets sent over. Hesitation here should end the
              conversation.
            </li>
            <li>
              <strong>&ldquo;Which attorney&rsquo;s escrow account do the funds go through?&rdquo;</strong>{" "}
              There should be a name and a firm behind that answer. &ldquo;We&rsquo;ll just wire
              you directly&rdquo; is the wrong answer, every time.
            </li>
            <li>
              <strong>&ldquo;When exactly do the funds land relative to signing?&rdquo;</strong>{" "}
              The right answer is &ldquo;the same moment, escrow releases on signature.&rdquo;
              Anything that has you handing over the company first and waiting is the whole
              scam in one sentence.
            </li>
            <li>
              <strong>&ldquo;Why do you need this before anything is signed?&rdquo;</strong> Ask
              it about every single document requested. Your MC number is public. Your bank
              logins are not, and nothing about pricing a company requires them.
            </li>
          </ol>
          <h3>Where Veritor sits</h3>
          <p>
            All four get a yes here, and that&rsquo;s deliberate. The agreement is drafted
            before you&rsquo;re asked to commit to anything. Funds move through a closing
            attorney&rsquo;s escrow account and release on signature, so the money lands as
            the documents execute rather than after. You can close in person at your own
            bank or handle it online, whichever suits you — the protection comes from the
            escrow, not the postcode. And nothing is asked of you beyond your MC or DOT
            number until there is a written figure in front of you.
          </p>
          <p>
            None of that is generosity &mdash; it&rsquo;s just what a real transaction looks
            like. Which is exactly why it&rsquo;s worth insisting on wherever you end up
            selling, including somewhere that isn&rsquo;t here.
          </p>
        </EditorialBlock>

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
