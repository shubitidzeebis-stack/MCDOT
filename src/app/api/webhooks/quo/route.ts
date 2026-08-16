// Quo (formerly OpenPhone) webhook — ingest for the business line.
//
// Setup (one step, in Quo): Settings → Webhooks → Create webhook pointing at
//   https://groupveritor.com/api/webhooks/quo
// subscribed to call.completed, call.recording.completed,
// call.transcript.completed, call.summary.completed and message.received,
// scoped to the Veritor Group number. Put its signing key in the
// QUO_WEBHOOK_SECRET env var. Until that's set this endpoint returns 503 so a
// misconfiguration is loud rather than silently accepting unsigned traffic.
//
// Every inbound call is matched against our own records at ingest — see
// findLocalByContact() — so a call from a carrier already in the pipeline
// arrives pre-linked to their valuation instead of as an anonymous number.
//
// SIGNING SCHEME — legacy, on purpose. Quo also ships a beta webhook system
// (May 2026) with a different envelope (data.resource) and Standard-Webhooks
// signing (`webhook-signature` header, `whsec_…` keys) that their changelog
// says is NOT interchangeable with the legacy openphone-signature header this
// route verifies. Webhooks created in the Quo dashboard use the legacy scheme.
// If deliveries ever 401 across the board, check whether the webhook was
// recreated through the beta flow before suspecting the secret.
//
// Error handling: processing failures return 5xx so Quo redelivers (its retry
// ladder runs ~3 days and each retry is re-signed with a fresh timestamp, so
// the replay window doesn't block them). That's safe because every write here
// is an idempotent upsert — a duplicate delivery converges to the same row.
// For the same reason the webhook_events insert is a dedupe HINT, not a gate:
// if it errors we process anyway rather than risk dropping a missed call.

import { NextResponse } from "next/server";
import { verifyQuoSignature } from "@/lib/quo/verify";
import {
  processCallInsights,
  processMissedCallComment,
} from "@/lib/quo/insights";
import { recordWebhookEvent } from "@/lib/db/monitor";
import { findLocalByContact } from "@/lib/db/contact-search";
import {
  attachCallMedia,
  last10,
  upsertCall,
  upsertMessage,
} from "@/lib/db/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The insights step runs a Claude extraction inline (typically seconds, but
// give it room) — without this the platform default could cut it off mid-call.
export const maxDuration = 60;

type QuoEvent = {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Which party is the carrier (as opposed to us).
 *
 * On an inbound call `from` is them; on an outbound call `to` is them. Getting
 * this backwards would link every call to whichever lead happens to share our
 * own number — i.e. none — so it is worth being explicit rather than clever.
 */
function externalOf(obj: Record<string, unknown>): string | null {
  const direction = str(obj.direction);
  const from = str(obj.from);
  const to = str(obj.to);
  return direction === "outgoing" ? last10(to) : last10(from);
}

/**
 * Resolve a phone number to a lead. Prefers an inbound lead over a cold
 * monitor prospect: if someone is already in the pipeline, that row carries
 * their name, status and offer range, which is what the operator needs on
 * screen. Never throws — an unlinked call is still worth recording.
 */
async function linkToLead(
  external: string | null,
): Promise<{ valuationId: number | null; matchSource: string | null }> {
  if (!external) return { valuationId: null, matchSource: null };
  try {
    const matches = await findLocalByContact("phone", external);
    if (matches.length === 0) return { valuationId: null, matchSource: null };
    const lead = matches.find((m) => m.source === "lead");
    const best = lead ?? matches[0];
    return { valuationId: best.valuationId, matchSource: best.source };
  } catch (err) {
    console.error("[webhooks/quo] lead match failed", err);
    return { valuationId: null, matchSource: null };
  }
}

/**
 * Call length in seconds. The legacy webhook payload carries NO `duration`
 * field (that exists only on the REST /v1/calls object), so it is derived
 * from completedAt − answeredAt. Unanswered calls correctly stay null.
 */
function durationOf(obj: Record<string, unknown>): number | null {
  const answered = str(obj.answeredAt);
  const completed = str(obj.completedAt);
  if (!answered || !completed) return null;
  const ms = Date.parse(completed) - Date.parse(answered);
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 1000);
}

async function handleCall(obj: Record<string, unknown>): Promise<void> {
  const id = str(obj.id);
  if (!id) return;
  const external = externalOf(obj);
  const { valuationId, matchSource } = await linkToLead(external);
  await upsertCall({
    id,
    direction: str(obj.direction),
    status: str(obj.status),
    fromNumber: str(obj.from),
    toNumber: str(obj.to),
    externalNumber: external,
    quoUserId: str(obj.userId),
    answeredAt: str(obj.answeredAt),
    completedAt: str(obj.completedAt),
    durationSec: durationOf(obj),
    valuationId,
    matchSource,
  });

  // Voicemail arrives inline on the call object rather than as its own event.
  const voicemail = obj.voicemail as Record<string, unknown> | undefined;
  const voicemailUrl = voicemail ? str(voicemail.url) : null;
  if (voicemailUrl) await attachCallMedia(id, { voicemailUrl });
}

