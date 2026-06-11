// Outreach copy registry — STRAIGHTFORWARD, NO FLUFF (Lukas directive
// 2026-06-11 after the first send): no flattery lines, no "stood out to us",
// nothing context-dependent. State who we are, that we buy companies like
// theirs, the simple process, where the requirements are, and how to get in
// touch. Two tracks, selected by the carrier's live timing:
//
//   INTRO (approaching, <180d):  brief introduction + the upcoming 180-day
//     milestone + invite contact.
//   OFFER (eligible_now, ≥180d): direct interest — if they'd consider selling,
//     get in touch. Still NEVER a dollar figure (tease-then-quote).
//
// Company names come from the FMCSA registry in ALL CAPS (often long, with
// the carrier's own typos). cleanCompanyName() formats them like a human
// wrote them, and subjects fall back to a generic line when the name is too
// long to read naturally — raw registry strings must never appear in a
// subject line again.
//
// Nothing here sends mail or needs secrets — pure data + pure functions.

import { SITE, formatAddressOneLine } from "@/lib/site";

// Where every outreach email points (per Lukas: straight to the main site).
const OUTREACH_WEBSITE = "https://groupveritor.com";

export type PersonaKey = "owner_operator" | "small_fleet" | "default";
export type TrackKey = "intro" | "offer";

export type TrackCopy = {
  /** Subject when the cleaned company name reads naturally. {company} substituted. */
  subject: string;
  /** Subject when the name is too long/odd for a subject line. */
  subjectFallback: string;
  /** Email body. {company} {milestone} {website} are substituted. */
  body: string;
};

export type OutreachTemplate = {
  key: PersonaKey;
  label: string;
  intro: TrackCopy;
  offer: TrackCopy;
  /** Subject-line hint for the optional LLM path. {company} is substituted. */
  subjectHint: string;
  /** Tone + angle guidance for the optional LLM path. */
  angle: string;
};

// One straightforward copy set shared by every persona (the persona structure
// stays so per-segment tuning later is a one-line change).
const INTRO_COPY: TrackCopy = {
  subject: "We buy trucking companies — intro for {company}",
  subjectFallback: "We buy trucking and transport companies",
  body: `Hi,

I'm Luka with Veritor Group. We buy trucking and transport companies with active MC authority — companies like {company}.

{milestone}The process is simple: we look up your DOT, value the company, and make an offer. Closing is fast, in person or fully online.

What we look for and how it works: {website}

If selling could interest you once you cross that mark — or you want to know what your company is worth — reply to this email. Confidential, no obligation.

Luka
Veritor Group`,
};

const OFFER_COPY: TrackCopy = {
  subject: "Are you open to selling {company}?",
  subjectFallback: "Are you open to selling your trucking company?",
  body: `Hi,

I'm Luka with Veritor Group. We buy trucking and transport companies with active MC authority — companies like {company}.

{milestone}The process is simple: we look up your DOT, value the company, and make you an offer. If you accept, closing is fast — in person or fully online.

What we look for and how it works: {website}

If you'd consider selling, reply to this email and I'll take it from there. Confidential, no obligation.

Luka
Veritor Group`,
};

const SHARED_ANGLE =
  "Straightforward, zero fluff, no flattery. State plainly: we buy trucking and transport companies with active MC authority; the process is simple (DOT lookup, valuation, offer); closing is fast, in person or fully online; requirements on the website; reply to get in touch; confidential, no obligation. NEVER state a dollar figure. INTRO track (approaching 180d): brief introduction + the milestone + invite contact. OFFER track (past 180d): direct interest — if they'd consider selling, get in touch.";

