// Outreach persona/template registry.
//
// PLACEHOLDER COPY: the `angle` strings below are deliberately generic so the
// machinery works end-to-end today. Lukas replaces them with the real, tuned
// copy per persona once the buckets are validated — that's the only "content"
// step left. The LLM (draft.ts) turns an angle + the carrier's real facts into
// a finished email; renderFallbackDraft() produces a compliant email with no
// LLM at all (used when ANTHROPIC_API_KEY_OUTREACH is unset or the call fails).
//
// Nothing here sends mail or needs secrets — pure data + pure functions.

import { SITE, formatAddressOneLine } from "@/lib/site";

// Where every outreach email points (per Lukas: straight to the main site).
const OUTREACH_WEBSITE = "https://groupveritor.com";

export type PersonaKey = "owner_operator" | "small_fleet" | "default";

export type OutreachTemplate = {
  key: PersonaKey;
  label: string;
  /** Subject line. {company} is substituted. */
  subject: string;
  /** Real email body. {company} {milestone} {website} are substituted. */
  body: string;
  /** Subject-line hint for the optional LLM path. {company} is substituted. */
  subjectHint: string;
  /** Tone + angle guidance for the optional LLM path. */
  angle: string;
};

export const OUTREACH_TEMPLATES: Record<PersonaKey, OutreachTemplate> = {
  owner_operator: {
    key: "owner_operator",
    label: "Owner-operator (1–5 trucks)",
    subject: "Are you open to an offer for {company}?",
    body: `Hi there,

I'm Luka with Veritor Group — we buy and operate trucking companies, and {company} stood out to us.

You've built something real: an active authority with clean insurance, right at the point where a company like yours becomes most valuable to a buyer. {milestone}That timing is why I'm reaching out now, ahead of it.

I'll be straight with you — we'd like to make you an offer. We're operators, not brokers: we run these companies ourselves, we close fast, and the final steps are done whichever way suits you, in person or fully online.

Who we are, how it works, what we look for, and an estimate of what your company could be worth are all here: {website}

If the timing's interesting — or you're just curious — reply to this email and I'll take it from there. No pressure, and fully confidential.

Best,
Luka
Veritor Group`,
    subjectHint: "Are you open to an offer for {company}?",
    angle:
      "One owner-operator to another: warm, direct, no corporate fluff. We buy AND operate the company; operators not brokers; close fast; final steps in person or online. Point them to the website for who we are and an estimate of what their company is worth. NEVER state a dollar figure. Plant interest ahead of the 180-day Amazon Relay milestone.",
  },
  small_fleet: {
    key: "small_fleet",
    label: "Small fleet (6–20 trucks)",
    subject: "{company} — a quick, serious question",
    body: `Hi there,

I'm Luka with Veritor Group — we buy and operate trucking companies, and the operation you've built at {company} caught our attention.

You've scaled a real fleet with a team and clean insurance, right at the point where a business like yours becomes most valuable to a buyer. {milestone}That's why I'm reaching out now, ahead of it.

I'll be straight with you — we'd like to make you an offer. We're operators, not brokers: we run these companies ourselves, we close fast, and we keep it discreet so nothing disrupts your drivers or your day-to-day. The final steps are done whichever way suits you, in person or fully online.

Who we are, how it works, what we look for, and an estimate of what your company could be worth are all here: {website}

If the timing's interesting — or you're just curious — reply to this email and I'll take it from there. No pressure, and fully confidential.

Best,
Luka
Veritor Group`,
    subjectHint: "{company} — a quick, serious question",
    angle:
      "Small-fleet owner (6–20 trucks): a touch more business-like, respect their time. We buy and operate; operators not brokers; fast and discreet close that won't disrupt drivers; in person or online. Point to the website for who we are and a worth estimate. NEVER state a dollar figure.",
  },
  default: {
    key: "default",
    label: "Default",
    subject: "Are you open to an offer for {company}?",
    body: `Hi there,

I'm Luka with Veritor Group — we buy and operate trucking companies, and {company} stood out to us.

You've built something real: an active authority with clean insurance, right at the point where a company like yours becomes most valuable to a buyer. {milestone}That timing is why I'm reaching out now.

We'd like to make you an offer. We're operators, not brokers: we run these companies ourselves, we close fast, and the final steps are done whichever way suits you, in person or fully online.

Who we are, how it works, what we look for, and an estimate of what your company could be worth are all here: {website}

If you're open to it — or just curious — reply to this email and I'll take it from there. No pressure, and fully confidential.

Best,
Luka
Veritor Group`,
    subjectHint: "Are you open to an offer for {company}?",
    angle:
      "Newly Relay-eligible for-hire carrier: professional, concise, operator-to-operator. We buy and operate; operators not brokers; close fast; in person or online. Point to the website for who we are and a worth estimate. NEVER state a dollar figure.",
  },
};

export function selectPersona(input: {
  powerUnits: number | null;
}): PersonaKey {
  if (input.powerUnits != null && input.powerUnits >= 6) return "small_fleet";
  if (input.powerUnits != null && input.powerUnits >= 1) return "owner_operator";
  return "default";
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

// Build the system + user prompt for the LLM. Pure — no I/O.
export function buildDraftPrompt(
  persona: OutreachTemplate,
  f: DraftFacts,
): { system: string; user: string } {
  const offer = offerLine(f);
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

// Deterministic, compliant fallback used when the LLM is unavailable. Clearly
// generic — Lukas's real copy lives in `angle` and flows through the LLM.
export function renderFallbackDraft(
  persona: OutreachTemplate,
  f: DraftFacts,
): { subject: string; body: string } {
  const company = companyName(f);
  const milestone =
    f.eligibilityState === "eligible_now"
      ? "You've just crossed the 180-day mark that makes carriers Amazon Relay–eligible — exactly when demand for an authority like yours peaks. "
      : f.daysTo180 != null && f.daysTo180 > 0
        ? `You're about ${f.daysTo180} days from the 180-day mark that makes carriers Amazon Relay–eligible — exactly when demand for an authority like yours peaks. `
        : "";
  const body = persona.body
    .replaceAll("{company}", company)
    .replaceAll("{milestone}", milestone)
    .replaceAll("{website}", OUTREACH_WEBSITE);
  const subject = persona.subject.replaceAll("{company}", company);
  return { subject, body };
}

// Plain-text -> branded-shell HTML body (paragraphs). The shell + CAN-SPAM
// footer + unsubscribe are added by the sender. Exposed here so drafting and
// sending agree on rendering. `formatAddressOneLine` is re-exported for callers
// that need the postal address inline.
export { formatAddressOneLine };
