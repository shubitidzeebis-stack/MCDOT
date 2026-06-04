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
    scheduleCall: string;
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
      eyebrow: "US Logistics LLC Acquisitions",
      headlineLine1: "Sell your trucking LLC.",
      headlineLine2: "Closed in 3–5 business days.",
      subhead:
        "Veritor Group acquires US logistics LLCs — including those with active Amazon Relay contracts. Clean process. Fair offer. We handle the transfer.",
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
      acquisitionsLabel: "LLCs closed",
      closeLabel: "Average close",
      closeValue: "3–5 business days",
      yearsLabel: "Years acquiring",
    },
    requirements: {
      eyebrow: "What we buy",
      headline1: "Clear requirements.",
      headline2: "No guesswork.",
      intro:
        "We make offers on LLCs that fit one of two profiles. If your company matches either, we want to hear from you.",
      withRelay: {
        title: "LLCs that already have Amazon Relay",
        items: [
          "Active or inactive insurance — both work",
          "Valid MC number, in good standing",
          "Active Amazon Relay contract on the LLC",
          "Clean violation history",
        ],
      },
      withoutRelay: {
        title: "LLCs without Amazon Relay",
        items: [
          "Active insurance policy in force",
          "MC authority + insurance active for at least 6 months (180+ days)",
          "MC authority in good standing",
          "Clean violation history",
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
          body: "We respond within hours, every day of the week. If your LLC fits, we make a written offer.",
        },
        {
          title: "Sign and verify",
          body: "Standard purchase agreement, light document review, no surprises. We pay legal on our side.",
        },
        {
          title: "Meet at the bank",
          body: "We meet you at your bank, sign in person, and the wire goes from our account to yours at the counter. You walk out with funds.",
        },
      ],
    },
    why: {
      eyebrow: "Why Veritor",
      headline1: "Operators buying from operators.",
      headline2: "Not brokers. Not flippers.",
      points: [
        {
          title: "We close fast — and we close.",
          body: "Average close in 3–5 business days. We've done this 400+ times. Funds are ready before we make the offer.",
        },
        {
          title: "Fair, written offers.",
          body: "Every number is on paper. No verbal promises that change at closing. No last-minute price drops.",
        },
        {
          title: "We handle the transfer.",
          body: "LLC paperwork, MC re-registration, phone / email / bank handover — we drive every step so you don't have to.",
        },
        {
          title: "Discretion by default.",
          body: "We never disclose seller identity to drivers, dispatchers, or competitors. Confidentiality is standard.",
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
          label: "Does my LLC qualify?",
          questions: [
            {
              q: "Can I sell if my MC authority is registered to me personally (sole proprietor / SSN)?",
              a: "No. FMCSA authority registered to a sole proprietor under your SSN can't be transferred — it's tied to you personally, not to a sellable entity. Authority issued to an LLC or corporation is what we acquire, because the entity itself is what changes hands. If you're operating as a sole prop, the path is to wind down and re-apply under a new entity rather than to sell the existing authority.",
            },
            {
              q: "Does my LLC qualify if it's only one truck?",
              a: "Yes. Fleet size doesn't determine whether we'll buy — we acquire single-truck LLCs all the time. What matters is the LLC's authority status, insurance, Amazon Relay status (if any), and violation history. Pricing for single-truck LLCs is lower than multi-truck operations, but the structure is the same.",
            },
            {
              q: "What if my MC authority is currently inactive?",
              a: "If the LLC has an active Amazon Relay contract, inactive authority is workable — we re-bind insurance and reactivate authority as part of closing. If there's no Relay contract, we generally need the authority to be active, because reactivation alone doesn't give us the operating history we need to onboard with freight networks. Authorities inactive for more than 12 months are usually beyond reactivation by FMCSA.",
            },
            {
              q: "Can I sell only the MC number and keep the LLC?",
              a: "No, and neither can anyone else legitimately. FMCSA explicitly prohibits selling, leasing, or transferring an MC or DOT number outside a legitimate sale of the underlying entity. The number stays with the entity it's registered to. What you're really selling is the LLC; the MC number transfers with it.",
            },
            {
              q: "I have multiple LLCs — can I sell some and keep others?",
              a: "Yes. Each LLC is a separate legal entity and we treat each one independently. Sellers with multi-LLC books often sell one or two and keep the rest — there's nothing in our process that requires all-or-nothing.",
            },
          ],
        },
        {
          id: "valuation",
          label: "Pricing & valuation",
          questions: [
            {
              q: "How much is my MC authority worth?",
              a: "It depends on five real variables, in rough order of impact: whether the LLC has an active Amazon Relay contract (biggest single factor), MC authority age, insurance status, violation history, and any active loans. A clean LLC with active Relay typically trades in a much higher band than a fresh non-Relay MC. We give a written number per LLC after a quick FMCSA pull — that's the only honest way to price it.",
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
              a: "A stock (equity) sale transfers the LLC itself with all its authorities, EIN, history, and contracts intact. An asset sale transfers specific items (trucks, equipment, contracts) but not the LLC. We do equity sales because that's what preserves the MC, DOT, EIN, broker setups, and Amazon Relay contract. Asset sales force the buyer to set up fresh authority — which usually isn't what we're after.",
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
              a: "Four main stages: (1) you submit your LLC details and we come back with a written offer; (2) we sign a short letter of intent and complete diligence; (3) we sign the Membership Interest Purchase Agreement and any related state filings; (4) closing wire goes out, and the LLC, MC, DOT, phone, email, and bank account hand over to us. Post-close, we drive the FMCSA notification, drug-consortium handover, and any state-level registration updates.",
            },
            {
              q: "Do I have to file anything with FMCSA myself?",
              a: "Not really. Since 2013, FMCSA no longer requires a formal $300 application or filing for an ownership change of an LLC that holds operating authority. Both parties are asked to notify FMCSA of the change, and we handle that filing on your behalf. You may need to sign one or two state-level forms (membership amendment, statement of change) depending on the LLC's state of registration.",
            },
            {
              q: "Once we close, how quickly can the LLC run loads under our ownership?",
              a: "Same week, in most cases. The MC authority itself stays active because the entity didn't change — only the membership did. We file the new insurance certificate (BMC-91 or BMC-32) and update the BOC-3 process agent on day one of new ownership, and Amazon Relay (if applicable) sees continuity rather than a transfer event.",
            },
          ],
        },
        {
          id: "transfers",
          label: "What transfers at closing",
          questions: [
            {
              q: "Does my DOT number transfer to you?",
              a: "Yes, because we do equity sales. DOT and MC numbers stay with the LLC entity. In an asset sale they wouldn't — the buyer would need a new DOT — but that's not how our deals are structured.",
            },
            {
              q: "Does my EIN transfer?",
              a: "Yes. The LLC's EIN stays with the LLC because the entity itself doesn't dissolve. We file Form 8822-B with the IRS post-close to update the responsible party. Note: this also means you can't reuse the same EIN for a future business — once an EIN is issued to an entity, it stays there for the life of the entity.",
            },
            {
              q: "What about my broker setups, rate confirmations, and packets?",
              a: "Broker setups carry forward when the LLC is sold intact, because brokers have set you up under the LLC's MC, DOT, and EIN. We don't need to re-onboard with each broker. Some broker contracts have anti-assignment or change-of-control clauses that technically require notice — we handle that as part of post-close cleanup.",
            },
            {
              q: "What about my company phone, email, MyRelay login, ELD account?",
              a: "All transferable as part of closing — and we want them. The phone number is non-negotiable for us; an LLC without its phone is missing half its operational continuity. Email accounts (Gmail Workspace or domain-attached) port through admin access. MyRelay logins update with the new ownership. ELD subscriptions either transfer or get migrated to our provider.",
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
              a: "Yes, if the truck is titled to the LLC and the lien is paid off at closing. We coordinate the payoff wire directly with your lender — the purchase price splits between the lender (for payoff) and you (for the remainder). If you want to keep the truck, you keep both the truck and the loan, and we exclude the truck from the LLC sale.",
            },
            {
              q: "Do you take on my factoring relationship?",
              a: "We can. Factoring relationships sit on UCC liens against the LLC, so we have to address them at closing — either by paying off the line and closing the relationship, or by transferring it under our ownership. Most often we pay it off because we have our own factoring on better terms, but each deal is structured to fit.",
            },
            {
              q: "If you buy the LLC in a stock sale, do you assume my debts?",
              a: "Equity sales do come with the LLC's existing liabilities, which is why diligence matters. We don't take on undisclosed debt — your purchase agreement includes a representation that you've disclosed all liabilities and an indemnification if something undisclosed surfaces post-close. Disclose everything up front and the structure is clean.",
            },
            {
              q: "What happens to my insurance policy at closing?",
              a: "If your policy is active, we either re-bind it under new ownership with the existing carrier or transfer to one of ours. If it's lapsed, we re-bind from scratch — the LLC is briefly without coverage during the transition, but we time the new BMC-91 filing to land within 24 hours of closing. You're not on the hook for coverage post-close.",
            },
          ],
        },
        {
          id: "amazon-relay",
          label: "Amazon Relay specifics",
          questions: [
            {
              q: "Can the Amazon Relay contract actually transfer?",
              a: "Indirectly, yes — by selling the LLC that holds the contract. Amazon Relay contracts are bound to the carrier (LLC), not to you personally. When the LLC's membership changes hands, the contract continues. Amazon's 2026 verification rules require disclosure of beneficial-owner changes, so we always notify Amazon through proper channels rather than letting the change appear as a quiet transfer — undisclosed changes are a terminable offense under their terms.",
            },
            {
              q: "Does my Amazon scorecard / performance history carry over?",
              a: "Yes. Performance scores are bound to the carrier ID, and the carrier ID stays with the LLC. Your tier, your acceptance rate, your on-time delivery score — all of it survives the ownership change and continues under our operation. Amazon recalculates scores on a 12-month rolling basis, so any regressions take time to surface, and any history of strong performance is real value we factor into the offer.",
            },
            {
              q: "Is Amazon Relay the same as Amazon DSP? I'm confused.",
              a: "They're completely different and not interchangeable. Amazon Relay is for independent trucking carriers (Class 8) hauling middle-mile and long-haul freight between Amazon facilities. DSP (Delivery Service Partner) is the last-mile branded-van program with employee drivers. We acquire Relay carriers; we don't acquire DSPs, and DSP accounts are explicitly non-transferable under Amazon's rules.",
            },
            {
              q: "How much extra is my LLC worth because it has Amazon Relay?",
              a: "A lot — the Relay contract is the primary driver of price for a Relay carrier. That said, be wary of buyers who claim Relay alone adds $20K–$30K on top of an otherwise modest LLC. Real Relay value depends on the contract status, scorecard, lane assignments, and load volume — not on the existence of the account itself. We price Relay based on the actual operating data we can verify.",
            },
          ],
        },
        {
          id: "drivers-operations",
          label: "Drivers, employees & operations",
          questions: [
            {
              q: "What happens to my drivers when the LLC sells?",
              a: "Drivers are at-will employees of the LLC, so legally their employment continues under the new ownership unless one side terminates. In practice, we offer continued employment to drivers we want to retain on the same terms (or better), and your existing drivers can choose to stay or leave. Drug-consortium files transfer with the carrier, so there's no break in their compliance status.",
            },
            {
              q: "Do I need to give drivers WARN-Act notice?",
              a: "Generally no for small-fleet sales. Federal WARN applies at 100+ employees with mass layoffs; most owner-operator LLCs are well below that threshold. Some states have lower thresholds — California, New York, New Jersey, Illinois — so check state law if you have 50+ drivers. For typical 1–20 truck fleets, WARN doesn't apply.",
            },
            {
              q: "What about IFTA, IRP, 2290, drug consortium, ELD provider — do all of those transfer?",
              a: "Yes, when the LLC stays intact (equity sale). IFTA license is base-state issued to the LLC and continues. IRP cab cards stay with the LLC. Form 2290 (HVUT) is paid annually and the LLC's filing status stays current — no refund needed. Drug consortium membership transfers; clearinghouse query history follows each driver. ELD provider account transfers with the entity. The only thing we typically reset is the consortium membership, because we move drivers to our consortium — but that happens cleanly post-close.",
            },
            {
              q: "Can I get a Form 2290 (HVUT) refund for the unused months after sale?",
              a: "If trucks transfer with the LLC, no — the LLC keeps operating those trucks under us. If you keep trucks personally and sell them later, then yes: file IRS Form 8849 Schedule 6 to claim a credit for the unused months on the 2290.",
            },
          ],
        },
        {
          id: "risk-scams",
          label: "Risk & avoiding scams",
          questions: [
            {
              q: "How do I know you're a legitimate buyer and not running a fraud scheme?",
              a: "Three checks: (1) we provide a written purchase agreement, never a verbal handshake; (2) all funds wire through an attorney's escrow account, not direct to a person; (3) we operate the LLC after closing — we don't disappear with the authority and use it for double-brokering. Trade press (Overdrive, CCJ) has documented rings buying authorities for cargo theft schemes — those operations refuse legal counsel, refuse escrow, and offer cash. We do none of that.",
            },
            {
              q: "Will FMCSA inactivate my MC if it sees me 'selling' it?",
              a: "Only if the transaction is structured as a sale of the number itself, which is prohibited. FMCSA explicitly inactivates authorities that are sold, leased, or transferred outside legitimate corporate transactions. The way we structure deals — equity sale of the LLC, with both parties notifying FMCSA of the ownership change — is the legitimate path FMCSA recognizes. We've never had an authority deactivated post-close.",
            },
            {
              q: "How do I protect myself from accidents or violations the buyer causes after closing?",
              a: "Three legal mechanisms: (1) the purchase agreement includes a release of seller liability for post-close events; (2) we file the FMCSA ownership change with a clear effective date so any subsequent violation is documented under our ownership; (3) the LLC's insurance is re-bound under our name immediately, so claims arising after closing are against our policy, not yours. Your CDL, your personal driving record, and your name are completely separate from the LLC post-close.",
            },
            {
              q: "How should payment be structured so I'm safe?",
              a: "Wire transfer through escrow at closing — never partial payments, never seller financing for first-time buyers, never anything in cash. Our standard is funds go from us into the closing attorney's IOLTA escrow account, sign the documents, escrow releases the wire to your account same-day. If a buyer asks you to send the LLC documents before they wire funds, that's a flag.",
            },
          ],
        },
        {
          id: "after-sale",
          label: "Taxes, confidentiality & after the sale",
          questions: [
            {
              q: "How is the sale taxed for me?",
              a: "Equity sales held for more than 12 months generally qualify for long-term capital gains treatment on the gain over your basis in the LLC. Some portion may be taxed as ordinary income depending on how the purchase price is allocated (Form 8594) — particularly any part attributed to depreciable equipment that triggers depreciation recapture. Talk to a CPA familiar with trucking-business sales before closing — the structure of the deal directly affects your after-tax proceeds.",
            },
            {
              q: "Will my drivers, brokers, or competitors find out before closing?",
              a: "Not from us. We sign a mutual NDA before diligence on request, and our standard practice is to keep the transaction confidential through closing. Brokers and Amazon don't get notified until closing, when the change is filed officially. The only parties who know during diligence are you, us, our respective lawyers, and any lender involved in a payoff.",
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
        "Veritor Group acquires US logistics LLCs — Amazon Relay specialists.",
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
        "this caps the indicative valuation at our floor. We can still buy, but final terms will be confirmed on a call.",
      indicativeBlock:
        "This is an indicative range based on your FMCSA snapshot. Final offer is confirmed on a 15-minute call after we review your insurance, MC age, and contract status — then in writing within 48 hours.",
      haveQuestions: "Have questions? Contact us →",
      scheduleCall: "Schedule a call",
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
      eyebrow: "Compra de LLCs de logística en EE. UU.",
      headlineLine1: "Venda su LLC de transporte.",
      headlineLine2: "Cerramos en 3–5 días hábiles.",
      subhead:
        "Veritor Group adquiere LLCs de logística en EE. UU. — incluyendo aquellas con contrato activo de Amazon Relay. Proceso limpio. Oferta justa. Nosotros manejamos la transferencia.",
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
      acquisitionsLabel: "LLCs cerradas",
      closeLabel: "Cierre promedio",
      closeValue: "3–5 días hábiles",
      yearsLabel: "Años en el negocio",
    },
    requirements: {
      eyebrow: "Qué compramos",
      headline1: "Requisitos claros.",
      headline2: "Sin sorpresas.",
      intro:
        "Hacemos ofertas a LLCs que cumplen uno de dos perfiles. Si su empresa cumple cualquiera de ellos, queremos hablar.",
      withRelay: {
        title: "LLCs que ya tienen Amazon Relay",
        items: [
          "Seguro activo o inactivo — ambos funcionan",
          "Número MC válido, sin problemas",
          "Contrato activo de Amazon Relay en la LLC",
          "Historial de violaciones limpio",
        ],
      },
      withoutRelay: {
        title: "LLCs sin Amazon Relay",
        items: [
          "Póliza de seguro activa y vigente",
          "MC autoridad y seguro activos al menos 6 meses (180+ días)",
          "Autoridad MC en buen estado",
          "Historial de violaciones limpio",
        ],
      },
      transferTitle: "Lo que se transfiere al cierre",
      transferItems: [
        "La LLC y todos los registros federales/estatales",
        "Número de teléfono de la empresa",
        "Cuenta de correo electrónico de la empresa",
        "Cuenta bancaria / datos bancarios de la empresa",
        "Autoridad MC y registros DOT",
        "No es necesario que la LLC esté libre de deudas — solo divúlguelas desde el principio",
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
          body: "Respondemos en horas, todos los días de la semana. Si su LLC encaja, hacemos una oferta por escrito.",
        },
        {
          title: "Firme y verifique",
          body: "Contrato de compra estándar, revisión documental ligera, cero sorpresas. Pagamos los honorarios legales de nuestro lado.",
        },
        {
          title: "Cierre presencial en su banco",
          body: "Nos reunimos en su banco, firmamos en persona, y la transferencia bancaria sale de nuestra cuenta a la suya en el mostrador. Sale con los fondos.",
        },
      ],
    },
    why: {
      eyebrow: "Por qué Veritor",
      headline1: "Operadores comprando a operadores.",
      headline2: "No somos brokers. No revendemos.",
      points: [
        {
          title: "Cerramos rápido — y cerramos de verdad.",
          body: "Cierre promedio en 3–5 días hábiles. Lo hemos hecho más de 400 veces. Los fondos están listos antes de hacer la oferta.",
        },
        {
          title: "Ofertas justas y por escrito.",
          body: "Cada número está en papel. Sin promesas verbales que cambian al cierre. Sin bajadas de precio de último minuto.",
        },
        {
          title: "Nosotros manejamos la transferencia.",
          body: "Papeleo de la LLC, re-registro MC, traspaso de teléfono / email / banco — guiamos cada paso para que usted no tenga que hacerlo.",
        },
        {
          title: "Discreción total.",
          body: "Nunca revelamos la identidad del vendedor a choferes, dispatchers o competidores. Confidencialidad estándar.",
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
              a: "No. La autoridad de FMCSA registrada a un sole proprietor bajo su SSN no se puede transferir — está atada a usted personalmente, no a una entidad vendible. La autoridad emitida a una LLC o corporación es lo que adquirimos, porque la entidad misma es lo que cambia de manos. Si opera como sole prop, el camino es cerrar y volver a aplicar bajo una nueva entidad, no vender la autoridad existente.",
            },
            {
              q: "¿Mi LLC califica si solo tengo un camión?",
              a: "Sí. El tamaño de la flota no determina si compramos — adquirimos LLCs de un solo camión todo el tiempo. Lo que importa es el estado de la autoridad de la LLC, el seguro, el estado de Amazon Relay (si aplica) y el historial de violaciones. El precio para LLCs de un camión es menor que para operaciones con varios camiones, pero la estructura es la misma.",
            },
            {
              q: "¿Qué pasa si mi autoridad MC está actualmente inactiva?",
              a: "Si la LLC tiene un contrato activo de Amazon Relay, la autoridad inactiva se puede manejar — re-vinculamos el seguro y reactivamos la autoridad como parte del cierre. Si no hay contrato de Relay, generalmente necesitamos la autoridad activa, porque la reactivación sola no nos da el historial operativo necesario para entrar en redes de carga. Las autoridades inactivas por más de 12 meses normalmente ya no se pueden reactivar con FMCSA.",
            },
            {
              q: "¿Puedo vender solo el número MC y quedarme con la LLC?",
              a: "No, y nadie puede legítimamente. FMCSA prohíbe expresamente vender, arrendar o transferir un número MC o DOT fuera de una venta legítima de la entidad subyacente. El número se queda con la entidad a la que está registrado. Lo que en realidad está vendiendo es la LLC; el número MC se transfiere con ella.",
            },
            {
              q: "Tengo varias LLCs — ¿puedo vender algunas y quedarme con otras?",
              a: "Sí. Cada LLC es una entidad legal separada y tratamos cada una por su cuenta. Vendedores con varias LLCs muchas veces venden una o dos y mantienen el resto — no hay nada en nuestro proceso que requiera todo o nada.",
            },
          ],
        },
        {
          id: "valuation",
          label: "Precio y valuación",
          questions: [
            {
              q: "¿Cuánto vale mi autoridad MC?",
              a: "Depende de cinco variables reales, en orden aproximado de impacto: si la LLC tiene un contrato activo de Amazon Relay (factor más grande), edad de la autoridad MC, estado del seguro, historial de violaciones, y cualquier préstamo activo. Una LLC limpia con Relay activo normalmente se opera en una banda mucho más alta que un MC nuevo sin Relay. Damos un número por escrito por LLC después de un FMCSA pull rápido — esa es la única manera honesta de ponerle precio.",
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
              a: "Una stock sale (venta de capital) transfiere la LLC misma con todas sus autoridades, EIN, historial y contratos intactos. Una asset sale transfiere artículos específicos (camiones, equipo, contratos) pero no la LLC. Hacemos ventas de capital porque eso preserva el MC, DOT, EIN, broker setups y contrato de Amazon Relay. Las asset sales obligan al comprador a tramitar autoridad nueva — que normalmente no es lo que buscamos.",
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
              a: "Cuatro etapas principales: (1) usted envía los datos de su LLC y le devolvemos una oferta por escrito; (2) firmamos una carta de intención corta y completamos la diligencia; (3) firmamos el Membership Interest Purchase Agreement y los formularios estatales relacionados; (4) sale el wire de cierre y se transfieren la LLC, MC, DOT, teléfono, email y cuenta bancaria a nosotros. Después del cierre, manejamos la notificación a FMCSA, traspaso del consorcio de drogas y cualquier actualización de registro estatal.",
            },
            {
              q: "¿Tengo que presentar algo con FMCSA personalmente?",
              a: "No realmente. Desde 2013, FMCSA ya no requiere una solicitud formal con tarifa de $300 ni un trámite específico para el cambio de propiedad de una LLC que tiene autoridad. Se pide a ambas partes que notifiquen a FMCSA del cambio, y nosotros manejamos esa presentación por usted. Puede que necesite firmar uno o dos formularios estatales (enmienda de membresía, declaración de cambio) según el estado de registro de la LLC.",
            },
            {
              q: "Una vez que cerramos, ¿qué tan rápido la LLC puede correr cargas bajo nueva propiedad?",
              a: "La misma semana, en la mayoría de los casos. La autoridad MC permanece activa porque la entidad no cambió — solo cambió la membresía. Presentamos el nuevo certificado de seguro (BMC-91 o BMC-32) y actualizamos el process agent BOC-3 el día uno bajo nueva propiedad, y Amazon Relay (si aplica) ve continuidad en lugar de un evento de transferencia.",
            },
          ],
        },
        {
          id: "transfers",
          label: "Qué se transfiere al cierre",
          questions: [
            {
              q: "¿Mi número DOT se transfiere a ustedes?",
              a: "Sí, porque hacemos ventas de capital. Los números DOT y MC se quedan con la entidad LLC. En una asset sale no se transferirían — el comprador necesitaría un DOT nuevo — pero así no estructuramos nuestras operaciones.",
            },
            {
              q: "¿Mi EIN se transfiere?",
              a: "Sí. El EIN de la LLC se queda con la LLC porque la entidad en sí no se disuelve. Presentamos el Form 8822-B con el IRS después del cierre para actualizar el responsible party. Ojo: esto también significa que no puede reusar ese EIN para un negocio futuro — una vez que se emite un EIN a una entidad, se queda ahí de por vida.",
            },
            {
              q: "¿Y mis broker setups, rate confirmations y packets?",
              a: "Los broker setups continúan cuando la LLC se vende intacta, porque los brokers lo configuraron bajo el MC, DOT y EIN de la LLC. No tenemos que volver a darnos de alta con cada broker. Algunos contratos de broker tienen cláusulas de no asignación o cambio de control que técnicamente requieren aviso — manejamos eso como parte de la limpieza post-cierre.",
            },
            {
              q: "¿Qué pasa con el teléfono de la empresa, email, login de MyRelay, cuenta de ELD?",
              a: "Todos transferibles como parte del cierre — y los queremos. El número de teléfono no es negociable para nosotros; una LLC sin su teléfono pierde la mitad de su continuidad operativa. Las cuentas de email (Gmail Workspace o adjuntas a un dominio) se traspasan con acceso de admin. Los logins de MyRelay se actualizan con la nueva propiedad. Las suscripciones de ELD se transfieren o se migran a nuestro proveedor.",
            },
            {
              q: "¿Mis camiones se transfieren con la LLC?",
              a: "Solo si quiere. Si los camiones tienen título de la LLC, se transfieren automáticamente con la venta y lo factorizamos en la oferta. Si quiere quedarse con sus camiones (titulados a su nombre personal o a una entidad separada), podemos estructurar la venta de modo que solo la LLC y las autoridades se transfieran, y usted vende los camiones individualmente en su propio tiempo.",
            },
          ],
        },
        {
          id: "loans-insurance",
          label: "Préstamos, gravámenes y seguro",
          questions: [
            {
              q: "¿Puedo vender si todavía tengo préstamo en un camión?",
              a: "Sí, si el camión tiene título de la LLC y el gravamen se paga al cierre. Coordinamos el wire de pago directamente con su prestamista — el precio de compra se divide entre el prestamista (para el payoff) y usted (para el resto). Si quiere quedarse con el camión, conserva tanto el camión como el préstamo, y excluimos el camión de la venta de la LLC.",
            },
            {
              q: "¿Asumen mi relación de factoring?",
              a: "Podemos. Las relaciones de factoring están sobre UCC liens contra la LLC, así que las tenemos que tratar al cierre — pagando la línea y cerrando la relación, o transfiriéndola bajo nuestra propiedad. Lo más común es que la paguemos porque tenemos nuestro propio factoring en mejores términos, pero cada operación se estructura a la medida.",
            },
            {
              q: "Si compran la LLC en stock sale, ¿asumen mis deudas?",
              a: "Las ventas de capital sí vienen con las deudas existentes de la LLC, por eso la diligencia importa. No asumimos deudas no divulgadas — su contrato de compra incluye una representación de que ha divulgado todas las deudas y una indemnización si algo no divulgado aparece después del cierre. Divulgue todo desde el principio y la estructura queda limpia.",
            },
            {
              q: "¿Qué pasa con mi póliza de seguro al cierre?",
              a: "Si su póliza está activa, la re-vinculamos bajo nueva propiedad con la aseguradora actual o la transferimos a una de las nuestras. Si está vencida, la re-vinculamos desde cero — la LLC queda brevemente sin cobertura durante la transición, pero programamos el nuevo BMC-91 para llegar dentro de las 24 horas del cierre. Usted no queda responsable de cobertura post-cierre.",
            },
          ],
        },
        {
          id: "amazon-relay",
          label: "Amazon Relay específicamente",
          questions: [
            {
              q: "¿El contrato de Amazon Relay realmente se puede transferir?",
              a: "Indirectamente, sí — vendiendo la LLC que tiene el contrato. Los contratos de Amazon Relay están vinculados al carrier (LLC), no a usted personalmente. Cuando cambia la membresía de la LLC, el contrato sigue. Las reglas de verificación de Amazon de 2026 requieren divulgación de cambios de propietario beneficiario, así que siempre notificamos a Amazon por canales adecuados — los cambios no divulgados son una falta terminable bajo sus términos.",
            },
            {
              q: "¿Mi scorecard / historial de desempeño en Amazon se mantiene?",
              a: "Sí. Los scores de desempeño están vinculados al ID del carrier, y el ID del carrier se queda con la LLC. Su tier, su acceptance rate, su on-time delivery score — todo eso sobrevive al cambio de propiedad y continúa bajo nuestra operación. Amazon recalcula los scores en una base móvil de 12 meses, así que cualquier regresión tarda en aparecer, y el historial de buen desempeño es valor real que factorizamos en la oferta.",
            },
            {
              q: "¿Amazon Relay es lo mismo que Amazon DSP? Estoy confundido.",
              a: "Son completamente diferentes y no son intercambiables. Amazon Relay es para carriers de camiones independientes (Class 8) que llevan carga middle-mile y long-haul entre instalaciones de Amazon. DSP (Delivery Service Partner) es el programa de last-mile con vans de marca y choferes empleados. Adquirimos carriers de Relay; no adquirimos DSPs, y las cuentas DSP son explícitamente no transferibles bajo las reglas de Amazon.",
            },
            {
              q: "¿Cuánto extra vale mi LLC porque tiene Amazon Relay?",
              a: "Mucho — el contrato de Relay es el principal motor de precio para un carrier de Relay. Dicho eso, tenga cuidado con compradores que dicen que solo el Relay agrega $20K–$30K sobre una LLC modesta. El valor real del Relay depende del estado del contrato, scorecard, asignaciones de lanes y volumen de cargas — no de la mera existencia de la cuenta. Le ponemos precio al Relay basado en datos operativos reales que podemos verificar.",
            },
          ],
        },
        {
          id: "drivers-operations",
          label: "Choferes, empleados y operación",
          questions: [
            {
              q: "¿Qué pasa con mis choferes cuando la LLC se vende?",
              a: "Los choferes son empleados at-will de la LLC, así que legalmente su empleo continúa bajo la nueva propiedad a menos que una de las partes termine. En la práctica, ofrecemos empleo continuo a choferes que queremos retener bajo los mismos términos (o mejores), y sus choferes existentes pueden quedarse o irse. Los archivos del consorcio de drogas se transfieren con el carrier, así que no hay quiebre en su estado de cumplimiento.",
            },
            {
              q: "¿Tengo que dar aviso WARN-Act a los choferes?",
              a: "Generalmente no en ventas de flota pequeña. WARN federal aplica con 100+ empleados y despidos masivos; la mayoría de LLCs de owner-operators están muy por debajo del umbral. Algunos estados tienen umbrales más bajos — California, Nueva York, Nueva Jersey, Illinois — así que revise la ley estatal si tiene 50+ choferes. Para flotas típicas de 1–20 camiones, WARN no aplica.",
            },
            {
              q: "¿Qué pasa con IFTA, IRP, 2290, consorcio de drogas, proveedor de ELD — se transfieren todos?",
              a: "Sí, cuando la LLC se mantiene intacta (stock sale). La licencia IFTA es emitida por el estado base a la LLC y continúa. Las cab cards de IRP se quedan con la LLC. El Form 2290 (HVUT) se paga anualmente y el estado de presentación de la LLC se queda al día — no hay que pedir reembolso. La membresía del consorcio de drogas se transfiere; el historial de queries del clearinghouse sigue a cada chofer. La cuenta del proveedor de ELD se transfiere con la entidad. Lo único que normalmente reseteamos es la membresía del consorcio, porque movemos a los choferes al nuestro — pero eso se hace limpiamente post-cierre.",
            },
            {
              q: "¿Puedo pedir reembolso del Form 2290 (HVUT) por los meses no usados después de la venta?",
              a: "Si los camiones se transfieren con la LLC, no — la LLC sigue operando esos camiones bajo nosotros. Si se queda con los camiones personalmente y los vende después, sí: presente IRS Form 8849 Schedule 6 para reclamar crédito por los meses no usados del 2290.",
            },
          ],
        },
        {
          id: "risk-scams",
          label: "Riesgo y evitar fraudes",
          questions: [
            {
              q: "¿Cómo sé que ustedes son compradores legítimos y no un esquema de fraude?",
              a: "Tres verificaciones: (1) entregamos contrato de compra por escrito, nunca un acuerdo verbal; (2) todos los fondos se mueven por escrow de un abogado, no directo a una persona; (3) operamos la LLC después del cierre — no desaparecemos con la autoridad para usarla en double-brokering. La prensa del sector (Overdrive, CCJ) ha documentado redes que compran autoridades para esquemas de robo de carga — esas operaciones rechazan abogados, rechazan escrow y ofrecen efectivo. Nosotros no hacemos nada de eso.",
            },
            {
              q: "¿FMCSA va a inactivar mi MC si ve que lo estoy 'vendiendo'?",
              a: "Solo si la transacción se estructura como venta del número en sí, lo cual está prohibido. FMCSA explícitamente inactiva autoridades que se venden, arriendan o transfieren fuera de transacciones corporativas legítimas. La forma en que estructuramos las operaciones — venta de capital de la LLC, con ambas partes notificando a FMCSA del cambio de propiedad — es el camino legítimo que FMCSA reconoce. Nunca se nos ha desactivado una autoridad post-cierre.",
            },
            {
              q: "¿Cómo me protejo de accidentes o violaciones que el comprador cause después del cierre?",
              a: "Tres mecanismos legales: (1) el contrato de compra incluye liberación de responsabilidad del vendedor por eventos post-cierre; (2) presentamos el cambio de propiedad de FMCSA con fecha efectiva clara para que cualquier violación posterior quede documentada bajo nuestra propiedad; (3) el seguro de la LLC se re-vincula bajo nuestro nombre inmediatamente, así que reclamos surgidos después del cierre van contra nuestra póliza, no la suya. Su CDL, su record personal de manejo y su nombre quedan completamente separados de la LLC post-cierre.",
            },
            {
              q: "¿Cómo debería estructurarse el pago para que esté seguro?",
              a: "Wire transfer por escrow al cierre — nunca pagos parciales, nunca seller financing para compradores primerizos, nunca nada en efectivo. Nuestro estándar es que los fondos van de nosotros a la cuenta IOLTA escrow del abogado del cierre, se firman los documentos, y escrow libera el wire a su cuenta el mismo día. Si un comprador le pide enviar los documentos de la LLC antes de que ellos transfieran fondos, eso es una alerta.",
            },
          ],
        },
        {
          id: "after-sale",
          label: "Impuestos, confidencialidad y después",
          questions: [
            {
              q: "¿Cómo se grava la venta para mí?",
              a: "Las ventas de capital con tenencia de más de 12 meses generalmente califican para tratamiento de long-term capital gains sobre la ganancia por encima de su base en la LLC. Una porción puede gravarse como ingreso ordinario según cómo se aloca el precio de compra (Form 8594) — particularmente cualquier parte atribuida a equipo depreciable que dispara depreciation recapture. Hable con un CPA familiarizado con ventas de negocios de transporte antes del cierre — la estructura de la operación afecta directamente lo que recibe después de impuestos.",
            },
            {
              q: "¿Mis choferes, brokers o competidores se van a enterar antes del cierre?",
              a: "No por nosotros. Firmamos un NDA mutuo antes de la diligencia bajo solicitud, y nuestra práctica estándar es mantener la transacción confidencial hasta el cierre. Brokers y Amazon no se notifican sino hasta el cierre, cuando el cambio se presenta oficialmente. Los únicos que saben durante diligencia son usted, nosotros, nuestros respectivos abogados, y cualquier prestamista involucrado en un payoff.",
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
        "Veritor Group adquiere LLCs de logística en EE. UU. — especialistas en Amazon Relay.",
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
        "esto limita la valuación indicativa al mínimo. Podemos comprar igualmente, pero los términos finales se confirman en llamada.",
      indicativeBlock:
        "Este es un rango indicativo basado en su registro FMCSA. La oferta final se confirma en una llamada de 15 minutos tras revisar seguro, antigüedad de MC y estado del contrato — luego por escrito en 48 horas.",
      haveQuestions: "¿Tiene preguntas? Contáctenos →",
      scheduleCall: "Agendar llamada",
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
      eyebrow: "Покупка логистических LLC в США",
      headlineLine1: "Продайте свою транспортную LLC.",
      headlineLine2: "Закрытие за 3–5 рабочих дней.",
      subhead:
        "Veritor Group выкупает логистические LLC в США — включая компании с активным контрактом Amazon Relay. Чистый процесс. Честная цена. Перевод оформляем мы.",
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
      acquisitionsLabel: "Закрытых сделок",
      closeLabel: "Среднее время закрытия",
      closeValue: "3–5 рабочих дней",
      yearsLabel: "Лет в бизнесе",
    },
    requirements: {
      eyebrow: "Что мы покупаем",
      headline1: "Чёткие требования.",
      headline2: "Никаких догадок.",
      intro:
        "Мы делаем оффер на LLC, которые подходят под один из двух профилей. Если ваша компания подходит — мы готовы говорить.",
      withRelay: {
        title: "LLC с действующим Amazon Relay",
        items: [
          "Страховка активна или неактивна — оба варианта подходят",
          "Действующий MC номер, без нарушений",
          "Активный контракт Amazon Relay на LLC",
          "Чистая история нарушений",
        ],
      },
      withoutRelay: {
        title: "LLC без Amazon Relay",
        items: [
          "Действующий полис страхования",
          "MC authority и страховка активны минимум 6 месяцев (180+ дней)",
          "MC authority в хорошем статусе",
          "Чистая история нарушений",
        ],
      },
      transferTitle: "Что передаётся при закрытии сделки",
      transferItems: [
        "Сама LLC и все федеральные/штатные регистрации",
        "Номер телефона компании",
        "Корпоративный email компании",
        "Банковский счёт / банковские реквизиты компании",
        "MC authority и записи DOT",
        "Активные кредиты не помеха — но раскройте их сразу",
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
          body: "Отвечаем в течение нескольких часов, каждый день недели. Если LLC подходит — даём письменный оффер.",
        },
        {
          title: "Подпишите и проверьте",
          body: "Стандартный договор купли-продажи, лёгкая проверка документов, никаких сюрпризов. Юристы — за наш счёт.",
        },
        {
          title: "Закрытие в банке лично",
          body: "Встречаемся с вами в вашем банке, подписываем лично, и wire уходит с нашего счёта на ваш прямо у стойки. Уходите с деньгами на руках.",
        },
      ],
    },
    why: {
      eyebrow: "Почему Veritor",
      headline1: "Операторы покупают у операторов.",
      headline2: "Не брокеры. Не перекупщики.",
      points: [
        {
          title: "Закрываем быстро — и реально закрываем.",
          body: "Среднее закрытие — 3–5 рабочих дней. Сделано более 400 раз. Деньги готовы ещё до оффера.",
        },
        {
          title: "Честные офферы — на бумаге.",
          body: "Каждая цифра письменно. Никаких устных обещаний, которые меняются при закрытии. Никаких снижений цены в последний момент.",
        },
        {
          title: "Передачу оформляем мы.",
          body: "Документы LLC, перерегистрация MC, передача телефона / email / банка — каждый шаг ведём мы.",
        },
        {
          title: "Конфиденциальность по умолчанию.",
          body: "Мы не раскрываем личность продавца водителям, диспетчерам или конкурентам. NDA — стандартно.",
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
              a: "Нет. Authority FMCSA, оформленное на sole proprietor под вашим SSN, не передаётся — оно привязано к вам лично, а не к продаваемой сущности. Authority, выданное LLC или корпорации — это то, что мы покупаем, потому что меняется владелец самой сущности. Если вы работаете как sole prop, путь — закрыть и подать заново под новой LLC, а не продавать существующее authority.",
            },
            {
              q: "Подходит ли LLC, если у меня всего один трак?",
              a: "Да. Размер парка не определяет, купим мы или нет — мы регулярно покупаем LLC с одним траком. Важны статус authority LLC, страховка, статус Amazon Relay (если есть) и история нарушений. Цена за LLC с одним траком ниже, чем у мульти-трак операций, но структура сделки та же.",
            },
            {
              q: "А если моё MC authority сейчас неактивно?",
              a: "Если у LLC активный контракт Amazon Relay — неактивное authority решаемо: мы перебиндим страховку и реактивируем authority как часть закрытия. Если Relay-контракта нет — обычно нужна активная authority, потому что одна реактивация не даёт операционной истории, нужной для онбординга в фрахт-сети. Authority, неактивное более 12 месяцев, обычно уже не реактивируется FMCSA.",
            },
            {
              q: "Можно ли продать только MC номер, а LLC оставить?",
              a: "Нет, и никто не может это сделать легально. FMCSA прямо запрещает продажу, аренду или передачу MC или DOT номера вне законной продажи самой сущности. Номер остаётся с сущностью, на которую он зарегистрирован. Что вы реально продаёте — это LLC; MC номер передаётся вместе с ней.",
            },
            {
              q: "У меня несколько LLC — можно продать одну, а другие оставить?",
              a: "Да. Каждая LLC — отдельная юридическая сущность, и мы рассматриваем каждую отдельно. Продавцы с несколькими LLC часто продают одну-две и оставляют остальные — в нашем процессе нет правила «всё или ничего».",
            },
          ],
        },
        {
          id: "valuation",
          label: "Цена и оценка",
          questions: [
            {
              q: "Сколько стоит моё MC authority?",
              a: "Зависит от пяти реальных переменных, в порядке влияния: есть ли у LLC активный контракт Amazon Relay (самый большой фактор), возраст authority, статус страховки, история нарушений, активные кредиты. Чистая LLC с активным Relay торгуется в гораздо более высокой полосе, чем свежий MC без Relay. Мы даём письменное число по каждой LLC после быстрой проверки FMCSA — это единственный честный способ оценки.",
            },
            {
              q: "Что больше всего повышает стоимость моей LLC?",
              a: "Активный контракт Amazon Relay, чистые CSA scores, отсутствие out-of-service ордеров и непрерывная активная страховка. Если эти четыре в порядке — LLC находится в верхней части нашей ценовой полосы. Нишевая специализация (reefer, flatbed, hazmat) помогает; старое authority само по себе без операционной истории сильно цену не поднимает.",
            },
            {
              q: "Я слышал, MC продают за $20K–$30K — это правда?",
              a: "Осторожно с этой цифрой. Overdrive и отраслевая пресса писали, что предложения $30K за «возрастной authority» часто исходят от покупателей, планирующих использовать MC для double-brokering или схем краж груза, а не для реальных операций. Реальная рыночная цена чистого MC обычно сильно ниже этих заголовочных цифр. Если покупатель предлагает $30K без диligence и письменного договора — остановитесь и проверьте.",
            },
            {
              q: "Asset sale или stock sale — в чём разница?",
              a: "Stock sale (продажа долей) передаёт саму LLC со всеми authority, EIN, историей и контрактами. Asset sale передаёт конкретные позиции (траки, оборудование, контракты), но не саму LLC. Мы делаем stock sales, потому что это сохраняет MC, DOT, EIN, broker setups и контракт Amazon Relay. Asset sales заставляют покупателя оформлять authority заново — обычно это не то, что нам нужно.",
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
              a: "Четыре основных этапа: (1) вы отправляете данные LLC, мы возвращаемся с письменным оффером; (2) подписываем короткое letter of intent и проходим due diligence; (3) подписываем Membership Interest Purchase Agreement и связанные штатные формы; (4) уходит wire закрытия, и LLC, MC, DOT, телефон, email, банк передаются нам. После закрытия мы ведём уведомление FMCSA, передачу drug-консорциума и обновления штатной регистрации.",
            },
            {
              q: "Нужно ли мне самому что-то подавать в FMCSA?",
              a: "Нет, по сути. С 2013 года FMCSA не требует формального заявления с пошлиной $300 или специального трамита для смены владельца LLC, держащей authority. Обеим сторонам предлагается уведомить FMCSA о смене, и эту подачу мы ведём за вас. Возможно, нужно будет подписать одну-две штатные формы (поправка к membership, statement of change) в зависимости от штата регистрации LLC.",
            },
            {
              q: "После закрытия как быстро LLC может возить грузы под нашим управлением?",
              a: "В большинстве случаев — на той же неделе. MC authority остаётся активным, потому что сущность не изменилась — изменилось только membership. Мы подаём новый certificate of insurance (BMC-91 или BMC-32) и обновляем BOC-3 process agent в первый день нового владения, и Amazon Relay (если применимо) видит continuity, а не событие передачи.",
            },
          ],
        },
        {
          id: "transfers",
          label: "Что передаётся при закрытии",
          questions: [
            {
              q: "Мой DOT номер передаётся вам?",
              a: "Да, потому что мы делаем stock sales. Номера DOT и MC остаются с сущностью LLC. В asset sale они бы не передавались — покупателю нужен был бы новый DOT — но так наши сделки не структурированы.",
            },
            {
              q: "Мой EIN передаётся?",
              a: "Да. EIN LLC остаётся с LLC, потому что сама сущность не ликвидируется. После закрытия мы подаём Form 8822-B в IRS, чтобы обновить responsible party. Важно: это также значит, что вы не сможете повторно использовать этот EIN для будущего бизнеса — раз EIN выдан сущности, он остаётся за ней пожизненно.",
            },
            {
              q: "А мои broker setups, rate confirmations и пакеты документов?",
              a: "Broker setups сохраняются, когда LLC продаётся целиком — брокеры завели вас под MC, DOT и EIN самой LLC. Заводиться у каждого брокера заново не нужно. Некоторые контракты с брокерами имеют clauses об anti-assignment или change-of-control, формально требующие уведомления — это часть пост-закрытия, которую мы ведём.",
            },
            {
              q: "А корпоративный телефон, email, MyRelay login, ELD аккаунт?",
              a: "Всё передаётся как часть закрытия — и нам всё это нужно. Корпоративный телефон не обсуждается; LLC без своего номера теряет половину операционной непрерывности. Email-аккаунты (Gmail Workspace или domain-attached) портируются через admin-доступ. MyRelay logins обновляются под нового владельца. ELD-подписки либо передаются, либо мигрируют к нашему провайдеру.",
            },
            {
              q: "Мои траки передаются вместе с LLC?",
              a: "Только если вы хотите. Если траки оформлены на LLC — они переходят автоматически с продажей, и мы это учитываем в оффере. Если хотите оставить себе траки (оформленные на вас лично или на отдельную сущность) — мы можем структурировать сделку так, чтобы передавалась только LLC и authority, а траки вы продали отдельно в своём темпе.",
            },
          ],
        },
        {
          id: "loans-insurance",
          label: "Кредиты, залоги и страховка",
          questions: [
            {
              q: "Можно продавать, если на траке ещё кредит?",
              a: "Да, если трак оформлен на LLC и залог гасится при закрытии. Мы координируем wire погашения напрямую с вашим кредитором — цена сделки делится между кредитором (на payoff) и вами (остаток). Если хотите оставить трак — оставляете и трак, и кредит, а трак мы исключаем из продажи LLC.",
            },
            {
              q: "Берёте ли вы на себя моё factoring?",
              a: "Можем. Factoring сидит на UCC liens против LLC, поэтому при закрытии нужно с ним разобраться — либо погасить линию и закрыть отношения, либо передать под наше владение. Чаще всего мы погашаем, потому что у нас своё factoring на лучших условиях, но каждая сделка структурируется индивидуально.",
            },
            {
              q: "Если вы покупаете LLC stock sale — берёте ли вы на себя мои долги?",
              a: "Stock sales действительно идут с существующими обязательствами LLC, поэтому диligence важен. Мы не берём на себя нераскрытые долги — ваш purchase agreement содержит representation о том, что все обязательства раскрыты, и indemnification, если что-то нераскрытое всплывает после закрытия. Раскройте всё сразу — структура остаётся чистой.",
            },
            {
              q: "Что происходит со страховкой при закрытии?",
              a: "Если ваш полис активен — мы перебиндим его под новое владение с текущим carrier-ом или переведём к одному из наших. Если полис просрочен — биндим заново; LLC ненадолго остаётся без покрытия в момент перехода, но мы планируем подачу нового BMC-91 в течение 24 часов после закрытия. После закрытия вы за покрытие не отвечаете.",
            },
          ],
        },
        {
          id: "amazon-relay",
          label: "Amazon Relay — особенности",
          questions: [
            {
              q: "Контракт Amazon Relay реально передаётся?",
              a: "Косвенно — да, через продажу LLC, держащей контракт. Контракты Amazon Relay привязаны к carrier-у (LLC), а не к вам лично. Когда меняется membership LLC — контракт продолжается. Правила верификации Amazon 2026 года требуют раскрытия смены beneficial owner, поэтому мы всегда уведомляем Amazon через надлежащие каналы — нераскрытые смены являются основанием для расторжения по их условиям.",
            },
            {
              q: "Сохраняется ли мой scorecard / история показателей в Amazon?",
              a: "Да. Performance scores привязаны к ID carrier-а, а ID carrier-а остаётся с LLC. Ваш tier, acceptance rate, on-time delivery score — всё переживает смену владельца и продолжается под нашим управлением. Amazon пересчитывает scores на скользящей 12-месячной базе, поэтому регрессии проявляются не сразу, а сильная история — реальная ценность, которую мы учитываем в оффере.",
            },
            {
              q: "Amazon Relay и Amazon DSP — это одно и то же? Запутался.",
              a: "Совершенно разные программы и не взаимозаменяемы. Amazon Relay — для независимых трак-carrier-ов (Class 8), возящих middle-mile и long-haul между объектами Amazon. DSP (Delivery Service Partner) — last-mile программа с брендированными vans и водителями-сотрудниками. Мы покупаем carrier-ов Relay; DSP не покупаем, и DSP-аккаунты явно не передаются по правилам Amazon.",
            },
            {
              q: "Насколько Amazon Relay добавляет к стоимости моей LLC?",
              a: "Очень много — Relay-контракт это главный драйвер цены для Relay-carrier-а. При этом осторожнее с покупателями, которые утверждают, что один Relay добавляет $20K–$30K поверх скромной LLC. Реальная ценность Relay зависит от статуса контракта, scorecard, lane assignments и объёма грузов — а не от факта существования аккаунта. Мы оцениваем Relay по реальным операционным данным, которые можем верифицировать.",
            },
          ],
        },
        {
          id: "drivers-operations",
          label: "Водители, сотрудники, операции",
          questions: [
            {
              q: "Что произойдёт с моими водителями при продаже LLC?",
              a: "Водители — at-will сотрудники LLC, поэтому юридически их трудоустройство продолжается под новым владением, если ни одна сторона не прекратит. На практике мы предлагаем водителям, которых хотим удержать, продолжить работу на тех же (или лучших) условиях, и ваши текущие водители могут остаться или уйти. Файлы drug-консорциума передаются с carrier-ом, поэтому compliance-статус не прерывается.",
            },
            {
              q: "Нужно ли давать водителям WARN-Act уведомление?",
              a: "Обычно нет в продажах малых парков. Федеральный WARN применяется при 100+ сотрудниках с массовыми увольнениями; большинство LLC owner-operator-ов сильно ниже порога. У некоторых штатов пороги ниже — Калифорния, Нью-Йорк, Нью-Джерси, Иллинойс — поэтому при 50+ водителях стоит проверить штатный закон. Для типичных парков 1–20 траков WARN не применяется.",
            },
            {
              q: "А IFTA, IRP, 2290, drug-консорциум, ELD-провайдер — всё это передаётся?",
              a: "Да, когда LLC сохраняется целиком (stock sale). IFTA-лицензия выдана штатом-базой на LLC и продолжает действовать. IRP cab cards остаются за LLC. Form 2290 (HVUT) платится ежегодно, и статус подачи LLC остаётся актуальным — возврат не нужен. Членство в drug-консорциуме передаётся; история запросов clearinghouse следует за каждым водителем. ELD-аккаунт передаётся с сущностью. Единственное, что мы обычно сбрасываем — это членство в консорциуме, потому что переводим водителей в свой; делается это чисто после закрытия.",
            },
            {
              q: "Можно ли получить возврат по Form 2290 (HVUT) за неиспользованные месяцы после продажи?",
              a: "Если траки передаются с LLC — нет, LLC продолжает их эксплуатировать под нами. Если оставляете траки лично и продаёте позже — да: подайте IRS Form 8849 Schedule 6, чтобы запросить кредит за неиспользованные месяцы 2290.",
            },
          ],
        },
        {
          id: "risk-scams",
          label: "Риски и защита от мошенников",
          questions: [
            {
              q: "Как мне понять, что вы — легальный покупатель, а не схема мошенничества?",
              a: "Три проверки: (1) мы даём письменный purchase agreement, никогда устные договорённости; (2) все средства идут через escrow адвоката, не напрямую человеку; (3) после закрытия мы оперируем LLC — мы не исчезаем с authority, чтобы использовать его в double-brokering. Отраслевая пресса (Overdrive, CCJ) задокументировала сети, скупающие authority под схемы краж груза — такие операции отказываются от юристов, отказываются от escrow и предлагают наличные. Мы не делаем ничего из этого.",
            },
            {
              q: "FMCSA не дезактивирует мой MC, увидев, что я его «продаю»?",
              a: "Только если транзакция структурирована как продажа самого номера, что запрещено. FMCSA явно дезактивирует authority, которые продаются, сдаются в аренду или передаются вне законных корпоративных транзакций. Способ, которым мы структурируем сделки — stock sale LLC с уведомлением FMCSA от обеих сторон — это легальный путь, признаваемый FMCSA. У нас не было дезактиваций после закрытия.",
            },
            {
              q: "Как защититься от аварий или нарушений, которые покупатель совершит после закрытия?",
              a: "Три юридических механизма: (1) purchase agreement содержит освобождение продавца от ответственности за пост-closing события; (2) мы подаём смену владельца FMCSA с чёткой effective date, чтобы любое последующее нарушение задокументировалось под нашим владением; (3) страховка LLC сразу перебиндена под наше имя, поэтому претензии после закрытия идут на нашу полицию, не на вашу. Ваше CDL, ваша личная история вождения и ваше имя полностью отделены от LLC после закрытия.",
            },
            {
              q: "Как должна быть структурирована оплата, чтобы я был в безопасности?",
              a: "Wire transfer через escrow при закрытии — никогда частичных платежей, никогда seller financing для покупателей-новичков, никогда наличных. Наш стандарт — средства идут от нас на IOLTA escrow адвоката закрытия, подписываются документы, escrow выпускает wire на ваш счёт в тот же день. Если покупатель просит вас отправить документы LLC до того, как они переведут средства — это красный флаг.",
            },
          ],
        },
        {
          id: "after-sale",
          label: "Налоги, конфиденциальность и после",
          questions: [
            {
              q: "Как сделка облагается налогом для меня?",
              a: "Stock sales с владением более 12 месяцев обычно квалифицируются под long-term capital gains на прибыль свыше вашей basis в LLC. Часть может облагаться как ordinary income в зависимости от того, как распределена цена покупки (Form 8594) — особенно та часть, что относится к амортизируемому оборудованию и triggers depreciation recapture. Поговорите с CPA, разбирающимся в продажах transportation-бизнесов до закрытия — структура сделки напрямую влияет на ваши после-налоговые поступления.",
            },
            {
              q: "Узнают ли мои водители, брокеры или конкуренты до закрытия?",
              a: "Не от нас. По запросу подписываем взаимный NDA до диligence, и наша стандартная практика — держать сделку конфиденциальной до закрытия. Брокеры и Amazon уведомляются только при закрытии, когда смена подаётся официально. Во время диligence знают только: вы, мы, наши соответствующие адвокаты, и любой кредитор, участвующий в payoff.",
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
        "Veritor Group выкупает логистические LLC в США — специалисты по Amazon Relay.",
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
        "это ограничивает ориентировочную оценку нашим минимумом. Мы всё равно можем купить, но условия — на звонке.",
      indicativeBlock:
        "Это ориентировочный диапазон на основе записи FMCSA. Финальное предложение — после 15-минутного звонка с проверкой страховки, возраста MC и контракта — затем письменно в течение 48 часов.",
      haveQuestions: "Есть вопросы? Свяжитесь с нами →",
      scheduleCall: "Назначить звонок",
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