async function handleMessage(obj: Record<string, unknown>): Promise<void> {
  const id = str(obj.id);
  if (!id) return;
  const external = externalOf(obj);
  const { valuationId, matchSource } = await linkToLead(external);
  await upsertMessage({
    id,
    direction: str(obj.direction),
    status: str(obj.status),
    fromNumber: str(obj.from),
    toNumber: str(obj.to),
    externalNumber: external,
    body: str(obj.body) ?? str(obj.text),
    valuationId,
    matchSource,
  });
}

export async function POST(req: Request) {
  const secret = process.env.QUO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhooks/quo] QUO_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  // Raw body FIRST. Parsing before verifying would break the signature.
  const raw = await req.text();
  const verdict = verifyQuoSignature(
    req.headers.get("openphone-signature"),
    raw,
    secret,
  );
  if (!verdict.ok) {
    console.error("[webhooks/quo] signature rejected:", verdict.reason);
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: QuoEvent;
  try {
    event = JSON.parse(raw) as QuoEvent;
  } catch {
    // Signed but unparseable — don't ask Quo to retry, it won't get better.
    console.error("[webhooks/quo] signed payload was not JSON");
    return NextResponse.json({ ok: true, ignored: "unparseable" });
  }

  // Dedupe HINT only. recordWebhookEvent returns false for both "already
  // seen" and "insert failed", and the two must not be conflated into a 200 —
  // that would cancel Quo's retries on a transient DB blip and permanently
  // lose the event. Since every handler below is an idempotent upsert, the
  // safe posture is: process regardless, and let true duplicates converge.
  const eventId = str(event.id);
  if (eventId) await recordWebhookEvent(eventId);

  const type = str(event.type) ?? "";
  const obj = event.data?.object ?? {};

  try {
    switch (type) {
      case "call.ringing":
        await handleCall(obj);
        break;

      case "call.completed": {
        await handleCall(obj);
        const id = str(obj.id);
        if (id) {
          // Matched + missed inbound → short comment on the lead. Matched +
          // answered with the transcript already attached (events race) →
          // generate the AI notes now. Both are idempotent no-ops otherwise.
          await processMissedCallComment(id);
          await processCallInsights(id);
        }
        break;
      }

      case "call.recording.completed": {
        // Recording arrives as media[] on the call object (call id at .id);
        // keep the bare-url fallback for shape drift.
        const id = str(obj.callId) ?? str(obj.id);
        const media = Array.isArray(obj.media) ? obj.media : [];
        const first = (media[0] ?? {}) as Record<string, unknown>;
        const url = str(first.url) ?? str(obj.url);
        if (id && url) await attachCallMedia(id, { recordingUrl: url });
        break;
      }

      case "call.transcript.completed": {
        // dialogue is NULLABLE (status "absent"/"failed") — storing the whole
        // envelope in that case would render as a raw JSON dump in the UI.
        const id = str(obj.callId) ?? str(obj.id);
        if (id && obj.dialogue != null) {
          await attachCallMedia(id, { transcript: obj.dialogue });
          // The usual trigger for the AI notes: transcript is the last piece
          // needed. Throws on extraction failure → this route 500s → Quo
          // redelivers → retry. The claim inside makes duplicates safe.
          await processCallInsights(id);
        }
        break;
      }

      case "call.summary.completed": {
        const id = str(obj.callId) ?? str(obj.id);
        if (id && obj.summary != null) {
          await attachCallMedia(id, { summary: obj.summary });
          // Last-chance trigger for calls whose lead match landed after the
          // transcript did. No-op when already generated.
          await processCallInsights(id);
        }
        break;
      }

      case "message.received":
      case "message.delivered":
        await handleMessage(obj);
        break;

      default:
        // Not an error — we subscribe narrowly, but Quo may add types. Log the
        // shape once so the first real payload tells us what we're missing.
        console.log("[webhooks/quo] unhandled event type:", type);
    }
  } catch (err) {
    // 5xx on purpose: the payload is verified and parseable, so a failure
    // here is OUR side (usually a transient DB error). Quo's bounded retry
    // ladder (~3 days, re-signed each attempt) is the recovery mechanism, and
    // idempotent upserts make redelivery safe. Swallowing this would trade a
    // few retried requests for silently losing a missed call.
    console.error("[webhooks/quo] processing failed", type, err);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
