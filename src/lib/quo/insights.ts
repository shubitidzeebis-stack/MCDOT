// Call insights — turns a Quo call transcript into a structured deal brief
// and pushes it to where Lukas actually works:
//
//   1. A "Quo AI" comment on the matched lead (summary + key facts like bank,
//      factoring company, Amazon Relay status — flagged by importance).
//   2. Rows in lead_action_items for the commitments made on the call ("send
//      the BoS", "call back Tuesday") — surfaced as a to-do list on /admin.
//
// Extraction runs through Claude (claude-opus-5) with a structured-output
// schema, NOT Quo's own generic summary: Quo's summarizer doesn't know that
// "Chase" and "OTR factoring" are deal-critical while small talk isn't.
//
// Idempotency: quo_calls.insights_at is an atomic claim (see calls.ts) —
// webhook retries and event races can call processCallInsights() any number
// of times, but only the first eligible call does work. On an extraction
// failure the claim is released (attempt counted, error stored) and the
// error rethrown. Retries are the cron sweep's job (sweepCallInsights below),
// NOT the webhook's: letting the webhook 500 on extraction failures tripped
// Quo's auto-disable on 2026-08-18 and silently killed all call ingestion.
//
// Key: ANTHROPIC_API_KEY_CALLS, falling back to ANTHROPIC_API_KEY_OUTREACH
// (same per-feature-key convention as chat/outreach; add the dedicated key in
// Vercel when call volume makes separate spend tracking worth it).

import Anthropic from "@anthropic-ai/sdk";
import { addValuationComment } from "@/lib/db/valuations";
import {
  claimCallForInsights,
  claimMissedCallComment,
  listInsightsCandidates,
  listMissedCommentCandidates,
  releaseInsightsClaim,
  saveCallInsights,
  type InsightsCall,
} from "@/lib/db/calls";
import { addActionItems } from "@/lib/db/action-items";

const MODEL = "claude-opus-5";
// Hard cap on transcript characters sent to the model — a multi-hour call
// would otherwise blow the request. ~60k chars ≈ well within limits.
const MAX_TRANSCRIPT_CHARS = 60_000;

export type CallFact = {
  label: string;
  value: string;
  importance: "high" | "normal";
};

export type CallActionItem = {
  owner: "lukas" | "donnie" | "seller" | "other";
  text: string;
  /** Verbatim time reference from the call ("Tuesday 3pm"), or "". */
  due: string;
};

export type CallInsights = {
  substantive: boolean;
  summary: string;
  facts: CallFact[];
  action_items: CallActionItem[];
};

const INSIGHTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["substantive", "summary", "facts", "action_items"],
  properties: {
    substantive: {
      type: "boolean",
      description:
        "false when there was no real conversation: voicemail tag, wrong number, dropped call, pure phone-tag",
    },
    summary: {
      type: "string",
      description:
        "2-4 plain sentences, outcome first. What was discussed and where the deal stands.",
    },
    facts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value", "importance"],
        properties: {
          label: { type: "string", description: 'e.g. "Bank", "Factoring", "Amazon Relay"' },
          value: { type: "string" },
          importance: { type: "string", enum: ["high", "normal"] },
        },
      },
    },
    action_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["owner", "text", "due"],
        properties: {
          owner: { type: "string", enum: ["lukas", "donnie", "seller", "other"] },
          text: { type: "string" },
          due: {
            type: "string",
            description: 'verbatim time reference from the call, or "" when none',
          },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `You turn phone-call transcripts into structured deal notes for Veritor Group.

Context: Veritor Group helps owners of small US trucking companies sell their company (the MC/DOT authority entity). Lukas runs the business; Donnie is the agent who makes and takes calls. The other party is almost always the owner of a trucking company who requested a valuation (the "seller"). Veritor is never the buyer — it facilitates the sale to a separate buyer.

You receive one call transcript (automatic speech recognition — expect mis-hearings, especially of company names and numbers). Produce JSON per the schema.

facts — concrete, deal-relevant statements only. The ones that matter most:
- Bank the company uses (e.g. "Chase") — needed for the closing paperwork. importance: high.
- Factoring company (e.g. "OTR", "TAFS", "RTS") and whether there's an open factoring balance. importance: high.
- Amazon Relay: whether the account is active, its standing, which entity holds it. importance: high.
- Liens, loans, UCC filings, unpaid balances. importance: high.
- Price expectations, reactions to the offer range, competing offers. importance: high.
- Insurance status/carrier, fleet size (trucks/trailers, owned vs leased), drivers. importance: normal (high if it changes the deal).
- Timeline to sell, reason for selling, availability. importance: normal.
- Corrections to contact info (better phone, email, who actually decides). importance: normal.
Never invent facts. If a name or number is unclear in the transcript, give your best reading followed by "(unclear)". Leave out anything that is just small talk.

action_items — ONLY commitments actually made on the call or clearly agreed next steps. Attribute the owner:
- "lukas" — things Lukas must do (send the Bill of Sale, review something, approve, wire).
- "donnie" — the agent's follow-ups (call back, resend info).
- "seller" — what the other party promised (send documents, talk to partner, decide by a date).
- "other" — anything else.
"due" is the verbatim time reference from the call ("Tuesday around 3", "end of the week"), or "" when none was given.

substantive — false when the call contained no real conversation (voicemail greeting only, wrong number, instant hang-up). When false, keep summary to one short sentence and leave facts/action_items empty.`;

type DialogueEntry = {
  content?: unknown;
  identifier?: unknown;
  userId?: unknown;
};

/** Render Quo's dialogue array into a readable speaker-labeled script. */
export function renderDialogue(dialogue: unknown): string {
  if (!Array.isArray(dialogue)) return "";
  const lines: string[] = [];
  let lastSpeaker = "";
  for (const raw of dialogue as DialogueEntry[]) {
    const content = typeof raw?.content === "string" ? raw.content.trim() : "";
    if (!content) continue;
    // Our side carries a Quo userId; the carrier side doesn't.
    const speaker = raw?.userId
      ? "Veritor (agent)"
      : `Caller${typeof raw?.identifier === "string" ? ` ${raw.identifier}` : ""}`;
    if (speaker === lastSpeaker && lines.length > 0) {
      lines[lines.length - 1] += ` ${content}`;
    } else {
      lines.push(`${speaker}: ${content}`);
      lastSpeaker = speaker;
    }
  }
  let script = lines.join("\n");
  if (script.length > MAX_TRANSCRIPT_CHARS) {
    script = `${script.slice(0, MAX_TRANSCRIPT_CHARS)}\n[... transcript truncated ...]`;
  }
  return script;
}

export async function extractCallInsights(args: {
  dialogue: unknown;
  quoSummary: unknown;
  direction: string | null;
  durationSec: number | null;
  leadName: string | null;
}): Promise<CallInsights> {
  const apiKey =
    process.env.ANTHROPIC_API_KEY_CALLS ?? process.env.ANTHROPIC_API_KEY_OUTREACH;
  if (!apiKey) throw new Error("No Anthropic key configured for call insights");

  const script = renderDialogue(args.dialogue);
  if (!script) throw new Error("Empty transcript");

  const meta = [
    args.direction ? `Direction: ${args.direction}` : null,
    args.durationSec != null ? `Duration: ${args.durationSec}s` : null,
    args.leadName ? `Matched lead (company): ${args.leadName}` : null,
    // Quo's own one-line summary is weak but occasionally disambiguates names.
    Array.isArray(args.quoSummary) && args.quoSummary.length > 0
      ? `Quo auto-summary: ${(args.quoSummary as unknown[]).filter((s) => typeof s === "string").join(" ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: INSIGHTS_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `${meta}\n\nTranscript:\n${script}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Model declined to process the transcript");
  }
  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  return JSON.parse(text) as CallInsights;
}

function ownerLabel(owner: CallActionItem["owner"]): string {
  switch (owner) {
    case "lukas":
      return "Lukas";
    case "donnie":
      return "Donnie";
    case "seller":
      return "Seller";
    default:
      return "Other";
  }
}

function minutes(sec: number | null): string {
  if (sec == null) return "";
  if (sec < 90) return `${sec}s`;
  return `${Math.round(sec / 60)} min`;
}

export function formatInsightsComment(
  insights: CallInsights,
  call: { direction: string | null; duration_sec: number | null; external_number: string | null },
): string {
  const head = [
    "📞 AI call notes",
    call.direction === "outgoing" ? "outgoing" : "incoming",
    minutes(call.duration_sec),
    call.external_number ? `with •${call.external_number.slice(-4)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const parts: string[] = [head, "", insights.summary.trim()];

  if (insights.facts.length > 0) {
    parts.push("", "Key facts:");
    for (const f of insights.facts) {
      const mark = f.importance === "high" ? "‼️" : "•";
      parts.push(`${mark} ${f.label}: ${f.value}`);
    }
  }

  if (insights.action_items.length > 0) {
    parts.push("", "To-do:");
    for (const a of insights.action_items) {
      const due = a.due ? ` (${a.due})` : "";
      parts.push(`→ ${ownerLabel(a.owner)}: ${a.text}${due}`);
    }
  }

  parts.push("", "AI-written from the call transcript — verify specifics in Calls.");
  return parts.join("\n");
}

/**
 * Generate + persist insights for one call, if it's eligible and unclaimed.
 * Safe to call on every webhook event for the call — returns false when there
 * is nothing to do. Throws on extraction failure, after releasing the claim
 * WITH the attempt counted — callers decide what a failure means (the admin
 * endpoint surfaces it; the webhook and the cron sweep log and move on).
 */
export async function processCallInsights(callId: string): Promise<boolean> {
  const call = await claimCallForInsights(callId);
  if (!call) return false;
  try {
    const insights = await extractCallInsights({
      dialogue: call.transcript,
      quoSummary: call.summary,
      direction: call.direction,
      durationSec: call.duration_sec,
      leadName: call.legal_name,
    });
    await saveCallInsights(callId, insights);
    if (insights.substantive && call.valuation_id != null) {
      await addValuationComment(
        call.valuation_id,
        "Quo AI",
        formatInsightsComment(insights, call),
      );
      await addActionItems(call.valuation_id, callId, insights.action_items);
    }
    return true;
  } catch (err) {
    await releaseInsightsClaim(
      callId,
      err instanceof Error ? err.message : String(err),
    );
    throw err;
  }
}

/**
 * For a missed INBOUND call matched to a lead: drop a short (non-AI) comment
 * so the lead's thread shows the attempt. Claims the same insights_at flag,
 * so a call gets either this or the AI notes, never both.
 */
export async function processMissedCallComment(callId: string): Promise<boolean> {
  const call = await claimMissedCallComment(callId);
  if (!call || call.valuation_id == null) return false;
  const vm = call.voicemail_url ? " Voicemail left — listen in Calls." : "";
  try {
    await addValuationComment(
      call.valuation_id,
      "Quo AI",
      `📞 Missed inbound call from this lead${call.external_number ? ` (•${call.external_number.slice(-4)})` : ""}.${vm}`,
    );
  } catch (err) {
    // Release so the sweep can retry — without this, a failed comment write
    // would hold the claim forever and the note would silently never appear.
    await releaseInsightsClaim(
      callId,
      err instanceof Error ? err.message : String(err),
    );
    throw err;
  }
  return true;
}

/**
 * Cron sweep: retry/backfill pending call insights and missed-call comments.
 *
 * STRICTLY SERIAL, small batch, attempt-capped. This is the deliberate
 * answer to the 2026-08-18 outage cascade: extraction failures no longer 500
 * the Quo webhook (which tripped Quo's auto-disable and killed ALL call
 * ingestion for 3 days) — instead they land here, one Claude request at a
 * time, so a backlog can never burst past the API rate limit and a
 * persistently failing call stops after MAX_INSIGHTS_ATTEMPTS.
 */
export async function sweepCallInsights(maxPerRun = 5): Promise<{
  generated: number;
  commented: number;
  failed: number;
}> {
  let generated = 0;
  let commented = 0;
  let failed = 0;

  for (const id of await listInsightsCandidates(maxPerRun)) {
    try {
      if (await processCallInsights(id)) generated += 1;
    } catch (err) {
      failed += 1;
      console.error("[sweepCallInsights] insights failed", id, err);
    }
  }

  for (const id of await listMissedCommentCandidates(maxPerRun)) {
    try {
      if (await processMissedCallComment(id)) commented += 1;
    } catch (err) {
      failed += 1;
      console.error("[sweepCallInsights] missed-call comment failed", id, err);
    }
  }

  return { generated, commented, failed };
}

/** Dry-run helper for the admin regenerate/test endpoint: extract only. */
export async function extractForCall(call: InsightsCall): Promise<CallInsights> {
  return extractCallInsights({
    dialogue: call.transcript,
    quoSummary: call.summary,
    direction: call.direction,
    durationSec: call.duration_sec,
    leadName: call.legal_name,
  });
}
