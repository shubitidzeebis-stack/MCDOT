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
//
// COPY v4 — approved by Lukas 2026-08-05. Direction: friendly and direct, like
// talking to a person, and every subject leads with the selling question so
// the hook is instant. "We help you sell" is expressed as "selling to us is
// about as easy as it gets" — the helpful feeling WITHOUT broker-speak (the
// brand is the BUYER; operators-not-brokers). Kept from v2/v3: no dollar
// figures, no flattery, no em dashes, name-guarded subjects, date-based
// timing, P.S. explaining the 180-day age minimum (Amazon Relay verified
// current 2026-08-05; nominative mention only, never in the subject).
const PS_LINE =
  "P.S. 180 days matters because that's when your authority clears the age minimum the big shippers set. Amazon Relay's is the one everybody knows.";

const SHARED_MIDDLE = `I'm Luka with Veritor Group. We buy trucking and transport companies directly. No broker in the middle, so selling to us is about as easy as it gets.

Here's how it works: I look up your DOT, we put a value on the company, and I come back with a number. If you like it, most closings take 3 to 5 business days, in person or all online.`;

const INTRO_COPY: TrackCopy = {
  subject: "Would you ever sell {company}?",
  subjectFallback: "Would you ever sell your trucking company?",
  body: `Hi,

Quick question: would you ever sell the company? The reason I ask now is timing. {milestone}

${SHARED_MIDDLE}

Want to know what it's worth? Reply here, even if selling isn't on your mind yet. Costs nothing to ask, and it stays between us.

Luka
Veritor Group

${PS_LINE}`,
};

const OFFER_COPY: TrackCopy = {
  subject: "Selling {company}? I'm a buyer",
  subjectFallback: "Selling your trucking company? I'm a buyer",
  body: `Hi,

Ever thought about selling the company? Right now is actually the best time to do it. Your MC authority is past the 180-day mark, and that's when it's worth the most to a buyer.

${SHARED_MIDDLE}

Curious what it's worth? Reply here and I'll get you a number. Costs nothing to ask, and it stays between us.

Luka
Veritor Group

${PS_LINE}`,
};

const SHARED_ANGLE =
  "Friendly, direct, zero fluff, no flattery, no em dashes, contractions welcome. Subject and opener lead with the selling question. Then: I'm Luka with Veritor Group; we buy trucking and transport companies directly; no broker in the middle, selling to us is about as easy as it gets; how it works (DOT lookup, we put a value on it, I come back with a number); most closings 3 to 5 business days, in person or all online; reply-here CTA; costs nothing to ask, and it stays between us; P.S. explaining 180 days = the age minimum big shippers set (Amazon Relay as the known example, a fact about THEIR authority, never implied affiliation). NEVER state a dollar figure. Never put the company name in the body (subject only). INTRO track (approaching 180d): timing question, invite a reply even if selling isn't on their mind. OFFER track (past 180d): now is the best time.";

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
  /** ISO yyyy-mm-dd the carrier crosses 180 days — lets the timing line be a
   *  DATE, which can never go stale while a draft waits in the send queue. */
  eligibleAt: string | null;
  offerLow: number | null;
  offerHigh: number | null;
};

// Words that mark a registry name as a BUSINESS name. Sole proprietors often
// register under their own legal name, and "Are you open to selling John
// Smith?" is the single highest complaint risk in the whole system — a name
// with none of these tokens is treated as a person and replaced by the
// generic fallback (subject AND body), same as a missing name.
const COMPANY_TOKENS = new Set([
  "LLC", "L.L.C.", "INC", "INC.", "CORP", "CORP.", "LTD", "LTD.", "CO", "CO.",
  "LP", "LLP", "PLLC", "PC", "DBA", "COMPANY", "GROUP", "ENTERPRISE",
  "ENTERPRISES", "SERVICES", "SERVICE", "SONS", "BROTHERS", "BROS",
  "TRUCKING", "TRUCK", "TRUCKS", "TRANSPORT", "TRANSPORTATION", "TRANS",
  "LOGISTICS", "LOGISTIC", "FREIGHT", "EXPRESS", "CARRIER", "CARRIERS",
  "HAULING", "HAULERS", "HAUL", "HOTSHOT", "TOWING", "DELIVERY", "DELIVERIES",
  "DISPATCH", "CARGO", "SHIPPING", "MOVING", "MOVERS", "LINES", "LEASING",
  "INTERMODAL", "AUTO", "VAN",
]);

function looksLikeCompanyName(cleaned: string): boolean {
  const upper = cleaned.toUpperCase();
  if (upper.split(" ").some((w) => COMPANY_TOKENS.has(w.replace(/[.,]+$/, "")))) {
    return true;
  }
  // Glued suffixes ("TOMARLLLC") still mark a business.
  return /(LLC|INC|CORP|LTD)\.?$/.test(upper.replace(/\s+/g, ""));
}

function companyName(f: DraftFacts): string {
  const cleaned =
    cleanCompanyName(f.dbaName) ?? cleanCompanyName(f.legalName);
  if (!cleaned || !looksLikeCompanyName(cleaned)) return "your company";
  return cleaned;
}

function offerLine(f: DraftFacts): string {
  if (f.offerLow != null && f.offerHigh != null) {
    return `$${f.offerLow.toLocaleString("en-US")}–$${f.offerHigh.toLocaleString("en-US")}`;
  }
  return "";
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December",
];

