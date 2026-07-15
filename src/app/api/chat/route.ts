// Customer chat widget — Server-Sent Events streaming endpoint.
// Spec: docs/chat-widget-spec.md §1 + §10-12 in the Veritor-Jarvis repo
// (commit d5149e0).
//
// Critical contract: the client sends ONE new user message per request.
// History is reconstructed server-side from chat_messages keyed by
// sessionId. This is the anti-fabrication defense — without it a
// malicious client could inject a fake prior assistant turn that "said"
// $200K for any MC, and Claude would honour the framing. See spec §1.
//
// Defense in depth: Edge Config kill switch → schema validation →
// length cap → Turnstile → rate limit → server-canonical history →
// 500-token output cap → prompt caching → SHA256-hashed IPs in logs.
//
// Streaming: Node runtime (not Edge) because chat.ts uses node:crypto.
// Web ReadableStream emits SSE frames; persistence runs on stream
// completion, not per delta, so the assistant turn is still saved even
// if the client disconnects mid-stream.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  appendMessage,
  ensureSession,
  getHistory,
  getSession,
  hashIp,
  markHandedOff,
  updateCaptured,
} from "@/lib/db/chat";
import { getFlag } from "@/lib/flags";
import {
  TURN_CAP,
  detectCapturedFields,
  detectHandoff,
  type HandoffKind,
} from "@/lib/chat/handoff";
import { getSystemPrompt } from "@/lib/chat/system-prompt";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 500;
const MESSAGE_MAX_LEN = 2000;
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// UUID v4 regex — strict, rejects v1/v3/v5 etc.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RequestSchema = z.object({
  message: z.string().min(1).max(MESSAGE_MAX_LEN),
  sessionId: z.string().regex(UUID_V4),
  turnstileToken: z.string().min(1),
  locale: z.enum(["en", "es", "ru"]).default("en"),
});

// Single SDK instance per cold start.
let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY_CHAT });
  return _client;
}

// Helper to wrap an SSE frame.
function sse(event: object): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: Request) {
  // 1. Kill switch — server-side. A stale client whose Edge Config flag
  //    is stale will hit this and get 404, can't keep hammering Claude.
  const enabled = await getFlag("chatWidgetEnabled");
  if (!enabled) {
    return new Response("Not Found", { status: 404 });
  }

  // 2. Validate body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Invalid request");
  }
  const { message, sessionId, turnstileToken, locale } = parsed.data;

  // 3. Rate limit — per hashed IP.
  const ip = getClientIp(req);
  const ipHashed = hashIp(ip);
  const limit = await rateLimit(`chat:${ipHashed}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return new Response(JSON.stringify({ error: "Rate limit" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": Math.ceil(limit.resetIn / 1000).toString(),
      },
    });
  }

  // 4. Turnstile — returns ok with "no-secret-configured" until the
  //    secret is wired up in Vercel. Same forgiveness pattern as the
  //    contact form so dev/preview don't break before keys are set.
  const captcha = await verifyTurnstile(turnstileToken, ip);
  if (!captcha.ok) {
    return jsonError(400, "Security check failed");
  }

  // 5. Ensure session row + load server-canonical history. ensureSession
  //    is idempotent — first call creates the row, subsequent calls are
  //    no-ops. Then check turn count for the cap.
  const userAgent = req.headers.get("user-agent") ?? "";
  await ensureSession({ sessionId, locale, ipHash: ipHashed, userAgent });

  const session = await getSession(sessionId);
  const turnCount = session?.turn_count ?? 0;
  const atTurnCap = turnCount >= TURN_CAP;

  const history = await getHistory(sessionId);

  // 6. Persist the new user message BEFORE streaming. If the stream
  //    fails midway, we still have a record of what the user said —
  //    history reconstruction on retry stays coherent.
  await appendMessage({
    sessionId,
    role: "user",
    content: message,
  });

  // 7. Detect handoff *after* persisting but *before* streaming — the
  //    kind is known up front and the SSE event can be sent on stream
  //    completion. Turn-cap takes precedence over phrase-based triggers.
  let handoff: HandoffKind | null = atTurnCap ? "turn_cap" : detectHandoff(message, locale);

  // 8. Stream from Claude. System prompt is marked for prompt caching
  //    so the same system text doesn't get billed per turn — significant
  //    cost saving when conversations get long.
  const client = getClient();
  const systemText = getSystemPrompt(locale);
  const turnCapInstruction =
    "The conversation has reached its length cap. Politely invite the visitor to leave their email and MC number so Luka can follow up personally, then stop.";

  const claudeMessages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: object) => controller.enqueue(encoder.encode(sse(e)));
      let assistantText = "";
      let inputTokens: number | undefined;
      let outputTokens: number | undefined;

      try {
        const claudeStream = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: [
            {
              type: "text",
              text: systemText,
              cache_control: { type: "ephemeral" },
            },
            // If at turn cap, append a one-shot wrap-up instruction.
            ...(atTurnCap
              ? [{ type: "text" as const, text: turnCapInstruction }]
              : []),
          ],
          messages: claudeMessages,
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            assistantText += event.delta.text;
            send({ type: "delta", text: event.delta.text });
          }
        }

        const final = await claudeStream.finalMessage();
        inputTokens = final.usage?.input_tokens;
        outputTokens = final.usage?.output_tokens;

        // Persist assistant turn on stream completion (not per delta).
        // If the client disconnected mid-stream we still save what we
        // accumulated — history reconstruction stays coherent.
        if (assistantText.length > 0) {
          await appendMessage({
            sessionId,
            role: "assistant",
            content: assistantText.slice(0, 7900), // belt for CHECK constraint
            tokensIn: inputTokens,
            tokensOut: outputTokens,
          });
        }

        // Fire handoff event after the response text streams. Then run
        // detectCapturedFields ONLY when the session is in a handoff
        // context (per spec §8 gating) — prevents casual mentions like
        // "my friend has MC 123456" from polluting captured_mc.
        if (handoff) {
          send({ type: "handoff", kind: handoff });
          await markHandedOff(sessionId);
          const captured = detectCapturedFields(message);
          if (captured.email || captured.mc) {
            await updateCaptured({
              sessionId,
              email: captured.email,
              mc: captured.mc,
            });
          }
        } else if (session?.handed_off) {
          // Already in handoff state from a prior turn — gate still
          // open, so capture any newly-disclosed fields.
          const captured = detectCapturedFields(message);
          if (captured.email || captured.mc) {
            await updateCaptured({
              sessionId,
              email: captured.email,
              mc: captured.mc,
            });
          }
        }

        send({
          type: "done",
          usage:
            inputTokens != null && outputTokens != null
              ? { input_tokens: inputTokens, output_tokens: outputTokens }
              : undefined,
        });
      } catch (err) {
        console.error("[chat] stream error", err);
        send({ type: "error", message: "Upstream error" });
        // Still persist the partial assistant turn if any text streamed.
        if (assistantText.length > 0) {
          try {
            await appendMessage({
              sessionId,
              role: "assistant",
              content: assistantText.slice(0, 7900),
            });
          } catch (persistErr) {
            console.error("[chat] partial persist failed", persistErr);
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
