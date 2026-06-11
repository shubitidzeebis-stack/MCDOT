// Outreach persona/template registry — REAL copy (Lukas-approved direction,
// 2026-06-11): two tracks per persona, selected by eligibility:
//
//   INTRO (approaching, <180d):  warm introduction — who we are, how the
//     process works, how easy it is, requirements/everything on the website,
//     get in touch if interested. Plants the seed ahead of the 180-day mark.
//   OFFER (eligible_now, ≥180d): offer-style but NOT a direct offer — if they
//     fit our requirements and would consider selling, get in touch.
//
// Both tracks: operators-not-brokers, simple process (lookup → valuation →
// offer), fast close, final steps in person or fully online, link to the
// website, reply-to-get-in-touch, confidential. NEVER a dollar figure
// (tease-then-quote is the locked pricing strategy).
//
// The LLM (draft.ts) personalizes angle + facts when a key is set;
// renderFallbackDraft() produces the finished tailored email with no LLM at
// all (placeholders {company} {milestone} {website}) — that is the live path.
//
// Nothing here sends mail or needs secrets — pure data + pure functions.

import { SITE, formatAddressOneLine } from "@/lib/site";

// Where every outreach email points (per Lukas: straight to the main site).
const OUTREACH_WEBSITE = "https://groupveritor.com";

export type PersonaKey = "owner_operator" | "small_fleet" | "default";
export type TrackKey = "intro" | "offer";

export type TrackCopy = {
  /** Subject line. {company} is substituted. */
  subject: string;
  /** Real email body. {company} {milestone} {website} are substituted. */
  body: string;
};

export type OutreachTemplate = {
  key: PersonaKey;
  label: string;
  /** Warm introduction — carriers APPROACHING the 180-day mark. */
  intro: TrackCopy;
  /** Offer-style (not a direct offer) — carriers PAST the 180-day mark. */
  offer: TrackCopy;
  /** Subject-line hint for the optional LLM path. {company} is substituted. */
  subjectHint: string;
  /** Tone + angle guidance for the optional LLM path. */
  angle: string;
};