export const OUTREACH_TEMPLATES: Record<PersonaKey, OutreachTemplate> = {
  owner_operator: {
    key: "owner_operator",
    label: "Owner-operator (1–5 trucks)",
    intro: INTRO_COPY,
    offer: OFFER_COPY,
    subjectHint: "Are you open to selling {company}?",
    angle: SHARED_ANGLE,
  },
  small_fleet: {
    key: "small_fleet",
    label: "Small fleet (6–20 trucks)",
    intro: INTRO_COPY,
    offer: OFFER_COPY,
    subjectHint: "Are you open to selling {company}?",
    angle: SHARED_ANGLE,
  },
  default: {
    key: "default",
    label: "Default",
    intro: INTRO_COPY,
    offer: OFFER_COPY,
    subjectHint: "Are you open to selling {company}?",
    angle: SHARED_ANGLE,
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

// ---------------------------------------------------------------------------
// Company-name formatting. FMCSA registry names are ALL CAPS and often long.
// ---------------------------------------------------------------------------

// Tokens kept fully uppercase when title-casing.
const KEEP_UPPER = new Set([
  "LLC", "L.L.C.", "INC", "INC.", "CORP", "CORP.", "LTD", "LTD.", "CO", "CO.",
  "LP", "LLP", "PLLC", "PC", "USA", "US", "DBA",
]);
// Lowercase connectors (unless the first word).
const KEEP_LOWER = new Set(["AND", "OF", "THE", "FOR"]);

/** "SOMTHING MOORE TOWING AND ROADSIDE ASSISTANCE" -> "Somthing Moore Towing and Roadside Assistance"; "SMT TRANSPORT LLC" -> "SMT Transport LLC". */
export function cleanCompanyName(raw: string | null | undefined): string | null {
  const s = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!s) return null;
  const words = s.split(" ").map((w, i) => {
    const upper = w.toUpperCase();
    if (KEEP_UPPER.has(upper)) return upper;
    if (i > 0 && KEEP_LOWER.has(upper)) return upper.toLowerCase();
    // Short vowel-less tokens or ones with digits/& are initialisms: SMT, K&R, C2C.
    if (upper.length <= 4 && (/[&0-9]/.test(upper) || !/[AEIOUY]/.test(upper))) {
      return upper;
    }
    return upper.charAt(0) + upper.slice(1).toLowerCase();
  });
  return words.join(" ");
}

// A name longer than this reads badly in a subject line — use the fallback.
const MAX_SUBJECT_NAME_LEN = 34;

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
  return (
    cleanCompanyName(f.dbaName) ?? cleanCompanyName(f.legalName) ?? "your company"
  );
}

function offerLine(f: DraftFacts): string {
  if (f.offerLow != null && f.offerHigh != null) {
    return `$${f.offerLow.toLocaleString("en-US")}–$${f.offerHigh.toLocaleString("en-US")}`;
  }
  return "";
}

// The timing paragraph (own paragraph; ends with a blank line when present).
function milestoneLine(track: TrackKey, f: DraftFacts): string {
  if (track === "offer") {
    return "Your authority is past the 180-day mark — the point where it's worth the most to a buyer.\n\n";
  }
  if (f.daysTo180 != null && f.daysTo180 > 0) {
    return `Your authority reaches the 180-day mark in about ${f.daysTo180} days. That's when companies like yours are worth the most to buyers, and when we make offers.\n\n`;
  }
  return "Your authority is approaching the 180-day mark. That's when companies like yours are worth the most to buyers, and when we make offers.\n\n";
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
    `- 60–110 words. Plain, direct, zero fluff or flattery. No hype, no emojis, no markdown.`,
    `- One clear, low-pressure call to action (reply to this email).`,
    `- Do NOT add a signature, address, or unsubscribe text — those are appended automatically.`,
    `- Output STRICT JSON only: {"subject": string, "body": string}. No prose outside the JSON.`,
  ].join("\n");

  const user = [
    `PERSONA: ${persona.label}`,
    `TRACK: ${track === "offer" ? "OFFER — past the 180-day mark; direct, offer-style but no figure" : "INTRO — approaching the 180-day mark; brief introduction"}`,
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
      ? `- Status: past the 180-day mark (Amazon Relay-eligible authority).`
      : f.daysTo180 != null && f.daysTo180 > 0
        ? `- Status: ~${f.daysTo180} days from the 180-day mark.`
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
  const subject =
    company !== "your company" && company.length <= MAX_SUBJECT_NAME_LEN
      ? copy.subject.replaceAll("{company}", company)
      : copy.subjectFallback;
  return { subject, body };
}

// Plain-text -> branded-shell HTML body (paragraphs). The shell + CAN-SPAM
// footer + unsubscribe are added by the sender. Exposed here so drafting and
// sending agree on rendering. `formatAddressOneLine` is re-exported for callers
// that need the postal address inline.
export { formatAddressOneLine };
