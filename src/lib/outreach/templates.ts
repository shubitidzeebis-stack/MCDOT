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

export type PersonaKey = "owner_operator" | "small_fleet" | "default";

export type OutreachTemplate = {
  key: PersonaKey;
  label: string;
  /** Subject-line hint the LLM may refine. {company} is substituted. */
  subjectHint: string;
  /** Tone + angle guidance for the LLM. REPLACE with real copy per persona. */
  angle: string;
};

export const OUTREACH_TEMPLATES: Record<PersonaKey, OutreachTemplate> = {
  owner_operator: {
    key: "owner_operator",
    label: "Owner-operator (1–5 trucks)",
    subjectHint: "A quick question about {company}",
    angle:
      "Audience: a single owner-operator who just crossed (or is about to cross) the 180-day mark and can now run Amazon Relay. Acknowledge the milestone plainly. Be warm, direct, zero corporate fluff — one person to another. The value prop: we buy the authority/LLC outright, fast close, they keep none of the admin headache. Keep it short.",
  },
  small_fleet: {
    key: "small_fleet",
    label: "Small fleet (6–20 trucks)",
    subjectHint: "Acquiring small fleets like {company}",
    angle:
      "Audience: a small fleet owner (6–20 trucks) reaching Amazon Relay eligibility. Slightly more business-like than the owner-operator note. Emphasize a clean, fast, operator-led acquisition and that we understand the asset (active authority, continuous insurance, Relay-ready). Respect their time.",
  },
  default: {
    key: "default",
    label: "Default",
    subjectHint: "Interested in acquiring {company}",
    angle:
      "Audience: a newly Relay-eligible US for-hire carrier. Professional, concise, operator-to-operator. We're an operator-led acquirer; we'd like to make an offer to buy the company/authority. Make it easy to reply.",
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
  const offer = offerLine(f);
  const milestone =
    f.eligibilityState === "eligible_now"
      ? "Now that your authority is active and Amazon Relay–eligible, "
      : "";
  const offerSentence = offer
    ? `Based on what we can see publicly, we'd be in the ${offer} range for the company/authority. `
    : "";
  const body = [
    `Hi,`,
    ``,
    `I'm with ${SITE.name}, an operator-led acquirer of US logistics LLCs. ${milestone}we'd like to make you an offer to buy ${company}.`,
    ``,
    `${offerSentence}We close fast and handle the paperwork. If you're open to it, just reply and we'll share specifics.`,
    ``,
    `Either way, congratulations on the authority — it's no small thing.`,
  ].join("\n");
  return {
    subject: persona.subjectHint.replace("{company}", company),
    body,
  };
}

// Plain-text -> branded-shell HTML body (paragraphs). The shell + CAN-SPAM
// footer + unsubscribe are added by the sender. Exposed here so drafting and
// sending agree on rendering. `formatAddressOneLine` is re-exported for callers
// that need the postal address inline.
export { formatAddressOneLine };