export const OUTREACH_TEMPLATES: Record<PersonaKey, OutreachTemplate> = {
  owner_operator: {
    key: "owner_operator",
    label: "Owner-operator (1–5 trucks)",
    intro: {
      subject: "Introduction — we buy trucking companies like {company}",
      body: `Hi there,

I'm Luka with Veritor Group — we buy and operate trucking companies, and {company} came up in our research of new authorities that are doing it right.

This isn't a pitch yet, just an early introduction. {milestone}That's the point where buyers like us start paying real attention — so I wanted you to know who we are before you get there.

We're operators, not brokers: we buy companies like yours outright and run them ourselves. The process is simple — a quick lookup of your DOT, a straight valuation, then an offer — and closing is fast, with the final steps done in person or fully online, whichever suits you.

Who we are, how it works, and the requirements we look for are all on our site: {website}

If selling is something you'd consider once you cross that mark — or you're just curious what {company} could be worth — reply to this email anytime. No pressure, fully confidential.

Best,
Luka
Veritor Group`,
    },
    offer: {
      subject: "Are you open to an offer for {company}?",
      body: `Hi there,

I'm Luka with Veritor Group — we buy and operate trucking companies, and {company} stood out to us.

You've built something real: an active authority with clean insurance, past the point where a company like yours becomes most valuable to a buyer. {milestone}That timing is exactly why I'm reaching out.

I'll be straight with you: if {company} fits our requirements and selling is something you'd consider, we'd like to talk. We're operators, not brokers — we run these companies ourselves, we close fast, and the final steps are done whichever way suits you, in person or fully online.

How the process works, what we look for, and an estimate of what your company could be worth are all here: {website}

If the timing's interesting — or you're just curious — reply to this email and I'll take it from there. No pressure, fully confidential.

Best,
Luka
Veritor Group`,
    },
    subjectHint: "Are you open to an offer for {company}?",
    angle:
      "One owner-operator to another: warm, direct, no corporate fluff. We buy AND operate the company; operators not brokers; simple process (DOT lookup, valuation, offer); close fast; final steps in person or online. Requirements + worth estimate on the website. NEVER state a dollar figure. INTRO track (approaching 180d): introduction only, plant the seed, invite contact. OFFER track (past 180d): offer-style but not a direct offer — if they fit requirements and would sell, get in touch.",
  },
  small_fleet: {
    key: "small_fleet",
    label: "Small fleet (6–20 trucks)",
    intro: {
      subject: "Introducing Veritor Group — for when {company} hits 180 days",
      body: `Hi there,

I'm Luka with Veritor Group — we buy and operate trucking companies, and the operation you've built at {company} caught our attention.

This is an introduction, not a pitch. {milestone}That's the point where a fleet like yours becomes seriously interesting to buyers — so I wanted to be on your radar before you get there.

We're operators, not brokers: we acquire companies like yours and run them ourselves. The process is simple — a quick lookup, a straight valuation, then an offer — and we keep it fast and discreet, so nothing disrupts your drivers or your day-to-day. Final steps in person or fully online, your call.

Who we are, how it works, and the requirements we look for are all on our site: {website}

If selling is something you'd weigh up once you cross that mark — or you'd just like to know what {company} could be worth — reply anytime. No pressure, fully confidential.

Best,
Luka
Veritor Group`,
    },
    offer: {
      subject: "{company} — a quick, serious question",
      body: `Hi there,

I'm Luka with Veritor Group — we buy and operate trucking companies, and the operation you've built at {company} caught our attention.

You've scaled a real fleet with a team and clean insurance, past the point where a business like yours becomes most valuable to a buyer. {milestone}That's exactly why I'm reaching out now.

I'll be straight with you: if {company} fits our requirements and selling is something you'd consider, we'd like to talk. We're operators, not brokers — we run these companies ourselves, we close fast, and we keep it discreet so nothing disrupts your drivers or your day-to-day. Final steps in person or fully online, whichever suits you.

How the process works, what we look for, and an estimate of what your company could be worth are all here: {website}

If the timing's interesting — or you're just curious — reply to this email and I'll take it from there. No pressure, fully confidential.

Best,
Luka
Veritor Group`,
    },
    subjectHint: "{company} — a quick, serious question",
    angle:
      "Small-fleet owner (6–20 trucks): business-like, respect their time. We buy and operate; operators not brokers; simple process; fast and discreet close that won't disrupt drivers; in person or online. Requirements + worth estimate on the website. NEVER state a dollar figure. INTRO track (approaching 180d): introduction only, be on their radar, invite contact. OFFER track (past 180d): offer-style but not a direct offer — if they fit requirements and would sell, get in touch.",
  },
  default: {
    key: "default",
    label: "Default",
    intro: {
      subject: "Introduction — we buy trucking companies like {company}",
      body: `Hi there,

I'm Luka with Veritor Group — we buy and operate trucking companies, and {company} came up in our research of new authorities.

This is an early introduction, not a pitch. {milestone}That's the point where buyers like us start paying close attention — so I wanted you to know who we are before you get there.

We're operators, not brokers: we buy companies like yours outright and run them ourselves. The process is simple — a quick lookup, a straight valuation, then an offer — and closing is fast, with the final steps done in person or fully online, whichever suits you.

Who we are, how it works, and the requirements we look for are all on our site: {website}

If selling is something you'd consider once you cross that mark — or you're just curious what {company} could be worth — reply to this email anytime. No pressure, fully confidential.

Best,
Luka
Veritor Group`,
    },
    offer: {
      subject: "Are you open to an offer for {company}?",
      body: `Hi there,

I'm Luka with Veritor Group — we buy and operate trucking companies, and {company} stood out to us.

You've built something real: an active authority with clean insurance, past the point where a company like yours becomes most valuable to a buyer. {milestone}That timing is why I'm reaching out.

If {company} fits our requirements and selling is something you'd consider, we'd like to talk. We're operators, not brokers: we run these companies ourselves, we close fast, and the final steps are done whichever way suits you, in person or fully online.

How the process works, what we look for, and an estimate of what your company could be worth are all here: {website}

If you're open to it — or just curious — reply to this email and I'll take it from there. No pressure, fully confidential.

Best,
Luka
Veritor Group`,
    },
    subjectHint: "Are you open to an offer for {company}?",
    angle:
      "For-hire carrier near/past the 180-day mark: professional, concise, operator-to-operator. We buy and operate; operators not brokers; simple process; close fast; in person or online. Requirements + worth estimate on the website. NEVER state a dollar figure. INTRO track (approaching): introduction + invite contact. OFFER track (past 180d): offer-style but not a direct offer.",
  },
};

export function selectPersona(input: {
  powerUnits: number | null;
}): PersonaKey {
  if (input.powerUnits != null && input.powerUnits >= 6) return "small_fleet";
  if (input.powerUnits != null && input.powerUnits >= 1) return "owner_operator";
  return "default";
}

// Which copy track a carrier gets: past the mark -> offer; approaching -> intro.
export function selectTrack(f: {
  eligibilityState: string | null;
  daysTo180: number | null;
}): TrackKey {
  if (f.eligibilityState === "eligible_now") return "offer";
  if (f.daysTo180 != null && f.daysTo180 <= 0) return "offer";
  return "intro";
}

