// LLM drafting for acquisition outreach. Turns a persona angle + the carrier's
// real facts into {subject, body} via the Anthropic SDK, with hard guardrails
// (no fabricated figures; offer range used verbatim if present). Falls back to
// a deterministic compliant template whenever the LLM is unavailable or returns
// something unparseable — so the pipeline never blocks on the model.
//
// Uses a SEPARATE key (ANTHROPIC_API_KEY_OUTREACH) from the chat widget so
// budgets/limits are isolated. Model overridable via OUTREACH_MODEL.

import Anthropic from "@anthropic-ai/sdk";
import {
  buildDraftPrompt,
  OUTREACH_TEMPLATES,
  renderFallbackDraft,
  selectPersona,
  type DraftFacts,
  type PersonaKey,
} from "@/lib/outreach/templates";

const OUTREACH_MODEL =
  process.env.OUTREACH_MODEL || "claude-haiku-4-5-20251001";
const MAX_TOKENS = 700;

let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY_OUTREACH;
  if (!apiKey) return null;
  if (_client) return _client;
  _client = new Anthropic({ apiKey });
  return _client;
}

export type GeneratedDraft = {
  subject: string;
  body: string;
  persona: PersonaKey;
  viaLlm: boolean;
};

function extractText(content: Array<{ type: string; text?: string }>): string {
  let out = "";
  for (const b of content) {
    if (b.type === "text" && typeof b.text === "string") out += b.text;
  }
  return out.trim();
}

// Pull the first JSON object out of the model text and validate it.
function parseDraft(text: string): { subject: string; body: string } | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    const obj = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (!obj || typeof obj !== "object") return null;
    const o = obj as Record<string, unknown>;
    const subject = typeof o.subject === "string" ? o.subject.trim() : "";
    const body = typeof o.body === "string" ? o.body.trim() : "";
    if (!subject || !body) return null;
    return { subject, body };
  } catch {
    return null;
  }
}

export async function generateDraft(
  facts: DraftFacts,
  opts?: { personaKey?: PersonaKey },
): Promise<GeneratedDraft> {
  const persona = opts?.personaKey ?? selectPersona({ powerUnits: facts.powerUnits });
  const template = OUTREACH_TEMPLATES[persona];

  const client = getClient();
  if (!client) {
    const fb = renderFallbackDraft(template, facts);
    return { ...fb, persona, viaLlm: false };
  }

  try {
    const { system, user } = buildDraftPrompt(template, facts);
    const resp = await client.messages.create({
      model: OUTREACH_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    });
    const parsed = parseDraft(extractText(resp.content));
    if (parsed) return { ...parsed, persona, viaLlm: true };
  } catch (err) {
    console.error("[outreach/draft] LLM failed, using fallback", err);
  }

  const fb = renderFallbackDraft(template, facts);
  return { ...fb, persona, viaLlm: false };
}
