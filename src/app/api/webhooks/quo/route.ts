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
// ALWAYS returns 2xx once the signature checks out, even if our own
// processing throws. Quo retries non-2xx, and a poison payload that we can't
// parse would otherwise be redelivered forever. Failures are logged instead.

import { NextResponse } from "next/server";
import { verifyQuoSignature } from "@/lib/quo/verify";
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
    durationSec: num(obj.duration),
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

  // At-least-once delivery: the PK insert is the dedupe. A replay is a no-op.
  const eventId = str(event.id);
  if (eventId) {
    const fresh = await recordWebhookEvent(eventId);
    if (!fresh) return NextResponse.json({ ok: true, duplicate: true });
  }

  const type = str(event.type) ?? "";
  const obj = event.data?.object ?? {};

  try {
    switch (type) {
      case "call.ringing":
      case "call.completed":
        await handleCall(obj);
        break;

      case "call.recording.completed": {
        // The recording can be delivered either as `media[]` on the call
        // object or as a bare url, depending on event shape.
        const id = str(obj.callId) ?? str(obj.id);
        const media = Array.isArray(obj.media) ? obj.media : [];
        const first = (media[0] ?? {}) as Record<string, unknown>;
        const url = str(first.url) ?? str(obj.url);
        if (id && url) await attachCallMedia(id, { recordingUrl: url });
        break;
      }

      case "call.transcript.completed": {
        const id = str(obj.callId) ?? str(obj.id);
        if (id) await attachCallMedia(id, { transcript: obj.dialogue ?? obj });
        break;
      }

      case "call.summary.completed": {
        const id = str(obj.callId) ?? str(obj.id);
        if (id) await attachCallMedia(id, { summary: obj.summary ?? obj });
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
    // Swallow deliberately: a retry storm is worse than a dropped event, and
    // the log tells us what to backfill.
    console.error("[webhooks/quo] processing failed", type, err);
  }

  return NextResponse.json({ ok: true });
}
