// Resend webhook — the cold-outreach deliverability safety net.
//
// On a hard bounce or spam complaint it (1) suppresses the address forever via
// the shared unsubscribe list, (2) logs it to agent_actions, and (3) trips the
// outreach circuit breaker + Slack-alerts if complaints/bounces spike past the
// cold-email ceilings. The sender refuses to send while the breaker is tripped.
//
// Setup (one step, in the Resend dashboard): create a webhook to
//   https://groupveritor.com/api/webhooks/resend
// subscribed to email.bounced + email.complained, and set its signing secret as
// the RESEND_WEBHOOK_SECRET env var. Until that's set this endpoint returns 503.

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { unsubscribe } from "@/lib/db/email-followups";
import {
  getOutreachHealth,
  isOutreachPaused,
  logAgentAction,
  recordWebhookEvent,
  setOutreachPaused,
} from "@/lib/db/monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cold-email reputation ceilings.
const COMPLAINT_RATE_LIMIT = 0.003; // 0.3%
const BOUNCE_RATE_LIMIT = 0.05; // 5%
const MIN_SENT_FOR_RATE = 20; // don't rate-trip on tiny volume

// Verify a Resend (Svix) webhook signature. Returns true iff valid.
function verifySvix(secret: string, headers: Headers, body: string): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const sigHeader = headers.get("svix-signature");
  if (!id || !timestamp || !sigHeader) return false;
  // Replay guard: reject timestamps more than 5 minutes from now.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signed = `${id}.${timestamp}.${body}`;
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signed)
    .digest("base64");

  // svix-signature is a space-separated list of "v1,<sig>" entries.
  for (const part of sigHeader.split(" ")) {
    const sig = part.split(",")[1] ?? "";
    if (
      sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return true;
    }
  }
  return false;
}

async function slack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* best effort */
  }
}

// Trip the breaker if complaints/bounces have crossed the ceiling.
async function maybePause(): Promise<void> {
  if (await isOutreachPaused()) return;
  const { sent, bounced, complained } = await getOutreachHealth(7);
  const complaintRate = sent > 0 ? complained / sent : complained > 0 ? 1 : 0;
  const bounceRate = sent > 0 ? bounced / sent : 0;
  const tripComplaint =
    complained >= 3 ||
    (sent >= MIN_SENT_FOR_RATE && complaintRate > COMPLAINT_RATE_LIMIT);
  const tripBounce = sent >= MIN_SENT_FOR_RATE && bounceRate > BOUNCE_RATE_LIMIT;
  if (!tripComplaint && !tripBounce) return;

  const reason = tripComplaint
    ? `complaints ${complained}/${sent} (${(complaintRate * 100).toFixed(2)}%)`
    : `bounces ${bounced}/${sent} (${(bounceRate * 100).toFixed(2)}%)`;
  await setOutreachPaused(reason);
  await slack(
    `:octagonal_sign: OUTREACH AUTO-PAUSED — ${reason}. All sending halted. Resume from /admin/agent once investigated.`,
  );
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  const body = await req.text();
  if (!verifySvix(secret, req.headers, body)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let evt: {
    type?: string;
    data?: { to?: string | string[]; email?: string; bounce?: { type?: string } };
  };
  try {
    evt = JSON.parse(body) as typeof evt;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  try {
    const type = evt.type ?? "";
    const toRaw = evt.data?.to ?? evt.data?.email;
    const email = Array.isArray(toRaw) ? toRaw[0] : toRaw;

    // Idempotency: Svix delivers at-least-once. Process each delivery id once —
    // a retried event must not double-count into the auto-pause thresholds.
    const svixId = req.headers.get("svix-id") ?? "";
    if ((type === "email.complained" || type === "email.bounced") && svixId) {
      const fresh = await recordWebhookEvent(`${svixId}:${type}`);
      if (!fresh) return NextResponse.json({ ok: true, duplicate: true });
    }

    if (email && type === "email.complained") {
      await unsubscribe(email, "spam_complaint");
      await logAgentAction("outreach_complained", "resend-webhook", null, { email });
      await slack(`:rotating_light: Outreach SPAM COMPLAINT from ${email} — address suppressed.`);
      await maybePause();
    } else if (email && type === "email.bounced") {
      // Only a PERMANENT bounce (bad address) suppresses forever. A transient
      // bounce (mailbox full, greylisting) keeps the address — the prospect
      // pool is small and non-renewable, so wrongly burning addresses on soft
      // bounces destroys real targets. Both still count toward the auto-pause
      // health thresholds via the logged action.
      const bounceType = (evt.data?.bounce?.type ?? "").toLowerCase();
      const permanent = bounceType.includes("perm") || bounceType.includes("hard");
      if (permanent) await unsubscribe(email, "hard_bounce");
      await logAgentAction("outreach_bounced", "resend-webhook", null, {
        email,
        bounceType: evt.data?.bounce?.type ?? null,
        suppressed: permanent,
      });
      await maybePause();
    }
  } catch (err) {
    // Always 200 below so Resend doesn't retry-storm; we've logged the error.
    console.error("[resend-webhook] processing error", err);
  }

  return NextResponse.json({ ok: true });
}
