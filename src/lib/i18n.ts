// Locale dictionaries for the marketing site.
// EN is canonical; ES and RU are translated from EN. Native review pending
// before production launch — keep keys in sync across locales.

export type Locale = "en" | "es" | "ru";

export const LOCALES = ["en", "es", "ru"] as const;

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  es: "Español",
  ru: "Русский",
};

// `localePath("/", "es")` → "/es"
// `localePath("/about", "ru")` → "/ru/about"  (only `/` exists per-locale for now)
// `localePath("/faq", "en")` → "/faq"
export function localePath(path: string, locale: Locale): string {
  if (locale === "en") return path;
  if (path === "/") return `/${locale}`;
  return `/${locale}${path}`;
}

// Flattens the categorized FAQ structure into a flat list of {q, a} pairs
// — used to feed the FAQPage JSON-LD schema. Lives here (not in FAQ.tsx)
// so server components can call it without crossing the client boundary.
export function flattenFaqItems(faq: { categories: { questions: { q: string; a: string }[] }[] }): { q: string; a: string }[] {
  return faq.categories.flatMap((c) => c.questions);
}

type Dict = {
  nav: {
    howItWorks: string;
    requirements: string;
    whyUs: string;
    about: string;
    faq: string;
    blog: string;
    contact: string;
    cta: string;
  };
  hero: {
    eyebrow: string;
    headlineLine1: string;
    headlineLine2: string;
    subhead: string;
    ctaPrimary: string;
    ctaSecondary: string;
    lookupMc: string;
    lookupDot: string;
    lookupMcPlaceholder: string;
    lookupDotPlaceholder: string;
    lookupCta: string;
    lookupHelper: string;
  };
  trust: {
    eyebrow: string;
    acquisitionsLabel: string;
    closeLabel: string;
    closeValue: string;
    yearsLabel: string;
  };
  requirements: {
    eyebrow: string;
    headline1: string;
    headline2: string;
    intro: string;
    withRelay: { title: string; items: string[] };
    withoutRelay: { title: string; items: string[] };
    transferTitle: string;
    transferItems: string[];
  };
  how: {
    eyebrow: string;
    headline1: string;
    headline2: string;
    steps: { title: string; body: string }[];
  };
  why: {
    eyebrow: string;
    headline1: string;
    headline2: string;
    points: { title: string; body: string }[];
  };
  faq: {
    eyebrow: string;
    headline1: string;
    headline2: string;
    intro: string;
    categories: { id: string; label: string; questions: { q: string; a: string }[] }[];
  };
  contact: {
    eyebrow: string;
    headline1: string;
    headline2: string;
    intro: string;
    callLabel: string;
    emailLabel: string;
    whatsappLabel: string;
    whatsappValue: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    mc: string;
    relayQ: string;
    relayYes: string;
    relayNo: string;
    mcAge: string;
    insurance: string;
    insuranceActive: string;
    insuranceInactive: string;
    state: string;
    notes: string;
    submit: string;
    submitting: string;
    privacyNote: string;
    successHeadline: string;
    successBody: string;
    nameRequired: string;
    emailRequired: string;
    phoneRequired: string;
    error: string;
  };
  footer: {
    rights: string;
    privacy: string;
    terms: string;
    description: string;
  };
  wizard: {
    brandTag: string;
    stepOf: string;
    indicativeNote: string;
    // Step 1
    step1Headline1: string;
    step1Headline2: string;
    step1Intro: string;
    mcLabel: string;
    dotLabel: string;
    yourMc: string;
    yourDot: string;
    noMcLink: string;
    lookupCta: string;
    lookingUp: string;
    // Step 2
    step2Headline: string;
    step2Intro: string;
    legalName: string;
    dba: string;
    address: string;
    authority: string;
    authorityActive: string;
    authorityInactive: string;
    insurance: string;
    insuranceActive: string;
    insuranceLapsed: string;
    insuranceNotRequired: string;
    fleetSize: string;
    crashes: string;
    safety: string;
    safetySatisfactory: string;
    safetyConditional: string;
    safetyUnsatisfactory: string;
    confirmCta: string;
    // Step 3
    step3Headline: string;
    step3Intro: string;
    name: string;
    email: string;
    phone: string;
    fromFmcsa: string;
    continue: string;
    // Step 4
    step4Headline: string;
    step4Intro: string;
    relayQuestion: string;
    relayYes: string;
    relayYesNote: string;
    relayNo: string;
    relayNoNote: string;
    tcpaConsent: string;
    privacy: string;
    terms: string;
    and: string;
    showValuation: string;
    computing: string;
    // Step 5
    yourValuation: string;
    forCompany: string;
    snapshotHeading: string;
    authorityAge: string;
    ageYearsValue: string;
    ageMonthsValue: string;
    ageUnknown: string;
    ageBasis: string;
    note: string;
    floorNote: string;
    indicativeBlock: string;
    haveQuestions: string;
    talkHeading: string;
    callNow: string;
    callNowNote: string;
    scheduleCall: string;
    scheduleNote: string;
    nextAvailable: string;
    // Common
    back: string;
    // Errors
    errorNumber: string;
    errorName: string;
    errorEmail: string;
    errorRelay: string;
    errorConsent: string;
    errorNetwork: string;
    errorGeneric: string;
  };
};

