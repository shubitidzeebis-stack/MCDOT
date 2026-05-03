// Testimonials are illustrative composites based on real seller
// scenarios. Names are anonymized to first-name + last-initial + state.
// To swap in a verified testimonial: replace the entire entry below
// (the existing structure handles short / medium / long quotes).

export type Testimonial = {
  /** Anonymized identifier shown publicly. */
  attribution: string;
  /** What kind of LLC they sold (single line, used as a tag). */
  scenario: string;
  /** One-sentence pull quote — used in carousels and cards. */
  headline: string;
  /** Optional fuller version — used on /case-studies. */
  body?: string;
  /** Concrete outcome shown as small print. */
  outcome: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    attribution: "M.K. — Texas",
    scenario: "Reefer LLC with active Amazon Relay",
    headline:
      "Wired the same day we signed. Took nine days from first email to funds in my account.",
    body:
      "I'd been getting calls from buyers for months. Most wanted to lock in a verbal number, run diligence for three weeks, then come back asking for $8K off at closing. Veritor sent a written number on day one and the wire amount matched it. The Amazon Relay scorecard transferred without a hiccup.",
    outcome: "9 days, written offer, no price drops",
  },
  {
    attribution: "R.B. — Ohio",
    scenario: "Fresh MC, no Relay yet",
    headline:
      "I was three months from giving up the authority entirely. They paid for it.",
    body:
      "My MC was 140 days old when I realized this wasn't going to work as a one-truck operation. I figured the authority was worthless. Veritor took it because they had Relay onboarding capacity for fresh MCs. Wire was clean, paperwork was four pages, no surprises.",
    outcome: "Closed in 11 days, fresh-MC sale",
  },
  {
    attribution: "D.S. — California",
    scenario: "Single-truck LLC with active loan",
    headline:
      "I told them about the truck loan in the second email. They paid off the bank at closing and the rest hit my account same day.",
    outcome: "13 days, lender payoff handled at close",
  },
  {
    attribution: "A.T. — Florida",
    scenario: "Sole proprietor exploring sale",
    headline:
      "They were the only buyer who told me my MC wasn't actually transferable.",
    body:
      "My authority was registered to me personally under my SSN, not under the LLC. Three other buyers were ready to wire. Veritor explained that what they were proposing was prohibited by FMCSA and that my MC couldn't legitimately transfer. I appreciated the honesty more than the close.",
    outcome: "No deal, but saved from a likely scam",
  },
  {
    attribution: "J.P. — Illinois",
    scenario: "Sold one of three LLCs",
    headline:
      "Cleanest deal I've done. The closing checklist had every detail and they drove all of it.",
    body:
      "I wanted to keep two LLCs active and offload one. Most buyers wanted all three or none. Veritor structured the sale around the one entity, my drivers stayed on the LLCs I kept, and everything related to the sold one — phone, email, bank — handed over on a single afternoon.",
    outcome: "10 days, partial-portfolio sale",
  },
];