// "2026-09-14" -> "September 14". String parsing on purpose — no Date object,
// no timezone drift.
function formatMonthDay(iso: string | null): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return null;
  const month = MONTHS[Number(m[2]) - 1];
  const day = Number(m[3]);
  if (!month || !day) return null;
  return `${month} ${day}`;
}

// The timing sentence for the INTRO opener ({milestone} slot mid-paragraph).
// It must never be wrong: prefer the exact DATE the carrier crosses 180 days
// (immune to queue delay); fall back to a rounded bucket, never a raw day
// count that drifts stale while a draft waits. OFFER carries its own static
// timing line in the body, so it gets an empty string.
function milestoneLine(track: TrackKey, f: DraftFacts): string {
  if (track === "offer") return "";
  const tail = "and that's the point where it's worth the most to a buyer.";
  const date = formatMonthDay(f.eligibleAt);
  if (date) {
    return `Your MC authority hits the 180-day mark on ${date}, ${tail}`;
  }
  if (f.daysTo180 != null && f.daysTo180 > 0) {
    const bucket =
      f.daysTo180 <= 10
        ? "about a week"
        : f.daysTo180 <= 18
          ? "about two weeks"
          : f.daysTo180 <= 25
            ? "about three weeks"
            : f.daysTo180 <= 40
              ? "about a month"
              : "about two months";
    return `Your MC authority hits the 180-day mark in ${bucket}, ${tail}`;
  }
  return `Your MC authority is coming up on the 180-day mark, ${tail}`;
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

// ---------------------------------------------------------------------------
// The single follow-up touch (touch 2) — sent once, ~8 days after the first
// email, ONLY while no human outcome is recorded. Two variants:
//   crossed: the first email went out while they were APPROACHING 180 and
//            they have since crossed it — the strongest possible reason to
//            write twice.
//   generic: a short polite nudge with an explicit easy-out.
// Deliberately shorter than the first email, no links in the body (the footer
// carries the unsubscribe), no P.S. — a follow-up must read like a person
// checking back, not a campaign.
// ---------------------------------------------------------------------------
export type FollowUpVariant = "crossed" | "generic";

const FOLLOWUP_CROSSED: TrackCopy = {
  subject: "Selling {company}? It's past 180 now",
  subjectFallback: "Selling? Your authority is past 180 now",
  body: `Hi,

I wrote a few weeks back, before your MC authority hit 180 days. You've crossed it now, and that's when the company is worth the most to a buyer. If you ever wanted to sell, this is the moment to find out what it's worth.

Reply here and I'll get you a number. Costs nothing to ask, and it stays between us.

Luka
Veritor Group`,
};

const FOLLOWUP_GENERIC: TrackCopy = {
  subject: "Still open to selling {company}?",
  subjectFallback: "Still open to selling?",
  body: `Hi,

Just circling back on my note about buying your trucking company. If it's a no, no worries at all, I won't keep bugging you. But if you're even a little curious what it's worth, reply here and I'll get you a number.

Luka
Veritor Group`,
};

export function renderFollowUpDraft(
  variant: FollowUpVariant,
  f: DraftFacts,
): { subject: string; body: string } {
  const company = companyName(f);
  const copy = variant === "crossed" ? FOLLOWUP_CROSSED : FOLLOWUP_GENERIC;
  const subject =
    company !== "your company" && company.length <= MAX_SUBJECT_NAME_LEN
      ? copy.subject.replaceAll("{company}", company)
      : copy.subjectFallback;
  return { subject, body: copy.body };
}

// ---------------------------------------------------------------------------
// Winding-down track (v4, approved 2026-08-05) — first touch for carriers with
// ACTIVE authority but LAPSED insurance. Often an owner shutting the business
// down: the authority still has sale value, and FMCSA revocation is coming.
// The observation is public FMCSA record, the urgency is real, and the
// "just switching insurers" line is the graceful out for the mid-switch
// minority. Same guards as everything else.
// ---------------------------------------------------------------------------
const WINDING_DOWN_COPY: TrackCopy = {
  subject: "Winding down {company}? Sell it instead",
  subjectFallback: "Winding down? Sell it instead",
  body: `Hi,

Noticed your liability insurance dropped off the FMCSA record. If you're getting out of trucking, don't just let the MC die. Sell it. It's worth real money to a buyer while it's still active. Once FMCSA pulls it, it's worth nothing.

I'm Luka with Veritor Group. We buy trucking companies all the time, a lot of them from owners who are calling it quits. No brokers, no middlemen, we're the actual buyer.

It's simple: I look up your DOT, we put a value on the company, and I come back with a number. If you like it, we can close in 3 to 5 days, all online if that's easier.

Just switching insurance companies? Then ignore me, no worries. But if you're done with it, reply before the authority goes and I'll get you that number. Costs nothing to ask, and it stays between us.

Luka
Veritor Group`,
};

export function renderWindingDownDraft(f: DraftFacts): {
  subject: string;
  body: string;
} {
  const company = companyName(f);
  const subject =
    company !== "your company" && company.length <= MAX_SUBJECT_NAME_LEN
      ? WINDING_DOWN_COPY.subject.replaceAll("{company}", company)
      : WINDING_DOWN_COPY.subjectFallback;
  return { subject, body: WINDING_DOWN_COPY.body };
}

// Plain-text -> branded-shell HTML body (paragraphs). The shell + CAN-SPAM
// footer + unsubscribe are added by the sender. Exposed here so drafting and
// sending agree on rendering. `formatAddressOneLine` is re-exported for callers
// that need the postal address inline.
export { formatAddressOneLine };