export const DICT: Record<Locale, Dict> = {
  en: {
    nav: {
      howItWorks: "How it works",
      requirements: "Requirements",
      whyUs: "Why Veritor",
      about: "About",
      faq: "FAQ",
      blog: "Insights",
      contact: "Contact",
      cta: "Get an offer",
    },
    hero: {
      eyebrow: "US Trucking Company Sales",
      headlineLine1: "Sell your trucking LLC.",
      headlineLine2: "Closed in 3–5 business days.",
      subhead:
        "Veritor Group handles the sale of US trucking companies end to end — including carriers running Amazon Relay. Written offer, in-person closing, full transfer handled. You keep 100% of the number you accept.",
      ctaPrimary: "Get a free valuation",
      ctaSecondary: "How it works",
      lookupMc: "MC",
      lookupDot: "DOT",
      lookupMcPlaceholder: "Enter your MC number",
      lookupDotPlaceholder: "Enter your DOT number",
      lookupCta: "Check your company",
      lookupHelper: "Free FMCSA lookup. No signup, no obligation.",
    },
    trust: {
      eyebrow: "Track record",
      acquisitionsLabel: "Valuations a month",
      closeLabel: "Average close",
      closeValue: "3–5 business days",
      yearsLabel: "Of the price is yours",
    },
    requirements: {
      eyebrow: "What qualifies",
      headline1: "Clear requirements.",
      headline2: "No guesswork.",
      intro:
        "A written offer comes back on companies that fit one of two profiles. If yours matches either, we want to hear from you. If it doesn't, you'll hear that straight — same day, no runaround.",
      withRelay: {
        title: "Companies already running Amazon Relay",
        items: [
          "Active Amazon Relay contract on the LLC",
          "Insurance can be lapsed — Relay access resumes once coverage is re-bound",
          "MC authority active and in good standing",
          "Safety rating Satisfactory or unrated — not Conditional",
        ],
      },
      withoutRelay: {
        title: "Companies not on Amazon Relay yet",
        items: [
          "MC authority and insurance continuously active 180+ days",
          "Insurance in force right now, no current lapse",
          "MC authority active and in good standing",
          "Safety rating Satisfactory or unrated, clean violation history",
        ],
      },
      transferTitle: "What transfers at closing",
      transferItems: [
        "The LLC and all federal/state filings",
        "Company phone number",
        "Company email account",
        "Company bank account / banking details",
        "MC authority and DOT records",
        "Active loans are not required — but if any exist they should be disclosed up front",
      ],
    },
    how: {
      eyebrow: "How it works",
      headline1: "Four steps,",
      headline2: "3 to 5 business days.",
      steps: [
        {
          title: "Check your MC",
          body: "Enter your MC or DOT number. We pull your FMCSA snapshot — no signup, no obligation. Takes 30 seconds.",
        },
        {
          title: "Get a free valuation",
          body: "We respond within hours, every day of the week. If your company qualifies, a written offer comes back to you.",
        },
        {
          title: "Sign and verify",
          body: "Standard purchase agreement, light document review, no surprises. Legal costs don't come out of your number.",
        },
        {
          title: "Meet at the bank",
          body: "Meet us at your bank and sign in person, or run it remotely if that's easier. Either way the funds land as the documents execute — through attorney escrow, never after.",
        },
      ],
    },
    why: {
      eyebrow: "Why Veritor",
      headline1: "Sold safely.",
      headline2: "Documented start to finish.",
      points: [
        {
          title: "Written agreement, never a handshake.",
          body: "Every deal runs on a signed purchase agreement. No verbal number that shrinks at the table, no last-minute price drop. If someone offers you cash on a phone call, that is the warning sign.",
        },
        {
          title: "Funds move through attorney escrow.",
          body: "Money goes through a closing attorney's escrow account, not person to person. That single detail is the clearest line between a real sale and a fraud setup.",
        },
        {
          title: "The paperwork actually changes hands.",
          body: "Secretary of State records and the EIN responsible party are updated to the new owner. The company stops being yours on paper, not just in conversation.",
        },
        {
          title: "Discretion by default.",
          body: "Your identity stays private — nothing disclosed to drivers, dispatchers, or competitors. Confidentiality is standard on every closing.",
        },
      ],
    },
    faq: {
      eyebrow: "Frequently asked",
      headline1: "Every question",
      headline2: "we get asked.",
      intro:
        "Compiled from real owner-operators on TruckersReport, Overdrive, FMCSA guidance, and our own seller calls. If your question isn't here, ask us directly — we'll answer in writing.",
      categories: [
        {
          id: "qualifying",
          label: "Does my company qualify?",
          questions: [
            {
              q: "Can I sell if my MC authority is registered to me personally (sole proprietor / SSN)?",
              a: "No. Authority registered to a sole proprietor under your SSN is tied to you personally, not to a sellable entity, so there's nothing to hand over. Authority held by an LLC or corporation is what changes hands, because the entity itself is what's sold. If you're operating as a sole prop, the honest answer is that this isn't a fit.",
            },
            {
              q: "Does my company qualify if it's only one truck?",
              a: "Yes. Fleet size isn't what decides it — single-truck companies go through all the time. What matters is authority status, insurance, Amazon Relay status if any, and violation history. A single-truck company prices lower than a multi-truck operation, but the process is identical.",
            },
            {
              q: "What if my MC authority is currently inactive?",
              a: "If the LLC has an active Amazon Relay contract, inactive authority is workable — coverage is re-bound and the authority reactivated as part of closing. Without a Relay contract, the authority generally needs to be active, because reactivation alone doesn't produce the continuous operating history freight networks look for. Authorities inactive for more than 12 months are usually beyond reactivation by FMCSA.",
            },
            {
              q: "Can I sell only the MC number and keep the LLC?",
              a: "No, and neither can anyone else legitimately. FMCSA explicitly prohibits selling, leasing, or transferring an MC or DOT number outside a legitimate sale of the underlying entity. The number stays with the entity it's registered to. What you're really selling is the LLC; the MC number transfers with it.",
            },
            {
              q: "I have multiple LLCs — can I sell some and keep others?",
              a: "Yes. Each LLC is a separate legal entity and each is handled independently. Sellers with several often sell one or two and keep the rest — nothing here is all-or-nothing.",
            },
          ],
        },
        {
          id: "valuation",
          label: "Pricing & valuation",
          questions: [
            {
              q: "How much is my MC authority worth?",
              a: "It depends on five real variables, in rough order of impact: whether the LLC has an active Amazon Relay contract (biggest single factor), MC authority age, insurance status, violation history, and any active loans. A clean company with active Relay trades in a much higher band than a fresh non-Relay authority. A written number comes back after a quick FMCSA pull — that's the only honest way to price it.",
            },
            {
              q: "What raises my LLC's value the most?",
              a: "An active Amazon Relay contract, clean CSA scores, no out-of-service orders, and continuous active insurance. If those four are in place, the LLC is in the upper end of our pricing band. Niche specializations (reefer, flatbed, hazmat) help; aged authority alone with no operating history doesn't move the number much.",
            },
            {
              q: "I've heard MCs sell for $20K–$30K — is that real?",
              a: "Be careful with that figure. Overdrive and trade press have reported that the $30K offers floating around for 'aged authority' often come from buyers planning to use the MC for double-brokering or cargo theft schemes, not for legitimate operations. Real fair-market pricing for a clean MC sits well below those headline numbers in most cases. If a buyer offers you $30K with no diligence and no written agreement, slow down and verify them.",
            },
            {
              q: "Asset sale or stock sale — what's the difference?",
              a: "An equity sale transfers the LLC itself, with its authority, EIN, history, and contracts intact. An asset sale moves only specific items — trucks, equipment — and leaves the company behind. These are equity sales, because that's the only structure that preserves what makes a trucking company worth anything. The mechanics get walked through on the call.",
            },
            {
              q: "Does niche freight (reefer, flatbed, hazmat) change the price?",
              a: "Yes — specialized authority and equipment generally trade at a premium to dry van. Hazmat and tanker endorsements add value because the underlying setup (driver qualifications, insurance class, FMCSA permits) is harder to replicate quickly.",
            },
          ],
        },
        {
          id: "process",
          label: "Process & timeline",
          questions: [
            {
              q: "How long does the whole sale take?",
              a: "Most deals close in 7–14 days from the time we receive your details. Clean LLCs with no active loans, no liens, and a current insurance policy land closer to 7. Deals with active loans, factoring lines, or recent violations land closer to 14. The bottleneck is usually the bank or the lender, not us.",
            },
            {
              q: "What are the actual steps?",
              a: "Four main stages: (1) you submit your company details and a written offer comes back; (2) a short letter of intent is signed and diligence runs; (3) the Membership Interest Purchase Agreement is signed, along with any related state filings; (4) the closing wire goes out and the LLC, phone, email, and bank account hand over. Post-close, the state-level registration updates and the drug-consortium handover are driven for you — you're not left chasing paperwork.",
            },
            {
              q: "Do I have to file anything with FMCSA myself?",
              a: "No. You'll sign one or two state-level documents depending on where the LLC is registered, and those are prepared for you. There's been no FMCSA transfer application or fee for an ownership change since 2013. Everything else is walked through on the call, step by step, before you sign anything.",
            },
          ],
        },
        {
          id: "transfers",
          label: "What transfers at closing",
          questions: [
            {
              q: "Does my DOT and MC number transfer?",
              a: "Yes. DOT and MC numbers stay with the LLC entity, and the entity is what's sold — that's the whole reason these are structured as equity sales rather than asset sales.",
            },
            {
              q: "Does my EIN transfer?",
              a: "Yes. The EIN stays with the LLC because the entity itself never dissolves. One consequence worth knowing: you can't reuse that EIN for a future business — once issued to an entity, it stays with that entity for life.",
            },
            {
              q: "What about my company phone, email, MyRelay login, ELD account?",
              a: "All of it transfers as part of closing, and it all matters — a company without its phone number is missing half its operating continuity. Exactly what hands over and when is covered on the call, so nothing catches you out on closing day.",
            },
            {
              q: "Do my trucks transfer with the LLC?",
              a: "Only if you want them to. If trucks are titled to the LLC, they transfer automatically with the LLC sale and we factor that into the offer. If you want to keep your trucks (titled to you personally or to a separate entity), we can structure the sale so only the LLC and authorities transfer, and you sell the trucks individually on your own timeline.",
            },
          ],
        },
        {
          id: "loans-insurance",
          label: "Loans, liens & insurance",
          questions: [
            {
              q: "Can I sell if I still have a loan on a truck?",
              a: "Yes, if the truck is titled to the LLC and the lien is paid off at closing. The payoff is coordinated directly with your lender: the price splits between the lender and you, and you get the remainder. If you'd rather keep the truck, you keep the truck and the loan, and it's excluded from the sale.",
            },
            {
              q: "Do I have to sort out my factoring line first?",
              a: "No. Factoring sits on a UCC lien against the LLC, so it gets addressed at closing — usually paid off, occasionally carried over. Either way it's structured before you sign, not left as a surprise afterwards.",
            },
            {
              q: "What happens to my insurance policy at closing?",
              a: "Active policies are re-bound under the new ownership or replaced. Lapsed coverage is bound from scratch, timed to land within 24 hours of closing. Either way you're not on the hook for coverage after the sale.",
            },
          ],
        },
        {
          id: "amazon-relay",
          label: "Amazon Relay specifics",
          questions: [
            {
              q: "Can the Amazon Relay contract actually transfer?",
              a: "The contract is held by the carrier — the LLC — not by you personally, which is why selling the company is the only path that keeps it intact. Selling an MC number on its own is prohibited by FMCSA and destroys the value anyway. Exactly how it plays out depends on your account, your scorecard, and how the entity is set up, and that's a conversation worth having on a call rather than a paragraph on a web page. What we can tell you plainly: an active Relay contract is the single biggest thing that moves your number.",
            },
            {
              q: "Does my Amazon scorecard / performance history carry over?",
              a: "Performance history is bound to the carrier ID, and the carrier ID belongs to the LLC — it isn't re-issued when the company changes owners. Amazon recalculates on a 12-month rolling basis, so a strong record carries real weight and is one of the things that pushes a valuation up. We'll walk through what your specific scorecard is worth on the call.",
            },
            {
              q: "Is Amazon Relay the same as Amazon DSP? I'm confused.",
              a: "They're completely different and not interchangeable. Amazon Relay is for independent trucking carriers (Class 8) hauling middle-mile and long-haul freight between Amazon facilities. DSP (Delivery Service Partner) is the last-mile branded-van program with employee drivers. Relay carriers are what this is about — a DSP account is explicitly non-transferable under Amazon's rules and can't be sold this way at all.",
            },
            {
              q: "How much extra is my LLC worth because it has Amazon Relay?",
              a: "A lot — the Relay contract is the primary driver of price for a Relay carrier. That said, be wary of anyone who claims Relay alone adds $20K–$30K on top of an otherwise modest company. Real Relay value depends on contract status, scorecard, lane assignments, and load volume — not on the existence of the account itself. Relay gets priced off the actual operating data we can verify, not off the fact that the account exists.",
            },
          ],
        },
        {
          id: "drivers-operations",
          label: "Drivers, employees & operations",
          questions: [
            {
              q: "What happens to my drivers when the LLC sells?",
              a: "Drivers are at-will employees of the LLC, so legally their employment continues under the new ownership unless one side terminates. In practice, drivers worth keeping are usually offered continued employment on the same terms or better, and they can choose to stay or leave. Drug-consortium files transfer with the carrier, so there's no break in their compliance status.",
            },
            {
              q: "Do IFTA, IRP, 2290 and the drug consortium all carry over?",
              a: "Yes — when the LLC stays intact, the registrations attached to it stay intact too. None of it is something you need to unwind or re-file yourself. The specifics for your setup get covered on the call.",
            },
          ],
        },
        {
          id: "risk-scams",
          label: "Risk & avoiding scams",
          questions: [
            {
              q: "How do I know this is legitimate and not a fraud scheme?",
              a: "Three checks — and use them on anyone you deal with, not just us. (1) There is a written purchase agreement, never a verbal handshake. (2) Funds move through a closing attorney's escrow account, not person to person, and never in cash. (3) The money lands as the documents execute — escrow releases on signature, rather than you handing over the company and waiting. Trade press (Overdrive, CCJ) has documented rings acquiring authorities for cargo-theft and double-brokering schemes. Those operations refuse legal counsel, refuse escrow, push hard for speed, and offer cash. Every one of those three checks is something they won't agree to. Closing remotely, by the way, is not itself a warning sign — a remote closing run through escrow is perfectly legitimate and plenty of sellers prefer it. It's the order that matters, not the location.",
            },
            {
              q: "Will FMCSA inactivate my MC if it sees me 'selling' it?",
              a: "Only if the transaction is structured as a sale of the number itself, which is prohibited. FMCSA explicitly inactivates authorities that are sold, leased, or transferred outside legitimate corporate transactions — and issued a bulletin saying exactly that in March 2026. The legitimate path FMCSA recognizes is an equity sale of the LLC itself, which is how these deals are structured. We've never had an authority deactivated post-close.",
            },
            {
              q: "How do I protect myself from what happens after closing?",
              a: "The purchase agreement carries a release of seller liability for post-close events, and the closing has a clear effective date that draws the line. Your CDL and your personal driving record are separate from the company either way. The full picture — what's covered, what isn't, and what to confirm — is something we go through with you directly before you sign, not something to settle off a web page.",
            },
            {
              q: "How should payment be structured so I'm safe?",
              a: "Wire transfer through escrow at closing — never partial payments, never seller financing for a first-time buyer, never anything in cash. The standard is funds into the closing attorney's IOLTA escrow account, documents signed, escrow releases the wire to your account same day. If anyone asks you to hand over LLC documents before the funds move, that's a flag.",
            },
          ],
        },
        {
          id: "after-sale",
          label: "Taxes, confidentiality & after the sale",
          questions: [
            {
              q: "How is the sale taxed for me?",
              a: "Held more than 12 months, an equity sale generally qualifies for long-term capital gains treatment on the gain over your basis — but part can be taxed as ordinary income depending on how the price is allocated. Talk to a CPA who knows trucking sales before you close. We're not going to give you tax advice on a web page, and anyone who does should worry you.",
            },
            {
              q: "Will my drivers, brokers, or competitors find out before closing?",
              a: "Not from us. We sign a mutual NDA before diligence on request, and our standard practice is to keep the transaction confidential through closing. The only parties who know during diligence are you, us, the respective lawyers, and any lender involved in a payoff. Nothing is listed publicly, nothing is advertised, and your company is never shopped around.",
            },
            {
              q: "Can I open a new MC authority after I sell?",
              a: "Yes, but FMCSA flags 'chameleon carriers' — new entities that share owners, addresses, or other identifiers with recently sold or revoked entities. If you want to come back into the industry under new authority, you'll go through the standard New Entrant audit (18 months) and you should set the new entity up at a different address from the old LLC to avoid chameleon flags. Common ownership alone isn't disqualifying — it just invites scrutiny.",
            },
            {
              q: "What happens if my LLC doesn't qualify for an offer?",
              a: "We tell you within hours and explain exactly why. No fee, no obligation, no hard sell. If your LLC is close but not quite (for example, MC authority + insurance has only been active for 4 months when we want a clean 6+ month track record), we'll often suggest specific steps to get to qualifying status — or we'll tell you straight that the path doesn't make sense and you'd be better off with a different exit option.",
            },
          ],
        },
      ],
    },
    contact: {
      eyebrow: "Get an offer",
      headline1: "Tell us about",
      headline2: "your LLC.",
      intro:
        "Free valuation, no obligation. We respond within a few hours, every day of the week.",
      callLabel: "Call",
      emailLabel: "Email",
      whatsappLabel: "WhatsApp",
      whatsappValue: "Send a message",
      name: "Full name",
      email: "Email",
      phone: "Phone",
      company: "Company / LLC name",
      mc: "MC number",
      relayQ: "Does the LLC have an active Amazon Relay contract?",
      relayYes: "Yes — has Amazon Relay",
      relayNo: "No — no Amazon Relay",
      mcAge: "How old is your MC authority? (days)",
      insurance: "Insurance status",
      insuranceActive: "Active",
      insuranceInactive: "Inactive",
      state: "State of registration",
      notes: "Anything else we should know",
      submit: "Send for valuation",
      submitting: "Sending…",
      privacyNote:
        "We only use your details to evaluate your LLC and respond to this enquiry.",
      successHeadline: "Got it. We're on it.",
      successBody:
        "Thanks {name}. We'll be in touch at {email} within a few hours.",
      nameRequired: "Please enter your name.",
      emailRequired: "Please enter a valid email.",
      phoneRequired: "Please enter a phone number we can reach you at.",
      error: "Something went wrong. Please try again or email us directly.",
    },
    footer: {
      rights: "All rights reserved.",
      privacy: "Privacy",
      terms: "Terms",
      description:
        "Veritor Group handles US trucking company sales — Amazon Relay specialists.",
    },
    wizard: {
      brandTag: "Free Valuation",
      stepOf: "Step {n} of {total}",
      indicativeNote:
        "Indicative valuation based on FMCSA public data. Final offer confirmed after a short call and document review. No obligation, no listing fees, no commissions.",
      step1Headline1: "Get a written valuation in",
      step1Headline2: "90 seconds.",
      step1Intro:
        "Enter your MC or DOT number. We’ll pull your FMCSA record, confirm the company, and return a value range — no calls required to find out.",
      mcLabel: "MC Number",
      dotLabel: "DOT Number",
      yourMc: "Your MC number",
      yourDot: "Your DOT number",
      noMcLink: "Don’t have an MC yet?",
      lookupCta: "Look up FMCSA",
      lookingUp: "Looking up…",
      step2Headline: "Confirm your company.",
      step2Intro:
        "Pulled from FMCSA. If anything below looks wrong, go back and check the number.",
      legalName: "Legal name",
      dba: "DBA",
      address: "Address",
      authority: "Authority",
      authorityActive: "Active for-hire",
      authorityInactive: "Inactive / not for-hire",
      insurance: "Insurance",
      insuranceActive: "Active on file",
      insuranceLapsed: "Lapsed / required",
      insuranceNotRequired: "Not required",
      fleetSize: "Power units · drivers",
      crashes: "Crashes (24 mo)",
      safety: "Safety rating",
      safetySatisfactory: "Satisfactory",
      safetyConditional: "Conditional",
      safetyUnsatisfactory: "Unsatisfactory",
      confirmCta: "That’s us — continue",
      step3Headline: "Where should we send the written offer?",
      step3Intro:
        "We’ll email the offer + a calendar link to schedule a quick call. We pre-filled your phone from FMCSA — feel free to update it.",
      name: "Your name",
      email: "Email",
      phone: "Phone",
      fromFmcsa: "From FMCSA",
      continue: "Continue",
      step4Headline: "Two final details.",
      step4Intro: "These shape the valuation. Honest answers — no wrong choice.",
      relayQuestion: "Active Amazon Relay contract? *",
      relayYes: "Yes, active Relay",
      relayYesNote: "Highest-priority bucket.",
      relayNo: "No Relay",
      relayNoNote: "Still welcome.",
      tcpaConsent:
        "I agree to receive emails, calls, texts, and WhatsApp messages from {site} about my valuation, including via automated technology. Consent is not a condition of any purchase. Message and data rates may apply. Reply STOP to opt out of texts. See",
      privacy: "Privacy",
      terms: "Terms",
      and: "and",
      showValuation: "Show my valuation",
      computing: "Computing…",
      yourValuation: "Your valuation",
      forCompany: "For",
      snapshotHeading: "What we used",
      authorityAge: "Authority age",
      ageYearsValue: "≈ {n} years",
      ageMonthsValue: "≈ {n} months",
      ageUnknown: "Not on file",
      ageBasis: "Authority age is based on the latest MCS-150 filing ({date}) — the best public proxy in FMCSA. Final age is confirmed on the call.",
      note: "Note:",
      floorNote:
        "this caps the indicative valuation at our floor. There may still be a path here, but final terms have to be confirmed on a call.",
      indicativeBlock:
        "This is an indicative range based on your FMCSA snapshot. Final offer is confirmed on a 15-minute call after we review your insurance, MC age, and contract status — then in writing within 24 hours.",
      haveQuestions: "Have questions? Contact us →",
      talkHeading: "What's next",
      callNow: "Call us now",
      callNowNote: "Fastest — talk to us right away",
      scheduleCall: "Schedule a call",
      scheduleNote: "Pick a time that suits you — 15 minutes",
      nextAvailable: "Next available:",
      back: "← Back",
      errorNumber: "Please enter your MC or DOT number.",
      errorName: "Please enter your name.",
      errorEmail: "Please enter a valid email so we can send your written offer.",
      errorRelay: "Please pick yes or no for the Amazon Relay question.",
      errorConsent: "Please agree to the contact terms to continue.",
      errorNetwork: "Network error. Please try again.",
      errorGeneric: "Something went wrong. Please try again.",
    },
  },

  es: {
    nav: {
      howItWorks: "Cómo funciona",
      requirements: "Requisitos",
      whyUs: "Por qué Veritor",
      about: "Nosotros",
      faq: "Preguntas",
      blog: "Blog",
      contact: "Contacto",
      cta: "Recibir oferta",
    },
    hero: {
      eyebrow: "Venta de empresas de transporte en EE. UU.",
      headlineLine1: "Venda su LLC de transporte.",
      headlineLine2: "Cierre en 3–5 días hábiles.",
      subhead:
        "Veritor Group gestiona la venta de empresas de transporte en EE. UU. de principio a fin — incluyendo transportistas con Amazon Relay activo. Oferta por escrito, cierre en persona, transferencia completa gestionada. Usted se queda con el 100% de la cifra que acepte.",
      ctaPrimary: "Valuación gratis",
      ctaSecondary: "Cómo funciona",
      lookupMc: "MC",
      lookupDot: "DOT",
      lookupMcPlaceholder: "Ingrese su número MC",
      lookupDotPlaceholder: "Ingrese su número DOT",
      lookupCta: "Verificar su empresa",
      lookupHelper: "Consulta FMCSA gratuita. Sin registro, sin compromiso.",
    },
    trust: {
      eyebrow: "Trayectoria",
      acquisitionsLabel: "Valuaciones al mes",
      closeLabel: "Cierre promedio",
      closeValue: "3–5 días hábiles",
      yearsLabel: "Del precio es suyo",
    },
    requirements: {
      eyebrow: "Qué califica",
      headline1: "Requisitos claros.",
      headline2: "Sin conjeturas.",
      intro:
        "Recibe una oferta por escrito la empresa que encaje en uno de dos perfiles. Si el suyo encaja, queremos saber de usted. Si no, se lo decimos sin rodeos — el mismo día, sin darle vueltas.",
      withRelay: {
        title: "Empresas que ya operan con Amazon Relay",
        items: [
          "Contrato activo de Amazon Relay en la LLC",
          "El seguro puede estar vencido — el acceso a Relay se reanuda al re-vincular la cobertura",
          "Autoridad MC activa y en buen estado",
          "Calificación de seguridad Satisfactoria o sin calificar — no Condicional",
        ],
      },
      withoutRelay: {
        title: "Empresas que aún no están en Amazon Relay",
        items: [
          "Autoridad MC y seguro activos de forma continua por 180+ días",
          "Seguro vigente en este momento, sin vencimiento actual",
          "Autoridad MC activa y en buen estado",
          "Calificación de seguridad Satisfactoria o sin calificar, historial de violaciones limpio",
        ],
      },
      transferTitle: "Lo que se transfiere al cierre",
      transferItems: [
        "La LLC y todos los registros federales/estatales",
        "Número de teléfono de la empresa",
        "Cuenta de correo electrónico de la empresa",
        "Cuenta bancaria / datos bancarios de la empresa",
        "Autoridad MC y registros DOT",
        "No se requiere que la LLC esté libre de préstamos activos — pero si existen, deben divulgarse desde el principio",
      ],
    },
    how: {
      eyebrow: "Cómo funciona",
      headline1: "Cuatro pasos,",
      headline2: "3 a 5 días hábiles.",
      steps: [
        {
          title: "Verifique su MC",
          body: "Ingrese su número MC o DOT. Consultamos su registro FMCSA — sin registro, sin compromiso. 30 segundos.",
        },
        {
          title: "Reciba una valuación gratis",
          body: "Respondemos en horas, todos los días de la semana. Si su empresa encaja, recibe una oferta por escrito.",
        },
        {
          title: "Firme y verifique",
          body: "Contrato de compra estándar, revisión documental ligera, cero sorpresas. Los costos legales no salen de su cifra.",
        },
        {
          title: "Cierre presencial en su banco",
          body: "Nos reunimos en su banco y firmamos en persona, o lo hacemos a distancia si le resulta más cómodo. De cualquier forma, los fondos llegan en el momento en que se firman los documentos — a través de escrow de un abogado, nunca después.",
        },
      ],
    },
    why: {
      eyebrow: "Por qué Veritor",
      headline1: "Vendida con seguridad.",
      headline2: "Documentado de principio a fin.",
      points: [
        {
          title: "Contrato por escrito, nunca un apretón de manos.",
          body: "Cada operación se cierra con un contrato de compraventa firmado. Nada de una cifra verbal que se reduce en la mesa, nada de bajadas de precio de último minuto. Si alguien le ofrece efectivo en una llamada, esa es la señal de alerta.",
        },
        {
          title: "Los fondos se mueven por escrow de un abogado.",
          body: "El dinero pasa por la cuenta de escrow de un abogado de cierre, no de persona a persona. Ese solo detalle es la línea más clara entre una venta real y un montaje fraudulento.",
        },
        {
          title: "El papeleo realmente cambia de manos.",
          body: "Los registros del Secretary of State y el responsible party del EIN se actualizan al nuevo propietario. La empresa deja de ser suya en papel, no solo de palabra.",
        },
        {
          title: "Discreción por defecto.",
          body: "Su identidad permanece privada — nada se revela a choferes, dispatchers o competidores. La confidencialidad es estándar en cada cierre.",
        },
      ],
    },
    faq: {
      eyebrow: "Preguntas frecuentes",
      headline1: "Cada pregunta",
      headline2: "que nos hacen.",
      intro:
        "Recopiladas de owner-operators reales en TruckersReport, Overdrive, guía oficial de FMCSA, y nuestras propias llamadas con vendedores. Si su pregunta no está aquí, escríbanos directamente — le respondemos por escrito.",
      categories: [
        {
          id: "qualifying",
          label: "¿Mi LLC califica?",
          questions: [
            {
              q: "¿Puedo vender si mi autoridad MC está registrada a mi nombre personal (sole proprietor / SSN)?",
              a: "No. La autoridad registrada a un sole proprietor bajo su SSN está atada a usted personalmente, no a una entidad que se pueda vender, así que no hay nada que transferir. La autoridad de una LLC o corporación es lo que cambia de manos, porque lo que se vende es la entidad misma. Si opera como sole prop, la respuesta honesta es que esto no encaja.",
            },
            {
              q: "¿Mi LLC califica si solo tengo un camión?",
              a: "Sí. El tamaño de la flota no es lo que decide — empresas de un solo camión califican todo el tiempo. Lo que importa es el estado de la autoridad, el seguro, el estado de Amazon Relay (si aplica) y el historial de violaciones. Una empresa de un camión se valúa más bajo que una operación con varios camiones, pero el proceso es idéntico.",
            },
            {
              q: "¿Qué pasa si mi autoridad MC está actualmente inactiva?",
              a: "Si la LLC tiene un contrato activo de Amazon Relay, la autoridad inactiva es manejable — la cobertura se re-vincula y la autoridad se reactiva como parte del cierre. Sin contrato de Relay, la autoridad generalmente necesita estar activa, porque la reactivación por sí sola no genera el historial operativo continuo que buscan las redes de carga. Las autoridades inactivas por más de 12 meses normalmente ya no se pueden reactivar con FMCSA.",
            },
            {
              q: "¿Puedo vender solo el número MC y quedarme con la LLC?",
              a: "No, y nadie puede legítimamente. FMCSA prohíbe expresamente vender, arrendar o transferir un número MC o DOT fuera de una venta legítima de la entidad subyacente. El número se queda con la entidad a la que está registrado. Lo que en realidad está vendiendo es la LLC; el número MC se transfiere con ella.",
            },
            {
              q: "Tengo varias LLCs — ¿puedo vender algunas y quedarme con otras?",
              a: "Sí. Cada LLC es una entidad legal separada y cada una se maneja de forma independiente. Vendedores con varias LLCs muchas veces venden una o dos y mantienen el resto — aquí nada es todo o nada.",
            },
          ],
        },
        {
          id: "valuation",
          label: "Precio y valuación",
          questions: [
            {
              q: "¿Cuánto vale mi autoridad MC?",
              a: "Depende de cinco variables reales, en orden aproximado de impacto: si la LLC tiene un contrato activo de Amazon Relay (el factor más grande), la antigüedad de la autoridad MC, el estado del seguro, el historial de violaciones y cualquier préstamo activo. Una empresa limpia con Relay activo se ubica en una banda de precio mucho más alta que una autoridad nueva sin Relay. Un número por escrito llega después de una consulta rápida a FMCSA — esa es la única forma honesta de ponerle precio.",
            },
            {
              q: "¿Qué eleva más el valor de mi LLC?",
              a: "Un contrato activo de Amazon Relay, scores CSA limpios, sin órdenes de fuera de servicio, y seguro activo continuo. Si esos cuatro están en orden, la LLC está en la parte alta de nuestra banda de precios. Especializaciones de nicho (reefer, flatbed, hazmat) ayudan; autoridad antigua sola sin historial operativo no mueve mucho el número.",
            },
            {
              q: "He oído que los MC se venden por $20K–$30K — ¿es real?",
              a: "Cuidado con esa cifra. Overdrive y la prensa del sector han reportado que las ofertas de $30K que circulan por 'autoridad antigua' muchas veces vienen de compradores que planean usar el MC para esquemas de double-brokering o robo de carga, no para operaciones legítimas. El precio real de mercado para un MC limpio normalmente está bastante por debajo de esos números. Si un comprador le ofrece $30K sin diligencia y sin acuerdo por escrito, deténgase y verifíquelo.",
            },
            {
              q: "Asset sale o stock sale — ¿cuál es la diferencia?",
              a: "Una venta de capital (stock sale) transfiere la LLC misma, con su autoridad, EIN, historial y contratos intactos. Una venta de activos (asset sale) mueve solo artículos específicos —camiones, equipo— y deja la empresa atrás. Estas son ventas de capital, porque es la única estructura que conserva lo que le da valor a una empresa de transporte. La mecánica se explica en la llamada.",
            },
            {
              q: "¿La carga de nicho (reefer, flatbed, hazmat) cambia el precio?",
              a: "Sí — la autoridad y el equipo especializados generalmente se venden con un premio sobre dry van. Los endorsements de hazmat y tanker agregan valor porque la configuración subyacente (calificaciones del chofer, clase de seguro, permisos FMCSA) es más difícil de replicar rápido.",
            },
          ],
        },
        {
          id: "process",
          label: "Proceso y plazos",
          questions: [
            {
              q: "¿Cuánto tarda toda la venta?",
              a: "La mayoría de las operaciones cierran en 7–14 días desde que recibimos sus datos. LLCs limpias sin préstamos activos, sin gravámenes y con póliza de seguro vigente cierran cerca de 7. Operaciones con préstamos activos, factoring o violaciones recientes cierran cerca de 14. El cuello de botella suele ser el banco o el prestamista, no nosotros.",
            },
            {
              q: "¿Cuáles son los pasos exactos?",
              a: "Cuatro etapas principales: (1) usted envía los datos de su empresa y recibe una oferta por escrito; (2) se firma una carta de intención breve y se completa la revisión de diligencia; (3) se firma el Membership Interest Purchase Agreement, junto con los formularios estatales relacionados; (4) sale el wire de cierre y se traspasan la LLC, el teléfono, el email y la cuenta bancaria. Después del cierre, la actualización del registro estatal y el traspaso del consorcio de drogas se coordinan por usted — no se queda persiguiendo papeleo.",
            },
            {
              q: "¿Tengo que presentar algo con FMCSA personalmente?",
              a: "No. Va a firmar uno o dos documentos a nivel estatal según dónde esté registrada la LLC, y esos se preparan para usted. Desde 2013 no existe solicitud de transferencia ni tarifa de FMCSA por un cambio de propiedad. Todo lo demás se explica en la llamada, paso a paso, antes de que firme nada.",
            },
          ],
        },
        {
          id: "transfers",
          label: "Qué se transfiere al cierre",
          questions: [
            {
              q: "¿Mi número DOT y MC se transfieren?",
              a: "Sí. Los números DOT y MC se quedan con la entidad LLC, y la entidad es lo que se vende — por eso estas operaciones se estructuran como ventas de capital y no como ventas de activos.",
            },
            {
              q: "¿Mi EIN se transfiere?",
              a: "Sí. El EIN se queda con la LLC porque la entidad nunca se disuelve. Algo que vale la pena saber: no puede reutilizar ese EIN para un negocio futuro — una vez que se emite a una entidad, se queda con ella de por vida.",
            },
            {
              q: "¿Qué pasa con el teléfono de la empresa, email, login de MyRelay, cuenta de ELD?",
              a: "Todo se transfiere como parte del cierre, y todo importa — una empresa sin su número de teléfono pierde la mitad de su continuidad operativa. Exactamente qué se traspasa y cuándo se explica en la llamada, así que nada lo toma por sorpresa el día del cierre.",
            },
            {
              q: "¿Mis camiones se transfieren con la LLC?",
              a: "Solo si usted quiere. Si los camiones están titulados a la LLC, se transfieren automáticamente con la venta y eso se factoriza en la oferta. Si prefiere quedarse con sus camiones (titulados a su nombre personal o a una entidad separada), la venta puede estructurarse de modo que solo la LLC y las autoridades se transfieran, y usted vende los camiones por separado, en su propio tiempo.",
            },
          ],
        },
        {
          id: "loans-insurance",
          label: "Préstamos, gravámenes y seguro",
          questions: [
            {
              q: "¿Puedo vender si todavía tengo préstamo en un camión?",
              a: "Sí, si el camión está titulado a la LLC y el gravamen se paga al cierre. El pago se coordina directamente con su prestamista — el precio se divide entre el prestamista (para saldar el gravamen) y usted (por el resto). Si prefiere quedarse con el camión, conserva el camión y el préstamo, y ese camión queda excluido de la venta.",
            },
            {
              q: "¿Tengo que resolver mi línea de factoring primero?",
              a: "No. El factoring está sobre un UCC lien contra la LLC, así que se resuelve en el cierre — normalmente se salda, a veces se mantiene. De cualquier forma queda estructurado antes de firmar, no como sorpresa después.",
            },
            {
              q: "¿Qué pasa con mi póliza de seguro al cierre?",
              a: "Las pólizas activas se re-vinculan bajo la nueva propiedad o se reemplazan. La cobertura vencida se contrata desde cero, programada para quedar activa dentro de las 24 horas del cierre. En cualquier caso, usted no queda responsable de la cobertura después de la venta.",
            },
          ],
        },
        {
          id: "amazon-relay",
          label: "Amazon Relay específicamente",
          questions: [
            {
              q: "¿El contrato de Amazon Relay realmente se puede transferir?",
              a: "El contrato lo tiene el carrier —la LLC— no usted personalmente, por eso vender la empresa es el único camino que lo mantiene intacto. Vender solo el número MC está prohibido por FMCSA y de todas formas destruye el valor. Cómo se resuelve exactamente depende de su cuenta, su scorecard y cómo está armada la entidad — eso se conversa en una llamada, no en un párrafo de una página web. Lo que sí podemos decirle con claridad: un contrato de Relay activo es lo que más mueve su número.",
            },
            {
              q: "¿Mi scorecard / historial de desempeño en Amazon se mantiene?",
              a: "Sí. El historial de desempeño está vinculado al ID del carrier, y ese ID se queda con la LLC — no se reemite cuando cambia el propietario. Amazon recalcula en una base móvil de 12 meses, así que un buen historial pesa de verdad y es algo que ayuda a subir la valuación. En la llamada revisamos cuánto vale su scorecard específico.",
            },
            {
              q: "¿Amazon Relay es lo mismo que Amazon DSP? Estoy confundido.",
              a: "Son completamente distintos y no son intercambiables. Amazon Relay es para carriers de camiones independientes (Class 8) que mueven carga middle-mile y long-haul entre instalaciones de Amazon. DSP (Delivery Service Partner) es el programa de última milla con vans de marca y choferes empleados. Aquí se trata de carriers de Relay — una cuenta DSP es explícitamente intransferible bajo las reglas de Amazon y no se puede vender de esta forma.",
            },
            {
              q: "¿Cuánto extra vale mi LLC porque tiene Amazon Relay?",
              a: "Mucho — el contrato de Relay es el principal factor de precio para un carrier con Relay. Dicho esto, cuidado con cualquiera que diga que el Relay por sí solo agrega $20K–$30K sobre una empresa modesta. El valor real del Relay depende del estado del contrato, el scorecard, las asignaciones de lanes y el volumen de carga — no de que la cuenta simplemente exista. El Relay se valúa con base en datos operativos reales y verificables, no en el hecho de que la cuenta exista.",
            },
          ],
        },
        {
          id: "drivers-operations",
          label: "Choferes, empleados y operación",
          questions: [
            {
              q: "¿Qué pasa con mis choferes cuando la LLC se vende?",
              a: "Los choferes son empleados at-will de la LLC, así que legalmente su empleo continúa bajo la nueva propiedad, salvo que una de las partes lo termine. En la práctica, a los choferes que vale la pena retener normalmente se les ofrece continuar en los mismos términos o mejores, y pueden elegir quedarse o irse. Los archivos del consorcio de drogas se transfieren con el carrier, así que no hay quiebre en su estado de cumplimiento.",
            },
            {
              q: "¿IFTA, IRP, 2290 y el consorcio de drogas se transfieren todos?",
              a: "Sí — cuando la LLC se mantiene intacta, los registros asociados también se mantienen intactos. No hay nada de esto que usted tenga que desmontar o volver a tramitar. Los detalles de su caso se revisan en la llamada.",
            },
          ],
        },
        {
          id: "risk-scams",
          label: "Riesgo y evitar fraudes",
          questions: [
            {
              q: "¿Cómo sé que esto es legítimo y no un esquema de fraude?",
              a: "Tres verificaciones — y aplíquelas con cualquiera con quien trate, no solo con nosotros. (1) Hay un contrato de compra por escrito, nunca un acuerdo de palabra. (2) Los fondos se mueven por la cuenta de escrow de un abogado de cierre, no de persona a persona, y nunca en efectivo. (3) El dinero llega en el momento en que se firman los documentos — el escrow se libera con la firma, en lugar de que usted entregue la empresa y se quede esperando. La prensa del sector (Overdrive, CCJ) ha documentado redes que adquieren autoridades para esquemas de robo de carga y double-brokering. Esas operaciones rechazan asesoría legal, rechazan escrow, presionan por velocidad y ofrecen efectivo. Ninguna de esas tres verificaciones es algo que ellos acepten. Cerrar a distancia, por cierto, no es en sí mismo una señal de alerta — un cierre remoto llevado por escrow es perfectamente legítimo, y muchos vendedores lo prefieren. Lo que importa es el orden, no el lugar.",
            },
            {
              q: "¿FMCSA va a inactivar mi MC si ve que lo estoy 'vendiendo'?",
              a: "Solo si la transacción se estructura como venta del número en sí, lo cual está prohibido. FMCSA inactiva explícitamente autoridades que se venden, arriendan o transfieren fuera de transacciones corporativas legítimas — y publicó un boletín diciendo exactamente eso en marzo de 2026. El camino legítimo que reconoce FMCSA es una venta de capital de la LLC misma, que es como se estructuran estas operaciones. Nunca se ha desactivado una autoridad después del cierre.",
            },
            {
              q: "¿Cómo me protejo de lo que pase después del cierre?",
              a: "El contrato de compra incluye una liberación de responsabilidad del vendedor por eventos posteriores al cierre, y el cierre tiene una fecha de vigencia clara que marca la línea divisoria. Su CDL y su historial de manejo personal quedan separados de la empresa en cualquier caso. El panorama completo — qué queda cubierto, qué no, y qué conviene confirmar — lo revisamos con usted directamente antes de firmar; no es algo para resolver desde una página web.",
            },
            {
              q: "¿Cómo debería estructurarse el pago para que esté seguro?",
              a: "Transferencia bancaria por escrow al cierre — nunca pagos parciales, nunca financiamiento del vendedor para un comprador primerizo, nunca nada en efectivo. Lo estándar es que los fondos entren a la cuenta IOLTA de escrow del abogado de cierre, se firmen los documentos, y escrow libere la transferencia a su cuenta el mismo día. Si alguien le pide entregar los documentos de la LLC antes de que se muevan los fondos, esa es una señal de alerta.",
            },
          ],
        },
        {
          id: "after-sale",
          label: "Impuestos, confidencialidad y después",
          questions: [
            {
              q: "¿Cómo se grava la venta para mí?",
              a: "Una venta de capital con más de 12 meses de tenencia generalmente califica para tratamiento de long-term capital gains sobre la ganancia por encima de su base. Una parte puede gravarse como ingreso ordinario según cómo se asigne el precio. Hable con un CPA que conozca ventas de empresas de transporte antes de cerrar. No le vamos a dar asesoría fiscal desde una página web, y cualquiera que lo haga debería preocuparle.",
            },
            {
              q: "¿Mis choferes, brokers o competidores se van a enterar antes del cierre?",
              a: "No por nosotros. Firmamos un NDA mutuo antes de la diligencia si se solicita, y nuestra práctica estándar es mantener la transacción confidencial hasta el cierre. Durante la diligencia, los únicos que saben son usted, nosotros, los respectivos abogados, y cualquier prestamista involucrado en un payoff. Nada se publica, nada se anuncia, y su empresa nunca se ofrece por ahí.",
            },
            {
              q: "¿Puedo abrir una nueva autoridad MC después de vender?",
              a: "Sí, pero FMCSA marca 'chameleon carriers' — entidades nuevas que comparten propietarios, direcciones u otros identificadores con entidades recién vendidas o revocadas. Si quiere volver a entrar al sector con autoridad nueva, va a pasar por la auditoría estándar de New Entrant (18 meses) y debería montar la nueva entidad en una dirección distinta a la LLC vieja para evitar marcas de chameleon. Propiedad común sola no descalifica — solo invita escrutinio.",
            },
            {
              q: "¿Qué pasa si mi LLC no califica para una oferta?",
              a: "Le decimos en horas y explicamos exactamente por qué. Sin tarifa, sin obligación, sin presión de venta. Si su LLC está cerca pero no califica del todo (por ejemplo, su MC y seguro llevan solo 4 meses activos cuando buscamos un historial limpio de 6+ meses), muchas veces sugerimos pasos específicos para llegar al estado calificado — o le decimos directamente que el camino no tiene sentido y que estaría mejor con una opción de salida diferente.",
            },
          ],
        },
      ],
    },
    contact: {
      eyebrow: "Recibir oferta",
      headline1: "Cuéntenos sobre",
      headline2: "su LLC.",
      intro:
        "Valuación gratis, sin compromiso. Respondemos en pocas horas, todos los días de la semana.",
      callLabel: "Llamar",
      emailLabel: "Email",
      whatsappLabel: "WhatsApp",
      whatsappValue: "Envíe un mensaje",
      name: "Nombre completo",
      email: "Email",
      phone: "Teléfono",
      company: "Nombre de la empresa / LLC",
      mc: "Número MC",
      relayQ: "¿La LLC tiene un contrato activo de Amazon Relay?",
      relayYes: "Sí — tiene Amazon Relay",
      relayNo: "No — sin Amazon Relay",
      mcAge: "¿Qué edad tiene su autoridad MC? (días)",
      insurance: "Estado del seguro",
      insuranceActive: "Activo",
      insuranceInactive: "Inactivo",
      state: "Estado de registro",
      notes: "Algo más que debamos saber",
      submit: "Enviar para valuación",
      submitting: "Enviando…",
      privacyNote:
        "Solo usamos sus datos para evaluar su LLC y responder a esta consulta.",
      successHeadline: "Recibido. Trabajamos en ello.",
      successBody:
        "Gracias {name}. Le contactaremos en {email} en pocas horas.",
      nameRequired: "Por favor ingrese su nombre.",
      emailRequired: "Por favor ingrese un email válido.",
      phoneRequired: "Por favor ingrese un teléfono donde podamos contactarle.",
      error: "Algo salió mal. Inténtelo de nuevo o escríbanos directamente.",
    },
    footer: {
      rights: "Todos los derechos reservados.",
      privacy: "Privacidad",
      terms: "Términos",
      description:
        "Veritor Group gestiona la venta de empresas de transporte en EE. UU. — especialistas en Amazon Relay.",
    },
    wizard: {
      brandTag: "Valuación gratis",
      stepOf: "Paso {n} de {total}",
      indicativeNote:
        "Valuación indicativa basada en datos públicos de FMCSA. Oferta final confirmada tras una llamada breve y revisión de documentos. Sin compromiso, sin honorarios, sin comisiones.",
      step1Headline1: "Obtenga una valuación escrita en",
      step1Headline2: "90 segundos.",
      step1Intro:
        "Ingrese su número MC o DOT. Consultaremos su registro FMCSA, confirmaremos la empresa y devolveremos un rango de valor — sin necesidad de llamada.",
      mcLabel: "Número MC",
      dotLabel: "Número DOT",
      yourMc: "Su número MC",
      yourDot: "Su número DOT",
      noMcLink: "¿Aún no tiene MC?",
      lookupCta: "Consultar FMCSA",
      lookingUp: "Consultando…",
      step2Headline: "Confirme su empresa.",
      step2Intro:
        "Datos obtenidos de FMCSA. Si algo se ve incorrecto, vuelva y revise el número.",
      legalName: "Nombre legal",
      dba: "DBA",
      address: "Dirección",
      authority: "Autoridad",
      authorityActive: "Activa para alquiler",
      authorityInactive: "Inactiva / no para alquiler",
      insurance: "Seguro",
      insuranceActive: "Activo en archivo",
      insuranceLapsed: "Vencido / requerido",
      insuranceNotRequired: "No requerido",
      fleetSize: "Unidades · conductores",
      crashes: "Choques (24 meses)",
      safety: "Calificación de seguridad",
      safetySatisfactory: "Satisfactoria",
      safetyConditional: "Condicional",
      safetyUnsatisfactory: "Insatisfactoria",
      confirmCta: "Sí, somos nosotros — continuar",
      step3Headline: "¿A dónde enviamos la oferta escrita?",
      step3Intro:
        "Le enviaremos la oferta + un enlace de calendario para una llamada breve. Pre-llenamos su teléfono desde FMCSA — puede modificarlo.",
      name: "Su nombre",
      email: "Email",
      phone: "Teléfono",
      fromFmcsa: "De FMCSA",
      continue: "Continuar",
      step4Headline: "Dos detalles finales.",
      step4Intro:
        "Estos definen la valuación. Respuestas honestas — no hay opción incorrecta.",
      relayQuestion: "¿Contrato activo de Amazon Relay? *",
      relayYes: "Sí, Relay activo",
      relayYesNote: "Categoría de máxima prioridad.",
      relayNo: "Sin Relay",
      relayNoNote: "Igualmente bienvenidos.",
      tcpaConsent:
        "Acepto recibir emails, llamadas, mensajes de texto y WhatsApp de {site} sobre mi valuación, incluyendo mediante tecnología automatizada. El consentimiento no es condición de compra. Pueden aplicarse tarifas de mensajes y datos. Responda STOP para optar por no recibir SMS. Consulte",
      privacy: "Privacidad",
      terms: "Términos",
      and: "y",
      showValuation: "Mostrar mi valuación",
      computing: "Calculando…",
      yourValuation: "Su valuación",
      forCompany: "Para",
      snapshotHeading: "Lo que usamos",
      authorityAge: "Antigüedad de autoridad",
      ageYearsValue: "≈ {n} años",
      ageMonthsValue: "≈ {n} meses",
      ageUnknown: "No disponible",
      ageBasis: "La antigüedad se basa en el último registro MCS-150 ({date}) — el mejor indicador público en FMCSA. Se confirma en la llamada.",
      note: "Nota:",
      floorNote:
        "esto limita la valuación indicativa a nuestro mínimo. Puede que aún haya un camino aquí, pero los términos finales se confirman en una llamada.",
      indicativeBlock:
        "Este es un rango indicativo basado en su registro FMCSA. La oferta final se confirma en una llamada de 15 minutos tras revisar seguro, antigüedad de MC y estado del contrato — luego por escrito en 24 horas.",
      haveQuestions: "¿Tiene preguntas? Contáctenos →",
      talkHeading: "Siguiente paso",
      callNow: "Llámenos ahora",
      callNowNote: "Lo más rápido — hable con nosotros ahora mismo",
      scheduleCall: "Agendar llamada",
      scheduleNote: "Elija el horario que le convenga — 15 minutos",
      nextAvailable: "Próximo disponible:",
      back: "← Atrás",
      errorNumber: "Por favor ingrese su número MC o DOT.",
      errorName: "Por favor ingrese su nombre.",
      errorEmail: "Por favor ingrese un email válido para enviarle la oferta.",
      errorRelay: "Por favor seleccione sí o no en la pregunta de Amazon Relay.",
      errorConsent: "Por favor acepte los términos de contacto para continuar.",
      errorNetwork: "Error de red. Inténtelo de nuevo.",
      errorGeneric: "Algo salió mal. Inténtelo de nuevo.",
    },
  },

  ru: {
    nav: {
      howItWorks: "Как это работает",
      requirements: "Требования",
      whyUs: "Почему Veritor",
      about: "О нас",
      faq: "Вопросы",
      blog: "Блог",
      contact: "Контакты",
      cta: "Получить оффер",
    },
    hero: {
      eyebrow: "Продажа транспортных компаний в США",
      headlineLine1: "Продайте свою транспортную LLC.",
      headlineLine2: "Закрытие за 3–5 рабочих дней.",
      subhead:
        "Veritor Group сопровождает продажу транспортных компаний в США от начала до конца — включая перевозчиков с активным Amazon Relay. Письменное предложение, личное закрытие сделки, полное сопровождение передачи. Вы получаете 100% суммы, которую примете.",
      ctaPrimary: "Бесплатная оценка",
      ctaSecondary: "Как это работает",
      lookupMc: "MC",
      lookupDot: "DOT",
      lookupMcPlaceholder: "Введите номер MC",
      lookupDotPlaceholder: "Введите номер DOT",
      lookupCta: "Проверить компанию",
      lookupHelper: "Бесплатный запрос FMCSA. Без регистрации.",
    },
    trust: {
      eyebrow: "Опыт",
      acquisitionsLabel: "Оценок в месяц",
      closeLabel: "Среднее время закрытия",
      closeValue: "3–5 рабочих дней",
      yearsLabel: "Цены остаётся вам",
    },
    requirements: {
      eyebrow: "Что подходит",
      headline1: "Чёткие требования.",
      headline2: "Никаких догадок.",
      intro:
        "Письменное предложение приходит компаниям, которые подходят под один из двух профилей. Если ваша компания — один из них, мы хотим о ней услышать. Если нет — скажем прямо, в тот же день, без хождений вокруг да около.",
      withRelay: {
        title: "Компании, уже работающие с Amazon Relay",
        items: [
          "Активный контракт Amazon Relay на LLC",
          "Страховка может быть просрочена — доступ к Relay возобновляется после перепривязки покрытия",
          "MC authority активно и в хорошем статусе",
          "Рейтинг безопасности Satisfactory или без рейтинга — не Conditional",
        ],
      },
      withoutRelay: {
        title: "Компании, которые ещё не на Amazon Relay",
        items: [
          "MC authority и страховка непрерывно активны 180+ дней",
          "Страховка действует прямо сейчас, без текущей просрочки",
          "MC authority активно и в хорошем статусе",
          "Рейтинг безопасности Satisfactory или без рейтинга, чистая история нарушений",
        ],
      },
      transferTitle: "Что передаётся при закрытии сделки",
      transferItems: [
        "Сама LLC и все федеральные/штатные регистрации",
        "Номер телефона компании",
        "Корпоративный email компании",
        "Банковский счёт / банковские реквизиты компании",
        "MC authority и записи DOT",
        "Активные кредиты не обязательны — но если они есть, раскройте их сразу",
      ],
    },
    how: {
      eyebrow: "Как это работает",
      headline1: "Четыре шага,",
      headline2: "3–5 рабочих дней.",
      steps: [
        {
          title: "Проверьте свой MC",
          body: "Введите номер MC или DOT. Запрашиваем вашу запись FMCSA — без регистрации, без обязательств. 30 секунд.",
        },
        {
          title: "Получите бесплатную оценку",
          body: "Отвечаем в течение нескольких часов, каждый день недели. Если компания подходит, вы получаете письменный оффер.",
        },
        {
          title: "Подпишите и проверьте",
          body: "Стандартный договор купли-продажи, лёгкая проверка документов, никаких сюрпризов. Юридические расходы не вычитаются из вашей суммы.",
        },
        {
          title: "Закрытие в банке лично",
          body: "Встречаемся с вами в вашем банке и подписываем лично, либо проводим всё удалённо, если так удобнее. В любом случае деньги поступают в момент подписания документов — через escrow адвоката, никогда позже.",
        },
      ],
    },
    why: {
      eyebrow: "Почему Veritor",
      headline1: "Продано безопасно.",
      headline2: "Задокументировано от начала до конца.",
      points: [
        {
          title: "Письменный договор, никогда рукопожатие.",
          body: "Каждая сделка идёт по подписанному договору купли-продажи. Никаких устных цифр, которые сжимаются за столом, никаких снижений цены в последний момент. Если кто-то предлагает вам наличные по телефону — это тревожный знак.",
        },
        {
          title: "Средства идут через escrow адвоката.",
          body: "Деньги проходят через escrow-счёт адвоката закрытия, а не из рук в руки. Эта единственная деталь — самая чёткая граница между реальной продажей и мошеннической схемой.",
        },
        {
          title: "Документы действительно переходят из рук в руки.",
          body: "Записи Secretary of State и responsible party в EIN обновляются на нового владельца. Компания перестаёт быть вашей на бумаге, а не только на словах.",
        },
        {
          title: "Конфиденциальность по умолчанию.",
          body: "Ваша личность остаётся закрытой — ничего не раскрывается водителям, диспетчерам или конкурентам. Конфиденциальность — стандарт каждой сделки.",
        },
      ],
    },
    faq: {
      eyebrow: "Частые вопросы",
      headline1: "Каждый вопрос,",
      headline2: "который нам задают.",
      intro:
        "Собрано из реальных тредов owner-operator на TruckersReport, Overdrive, официального руководства FMCSA и наших собственных звонков с продавцами. Если вашего вопроса нет — напишите нам напрямую, ответим письменно.",
      categories: [
        {
          id: "qualifying",
          label: "Подходит ли моя LLC?",
          questions: [
            {
              q: "Можно ли продавать, если MC authority оформлено на меня лично (sole proprietor / SSN)?",
              a: "Нет. Authority, оформленное на sole proprietor под вашим SSN, привязано к вам лично, а не к продаваемой сущности — передавать нечего. Authority, выданное LLC или корпорации, — это то, что меняет владельца, потому что продаётся именно сущность. Если вы работаете как sole prop, честный ответ — это не тот случай.",
            },
            {
              q: "Подходит ли LLC, если у меня всего один трак?",
              a: "Да. Размер парка не решающий фактор — LLC с одним траком проходят регулярно. Важны статус authority, страховка, статус Amazon Relay (если есть) и история нарушений. LLC с одним траком оценивается ниже, чем операция с несколькими траками, но процесс тот же.",
            },
            {
              q: "А если моё MC authority сейчас неактивно?",
              a: "Если у LLC активный контракт Amazon Relay, неактивное authority — решаемо: страховка перебиндивается, а authority реактивируется как часть закрытия. Без контракта Relay authority обычно должно быть активным, потому что одна реактивация не даёт непрерывной операционной истории, которую ищут фрахт-сети. Authority, неактивное больше 12 месяцев, обычно уже не реактивируется FMCSA.",
            },
            {
              q: "Можно ли продать только MC номер, а LLC оставить?",
              a: "Нет, и никто не может это сделать легально. FMCSA прямо запрещает продажу, аренду или передачу MC или DOT номера вне законной продажи самой сущности. Номер остаётся с сущностью, на которую он зарегистрирован. Что вы реально продаёте — это LLC; MC номер передаётся вместе с ней.",
            },
            {
              q: "У меня несколько LLC — можно продать одну, а другие оставить?",
              a: "Да. Каждая LLC — отдельная юридическая сущность, и каждая рассматривается отдельно. Продавцы с несколькими LLC часто продают одну-две, а остальные оставляют себе — здесь нет правила «всё или ничего».",
            },
          ],
        },
        {
          id: "valuation",
          label: "Цена и оценка",
          questions: [
            {
              q: "Сколько стоит моё MC authority?",
              a: "Зависит от пяти реальных переменных, по убыванию влияния: есть ли у LLC активный контракт Amazon Relay (самый весомый фактор), возраст authority, статус страховки, история нарушений и активные кредиты. Чистая LLC с активным Relay торгуется в заметно более высокой ценовой полосе, чем свежее authority без Relay. Письменное число приходит после быстрой проверки FMCSA — это единственный честный способ оценки.",
            },
            {
              q: "Что больше всего повышает стоимость моей LLC?",
              a: "Активный контракт Amazon Relay, чистые CSA scores, отсутствие out-of-service ордеров и непрерывная активная страховка. Если эти четыре в порядке — LLC находится в верхней части нашей ценовой полосы. Нишевая специализация (reefer, flatbed, hazmat) помогает; старое authority само по себе без операционной истории сильно цену не поднимает.",
            },
            {
              q: "Я слышал, MC продают за $20K–$30K — это правда?",
              a: "Осторожно с этой цифрой. Overdrive и отраслевая пресса писали, что предложения $30K за «возрастной authority» часто исходят от покупателей, планирующих использовать MC для double-brokering или схем краж груза, а не для реальных операций. Реальная рыночная цена чистого MC обычно сильно ниже этих заголовочных цифр. Если покупатель предлагает $30K без due diligence и письменного договора — остановитесь и проверьте.",
            },
            {
              q: "Asset sale или stock sale — в чём разница?",
              a: "Stock sale (продажа долей) передаёт саму LLC — с authority, EIN, историей и контрактами. Asset sale передаёт только конкретные позиции — траки, оборудование — и оставляет саму компанию в стороне. Это stock sales, потому что только такая структура сохраняет то, что делает транспортную компанию ценной. Механику разбираем на звонке.",
            },
            {
              q: "Нишевый фрахт (reefer, flatbed, hazmat) меняет цену?",
              a: "Да — специализированное authority и оборудование обычно идут с премией к dry van. Endorsements hazmat и tanker добавляют ценность, потому что базовую конфигурацию (квалификация водителей, класс страховки, разрешения FMCSA) сложнее быстро воспроизвести.",
            },
          ],
        },
        {
          id: "process",
          label: "Процесс и сроки",
          questions: [
            {
              q: "Сколько занимает вся продажа?",
              a: "Большинство сделок закрываются за 7–14 дней с момента получения ваших данных. Чистые LLC без активных кредитов, без залогов и с действующей страховкой закрываются ближе к 7 дням. Сделки с активными кредитами, factoring или недавними нарушениями — ближе к 14. Узкое место обычно банк или кредитор, а не мы.",
            },
            {
              q: "Какие именно шаги?",
              a: "Четыре основных этапа: (1) вы отправляете данные компании и получаете письменный оффер; (2) подписывается короткое letter of intent, проходит due diligence; (3) подписывается Membership Interest Purchase Agreement вместе со связанными штатными формами; (4) уходит wire закрытия, и LLC, телефон, email и банковский счёт передаются. После закрытия обновление штатной регистрации и передача drug-консорциума координируются за вас — бегать за бумагами не придётся.",
            },
            {
              q: "Нужно ли мне самому что-то подавать в FMCSA?",
              a: "Нет. Вы подпишете один-два документа на уровне штата в зависимости от того, где зарегистрирована LLC, и они будут подготовлены за вас. С 2013 года не существует заявления на передачу или пошлины FMCSA за смену владельца. Всё остальное разбирается на звонке, шаг за шагом, до того как вы что-то подпишете.",
            },
          ],
        },
        {
          id: "transfers",
          label: "Что передаётся при закрытии",
          questions: [
            {
              q: "Мой номер DOT и MC передаётся?",
              a: "Да. Номера DOT и MC остаются с сущностью LLC, а продаётся именно сущность — поэтому такие сделки структурируются как продажа долей, а не продажа активов.",
            },
            {
              q: "Мой EIN передаётся?",
              a: "Да. EIN остаётся с LLC, потому что сама сущность никогда не ликвидируется. Важный нюанс: вы не сможете повторно использовать этот EIN для будущего бизнеса — если EIN выдан сущности, он остаётся за ней пожизненно.",
            },
            {
              q: "А корпоративный телефон, email, MyRelay login, ELD аккаунт?",
              a: "Всё передаётся как часть закрытия, и всё это важно — компания без своего номера телефона теряет половину операционной непрерывности. Что именно передаётся и когда — разбирается на звонке, чтобы в день закрытия не было сюрпризов.",
            },
            {
              q: "Мои траки передаются вместе с LLC?",
              a: "Только если вы этого хотите. Если траки оформлены на LLC, они переходят автоматически вместе с продажей, и это учитывается в оффере. Если хотите оставить траки себе (оформленные на вас лично или на отдельную сущность), сделку можно структурировать так, чтобы передавались только LLC и authority, а траки вы продадите отдельно, в своём темпе.",
            },
          ],
        },
        {
          id: "loans-insurance",
          label: "Кредиты, залоги и страховка",
          questions: [
            {
              q: "Можно продавать, если на траке ещё кредит?",
              a: "Да, если трак оформлен на LLC и залог погашается при закрытии. Выплата координируется напрямую с вашим кредитором — цена делится между кредитором (на погашение залога) и вами (остаток). Если хотите оставить трак себе — оставляете и трак, и кредит, а этот трак исключается из продажи.",
            },
            {
              q: "Нужно ли сначала закрыть вопрос с factoring?",
              a: "Нет. Factoring сидит на UCC lien против LLC, поэтому он решается при закрытии — обычно погашается, иногда переносится. В любом случае это структурируется до подписания, а не всплывает сюрпризом потом.",
            },
            {
              q: "Что происходит со страховкой при закрытии?",
              a: "Активные полисы перебиндиваются под новое владение или заменяются. Просроченное покрытие оформляется заново, с расчётом на активацию в течение 24 часов после закрытия. В любом случае вы не отвечаете за покрытие после продажи.",
            },
          ],
        },
        {
          id: "amazon-relay",
          label: "Amazon Relay — особенности",
          questions: [
            {
              q: "Контракт Amazon Relay реально передаётся?",
              a: "Контракт держит carrier — сама LLC — а не вы лично, поэтому продажа компании — единственный способ сохранить его нетронутым. Продавать один только номер MC запрещено FMCSA, и это в любом случае убивает ценность. Как именно всё пройдёт, зависит от вашего аккаунта, scorecard и того, как устроена сущность — это разговор для звонка, а не для параграфа на сайте. Что можем сказать прямо: активный контракт Relay сильнее всего двигает вашу цифру.",
            },
            {
              q: "Сохраняется ли мой scorecard / история показателей в Amazon?",
              a: "Да. Performance scores привязаны к ID carrier-а, а этот ID остаётся с LLC — он не переоформляется при смене владельца. Amazon пересчитывает scores на скользящей 12-месячной базе, поэтому сильная история имеет реальный вес и помогает поднять оценку. На звонке разберём, сколько именно стоит ваш scorecard.",
            },
            {
              q: "Amazon Relay и Amazon DSP — это одно и то же? Запутался.",
              a: "Это совершенно разные программы, и они не взаимозаменяемы. Amazon Relay — для независимых трак-carrier-ов (Class 8), возящих middle-mile и long-haul между объектами Amazon. DSP (Delivery Service Partner) — программа последней мили с брендированными фургонами и водителями-сотрудниками. Речь здесь идёт о carrier-ах Relay — аккаунт DSP прямо не передаётся по правилам Amazon и не может быть продан таким образом.",
            },
            {
              q: "Насколько Amazon Relay добавляет к стоимости моей LLC?",
              a: "Очень много — контракт Relay является главным драйвером цены для Relay-carrier-а. При этом осторожнее с теми, кто утверждает, что один Relay добавляет $20K–$30K поверх скромной компании. Реальная ценность Relay зависит от статуса контракта, scorecard, lane assignments и объёма грузов — а не от самого факта существования аккаунта. Relay оценивается по реальным операционным данным, которые можно проверить, а не по факту существования аккаунта.",
            },
          ],
        },
        {
          id: "drivers-operations",
          label: "Водители, сотрудники, операции",
          questions: [
            {
              q: "Что произойдёт с моими водителями при продаже LLC?",
              a: "Водители — сотрудники LLC at-will, поэтому юридически их трудоустройство продолжается при новом владельце, если ни одна из сторон его не прекратит. На практике водителям, которых стоит удержать, обычно предлагают продолжить работу на тех же или лучших условиях, и они сами решают — остаться или уйти. Файлы drug-консорциума передаются вместе с carrier-ом, поэтому compliance-статус не прерывается.",
            },
            {
              q: "IFTA, IRP, 2290 и drug-консорциум — всё это передаётся?",
              a: "Да — когда LLC остаётся целой, все привязанные к ней регистрации тоже остаются в силе. Ничего из этого не нужно сворачивать или переоформлять самостоятельно. Детали именно вашего случая разбираем на звонке.",
            },
          ],
        },
        {
          id: "risk-scams",
          label: "Риски и защита от мошенников",
          questions: [
            {
              q: "Как понять, что это законно, а не мошенническая схема?",
              a: "Три проверки — применяйте их к любому, с кем имеете дело, не только к нам. (1) Есть письменный purchase agreement, никогда устная договорённость. (2) Средства идут через escrow-счёт адвоката закрытия, не из рук в руки, и никогда наличными. (3) Деньги поступают в момент подписания документов — escrow высвобождается по факту подписи, а не так, что вы сначала передаёте компанию, а потом ждёте. Отраслевая пресса (Overdrive, CCJ) задокументировала сети, скупающие authority под схемы краж груза и double-brokering. Такие операции отказываются от юристов, отказываются от escrow, давят на скорость и предлагают наличные. Ни на одну из этих трёх проверок они не согласятся. Закрытие сделки удалённо, кстати, само по себе не тревожный знак — удалённое закрытие через escrow совершенно законно, и многие продавцы его предпочитают. Важен порядок действий, а не место.",
            },
            {
              q: "FMCSA не дезактивирует мой MC, увидев, что я его «продаю»?",
              a: "Только если сделка структурирована как продажа самого номера, а это запрещено. FMCSA прямо дезактивирует authority, которые продаются, сдаются в аренду или передаются вне законных корпоративных транзакций — и выпустила бюллетень именно об этом в марте 2026 года. Легальный путь, который признаёт FMCSA, — это продажа долей самой LLC, именно так и структурированы такие сделки. Ни разу authority не дезактивировалось после закрытия.",
            },
            {
              q: "Как защититься от того, что произойдёт после закрытия?",
              a: "Purchase agreement включает освобождение продавца от ответственности за события после закрытия, а у самого закрытия есть чёткая effective date, которая проводит границу. Ваши CDL и личная история вождения в любом случае отделены от компании. Полную картину — что покрыто, что нет и что стоит уточнить — мы разбираем с вами напрямую до подписания; это не то, что решается через страницу сайта.",
            },
            {
              q: "Как должна быть структурирована оплата, чтобы я был в безопасности?",
              a: "Wire transfer через escrow при закрытии — никогда частичных платежей, никогда seller financing для покупателя-новичка, никогда наличных. Стандарт — средства поступают на IOLTA escrow-счёт адвоката закрытия, подписываются документы, и escrow в тот же день переводит деньги на ваш счёт. Если кто-то просит вас передать документы LLC до того, как переведены средства, — это тревожный флаг.",
            },
          ],
        },
        {
          id: "after-sale",
          label: "Налоги, конфиденциальность и после",
          questions: [
            {
              q: "Как сделка облагается налогом для меня?",
              a: "Продажа долей (stock sale) с владением больше 12 месяцев обычно квалифицируется под long-term capital gains на прибыль сверх вашей basis. Часть может облагаться как ordinary income — в зависимости от того, как распределена цена. Поговорите с CPA, который разбирается в продаже транспортных компаний, до закрытия. Мы не будем давать вам налоговые советы со страницы сайта, и вас должен насторожить любой, кто это делает.",
            },
            {
              q: "Узнают ли мои водители, брокеры или конкуренты до закрытия?",
              a: "Не от нас. По запросу подписываем взаимный NDA до due diligence, и наша стандартная практика — держать сделку конфиденциальной до самого закрытия. Во время due diligence знают только: вы, мы, соответствующие адвокаты и кредитор, если он участвует в payoff. Ничего не публикуется, нигде не рекламируется, и ваша компания никогда не «ходит по рукам».",
            },
            {
              q: "Можно ли открыть новый MC authority после продажи?",
              a: "Да, но FMCSA помечает «chameleon carriers» — новые сущности, делящие владельцев, адреса или другие идентификаторы с недавно проданными или отозванными. Если вы хотите вернуться в индустрию под новым authority — пройдёте стандартный New Entrant audit (18 месяцев), и стоит регистрировать новую сущность по другому адресу, чтобы избежать chameleon-флагов. Общее владение само по себе не дисквалифицирует — лишь приглашает scrutiny.",
            },
            {
              q: "Что если моя LLC не подходит для оффера?",
              a: "Скажем в течение нескольких часов и объясним точно почему. Без комиссии, без обязательств, без давления продаж. Если LLC близка к подходящей, но чуть-чуть не дотягивает (например, MC и страховка активны только 4 месяца, а мы ищем чистую историю 6+ месяцев) — часто предложим конкретные шаги, чтобы дойти до подходящего состояния, или прямо скажем, что путь не имеет смысла, и вам лучше другая опция выхода.",
            },
          ],
        },
      ],
    },
    contact: {
      eyebrow: "Получить оффер",
      headline1: "Расскажите про",
      headline2: "вашу LLC.",
      intro:
        "Бесплатная оценка, без обязательств. Отвечаем в течение нескольких часов, каждый день недели.",
      callLabel: "Звонок",
      emailLabel: "Email",
      whatsappLabel: "WhatsApp",
      whatsappValue: "Написать",
      name: "Имя и фамилия",
      email: "Email",
      phone: "Телефон",
      company: "Название компании / LLC",
      mc: "MC номер",
      relayQ: "Есть ли у LLC активный контракт Amazon Relay?",
      relayYes: "Да — Amazon Relay есть",
      relayNo: "Нет — Amazon Relay нет",
      mcAge: "Сколько дней вашему MC authority?",
      insurance: "Статус страховки",
      insuranceActive: "Активна",
      insuranceInactive: "Неактивна",
      state: "Штат регистрации",
      notes: "Что ещё нам стоит знать",
      submit: "Отправить на оценку",
      submitting: "Отправка…",
      privacyNote:
        "Используем ваши данные только для оценки LLC и ответа на этот запрос.",
      successHeadline: "Получили. Уже работаем.",
      successBody:
        "Спасибо, {name}. Свяжемся с вами по адресу {email} в течение нескольких часов.",
      nameRequired: "Пожалуйста, укажите имя.",
      emailRequired: "Пожалуйста, укажите корректный email.",
      phoneRequired: "Пожалуйста, укажите телефон для связи.",
      error: "Что-то пошло не так. Попробуйте снова или напишите нам напрямую.",
    },
    footer: {
      rights: "Все права защищены.",
      privacy: "Конфиденциальность",
      terms: "Условия",
      description:
        "Veritor Group сопровождает продажу транспортных компаний в США — специалисты по Amazon Relay.",
    },
    wizard: {
      brandTag: "Бесплатная оценка",
      stepOf: "Шаг {n} из {total}",
      indicativeNote:
        "Ориентировочная оценка на основе публичных данных FMCSA. Окончательное предложение — после короткого звонка и проверки документов. Без обязательств, без листинговых сборов, без комиссий.",
      step1Headline1: "Получите письменную оценку за",
      step1Headline2: "90 секунд.",
      step1Intro:
        "Введите номер MC или DOT. Мы запросим вашу запись FMCSA, подтвердим компанию и вернём диапазон стоимости — без звонка.",
      mcLabel: "Номер MC",
      dotLabel: "Номер DOT",
      yourMc: "Ваш номер MC",
      yourDot: "Ваш номер DOT",
      noMcLink: "Ещё нет MC?",
      lookupCta: "Запросить FMCSA",
      lookingUp: "Запрашиваем…",
      step2Headline: "Подтвердите компанию.",
      step2Intro:
        "Данные из FMCSA. Если что-то выглядит неверно, вернитесь и проверьте номер.",
      legalName: "Юридическое название",
      dba: "DBA",
      address: "Адрес",
      authority: "Полномочия",
      authorityActive: "Активный for-hire",
      authorityInactive: "Неактивный / не for-hire",
      insurance: "Страховка",
      insuranceActive: "Активна",
      insuranceLapsed: "Просрочена / требуется",
      insuranceNotRequired: "Не требуется",
      fleetSize: "Тягачи · водители",
      crashes: "Аварии (24 мес.)",
      safety: "Рейтинг безопасности",
      safetySatisfactory: "Удовлетворительно",
      safetyConditional: "Условный",
      safetyUnsatisfactory: "Неудовлетворительно",
      confirmCta: "Это мы — продолжить",
      step3Headline: "Куда отправить письменное предложение?",
      step3Intro:
        "Мы отправим оферту + ссылку на календарь для короткого звонка. Телефон уже подставлен из FMCSA — можете изменить.",
      name: "Ваше имя",
      email: "Email",
      phone: "Телефон",
      fromFmcsa: "Из FMCSA",
      continue: "Продолжить",
      step4Headline: "Две финальные детали.",
      step4Intro: "Это влияет на оценку. Честные ответы — нет неправильного выбора.",
      relayQuestion: "Активный контракт Amazon Relay? *",
      relayYes: "Да, активный Relay",
      relayYesNote: "Высший приоритет.",
      relayNo: "Без Relay",
      relayNoNote: "Тоже подходит.",
      tcpaConsent:
        "Я согласен получать email, звонки, SMS и сообщения WhatsApp от {site} о моей оценке, в том числе с использованием автоматизации. Согласие не является условием покупки. Могут применяться тарифы на сообщения и данные. Ответьте STOP, чтобы отписаться от SMS. См.",
      privacy: "Конфиденциальность",
      terms: "Условия",
      and: "и",
      showValuation: "Показать оценку",
      computing: "Вычисляем…",
      yourValuation: "Ваша оценка",
      forCompany: "Для",
      snapshotHeading: "Что мы учли",
      authorityAge: "Возраст полномочий",
      ageYearsValue: "≈ {n} лет",
      ageMonthsValue: "≈ {n} мес.",
      ageUnknown: "Нет данных",
      ageBasis: "Возраст полномочий рассчитан по последней подаче MCS-150 ({date}) — это лучший публичный ориентир в FMCSA. Точный возраст подтвердим на звонке.",
      note: "Примечание:",
      floorNote:
        "это ограничивает ориентировочную оценку нашим минимумом. Путь здесь всё ещё может быть, но финальные условия подтверждаются на звонке.",
      indicativeBlock:
        "Это ориентировочный диапазон на основе записи FMCSA. Финальное предложение — после 15-минутного звонка с проверкой страховки, возраста MC и контракта — затем письменно в течение 24 часов.",
      haveQuestions: "Есть вопросы? Свяжитесь с нами →",
      talkHeading: "Что дальше",
      callNow: "Позвоните нам",
      callNowNote: "Быстрее всего — поговорим прямо сейчас",
      scheduleCall: "Назначить звонок",
      scheduleNote: "Выберите удобное время — 15 минут",
      nextAvailable: "Ближайшее время:",
      back: "← Назад",
      errorNumber: "Пожалуйста, введите номер MC или DOT.",
      errorName: "Пожалуйста, введите имя.",
      errorEmail: "Пожалуйста, введите корректный email для отправки оферты.",
      errorRelay: "Пожалуйста, выберите да или нет по вопросу об Amazon Relay.",
      errorConsent: "Пожалуйста, согласитесь с условиями связи, чтобы продолжить.",
      errorNetwork: "Ошибка сети. Попробуйте ещё раз.",
      errorGeneric: "Что-то пошло не так. Попробуйте ещё раз.",
    },
  },
};