// The hard facts the LLM is allowed to use. NOTHING outside this may appear in
// the email — the prompt forbids inventing figures.
export type DraftFacts = {
  legalName: string | null;
  dbaName: string | null;
  state: string | null;
  mcNumber: string | null;
  dotNumber: string | null;
  powerUnits: number | null;
  daysTo180: number | null;
  eligibilityState: string | null;
  offerLow: number | null;
  offerHigh: number | null;
};

function companyName(f: DraftFacts): string {
  return f.dbaName || f.legalName || "your company";
}

function offerLine(f: DraftFacts): string {
  if (f.offerLow != null && f.offerHigh != null) {
    return `$${f.offerLow.toLocaleString("en-US")}–$${f.offerHigh.toLocaleString("en-US")}`;
  }
  return "";
}

// The personalized timing sentence. Intro track: "you're ~N days from the
// mark"; offer track: "you've crossed it". Empty when timing is unknown — the
// surrounding copy reads cleanly either way.
function milestoneLine(track: TrackKey, f: DraftFacts): string {
  if (track === "offer") {
    return "You've crossed the 180-day mark that makes carriers Amazon Relay–eligible — exactly when demand for an authority like yours peaks. ";
  }
  if (f.daysTo180 != null && f.daysTo180 > 0) {
    return `Your authority is about ${f.daysTo180} days from the 180-day mark that makes carriers Amazon Relay–eligible. `;
  }
  return "Your authority is approaching the 180-day mark that makes carriers Amazon Relay–eligible. ";
}

// Build the system + user prompt for the LLM. Pure — no I/O.
export function buildDraftPrompt(
  persona: OutreachTemplate,
  f: DraftFacts,
): { system: string; user: string } {
  const offer = offerLine(f);
  const track = selectTrack(f);
  const system = [
    `You write short cold B2B acquisition-outreach emails for ${SITE.name} (${SITE.legalName}), an operator-led acquirer of US logistics LLCs.`,
    `Goal: open a conversation about buying the recipient's trucking company / operating authority.`,
    `HARD RULES:`,
    `- Use ONLY the facts provided. NEVER invent numbers, dates, names, or claims.`,
    offer
      ? `- You MAY state the indicative offer range exactly as: ${offer}. Do not alter it.`
      : `- No offer figure is available — do NOT state any dollar amount.`,
    `- 90–150 words. Plain, human, operator-to-operator. No hype, no emojis, no markdown.`,
    `- One clear, low-pressure call to action (reply to this email).`,
    `- Do NOT add a signature, address, or unsubscribe text — those are appended automatically.`,
    `- Output STRICT JSON only: {"subject": string, "body": string}. No prose outside the JSON.`,
  ].join("\n");

  const user = [
    `PERSONA: ${persona.label}`,
    `TRACK: ${track === "offer" ? "OFFER — past the 180-day mark; offer-style but not a direct offer" : "INTRO — approaching the 180-day mark; warm introduction, plant the seed"}`,
    `ANGLE: ${persona.angle}`,
    `SUBJECT HINT (refine, keep it specific): ${persona.subjectHint.replace("{company}", companyName(f))}`,
    ``,
    `FACTS:`,
    `- Company: ${companyName(f)}`,
    f.state ? `- State: ${f.state}` : ``,
    f.mcNumber ? `- MC: ${f.mcNumber}` : ``,
    f.dotNumber ? `- DOT: ${f.dotNumber}` : ``,
    f.powerUnits != null ? `- Trucks (power units): ${f.powerUnits}` : ``,
    f.eligibilityState === "eligible_now"
      ? `- Status: now eligible for Amazon Relay (180+ days active authority).`
      : f.daysTo180 != null && f.daysTo180 > 0
        ? `- Status: ~${f.daysTo180} days from Amazon Relay eligibility.`
        : ``,
    offer ? `- Indicative offer range: ${offer}` : ``,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

// Deterministic personalized draft — the live path (no LLM key set). Picks the
// intro/offer track off the carrier's real timing and fills the placeholders.
export function renderFallbackDraft(
  persona: OutreachTemplate,
  f: DraftFacts,
): { subject: string; body: string } {
  const company = companyName(f);
  const track = selectTrack(f);
  const copy = persona[track];
  const milestone = milestoneLine(track, f);
  const body = copy.body
    .replaceAll("{company}", company)
    .replaceAll("{milestone}", milestone)
    .replaceAll("{website}", OUTREACH_WEBSITE);
  const subject = copy.subject.replaceAll("{company}", company);
  return { subject, body };
}

// Plain-text -> branded-shell HTML body (paragraphs). The shell + CAN-SPAM
// footer + unsubscribe are added by the sender. Exposed here so drafting and
// sending agree on rendering. `formatAddressOneLine` is re-exported for callers
// that need the postal address inline.
export { formatAddressOneLine };
