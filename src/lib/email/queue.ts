// Higher-level helpers wrapping the DB queue + sequence registry.
// Call queueSequence() the moment a trigger event happens (form submit,
// partial save, etc.). Call processQueue() from the cron route to
// actually send pending mail.

import { createHmac, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import {
  isUnsubscribed,
  listDueFollowups,
  markFailed,
  markSent,
  queueFollowup,
  type SequenceId,
} from "@/lib/db/email-followups";
import { stripCrLf } from "@/lib/security/sanitize";
import { SITE } from "@/lib/site";
import { SEQUENCES } from "./sequences";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://groupveritor.com";

// HMAC-protected one-click unsubscribe link. Never trust a querystring
// without verifying the token — anyone could otherwise unsubscribe
// arbitrary addresses.
function unsubscribeSecret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET ??
    process.env.RESEND_API_KEY ?? // fallback so dev still works
    "veritor-unsubscribe-fallback"
  );
}

export function unsubscribeToken(email: string): string {
  return createHmac("sha256", unsubscribeSecret())
    .update(email.toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubscribeToken(
  email: string,
  token: string,
): boolean {
  const expected = unsubscribeToken(email);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(token, "hex"),
    );
  } catch {
    return false;
  }
}

export function unsubscribeUrl(email: string): string {
  const token = unsubscribeToken(email);
  return `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

// ─────────────────────────────────────────────────────────────────────
// Queue API
// ─────────────────────────────────────────────────────────────────────

export async function queueSequence(params: {
  sequenceId: SequenceId;
  recipientEmail: string;
  recipientName?: string | null;
  context?: Record<string, unknown>;
  /** Anchor time the delays are computed from. Default: now. */
  anchorTime?: Date;
}): Promise<(number | null)[]> {
  const steps = SEQUENCES[params.sequenceId];
  if (!steps || steps.length === 0) return [];

  if (await isUnsubscribed(params.recipientEmail)) return [];

  const anchor = params.anchorTime ?? new Date();
  const ids: (number | null)[] = [];
  for (const step of steps) {
    const scheduledFor = new Date(anchor.getTime() + step.delayMs);
    if (scheduledFor.getTime() < Date.now() - 60_000) continue;
    const id = await queueFollowup({
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName ?? null,
      sequenceId: params.sequenceId,
      stepNumber: step.step,
      scheduledFor,
      context: params.context,
    });
    ids.push(id);
  }
  return ids;
}

// ─────────────────────────────────────────────────────────────────────
// Cron processor
// ─────────────────────────────────────────────────────────────────────

export async function processQueue(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email-followups] RESEND_API_KEY missing — skipping cron");
    return { processed: 0, sent: 0, skipped: 0, failed: 0 };
  }
  const resend = new Resend(apiKey);
  const due = await listDueFollowups(25);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of due) {
    if (await isUnsubscribed(row.recipient_email)) {
      await markSent(row.id); // mark done so we stop checking
      skipped += 1;
      continue;
    }
    const seq = SEQUENCES[row.sequence_id as SequenceId];
    const step = seq?.find((s) => s.step === row.step_number);
    if (!step) {
      await markFailed(row.id, "unknown sequence/step");
      failed += 1;
      continue;
    }
    try {
      const ctx = {
        ...((row.context as Record<string, unknown>) ?? {}),
        name: row.recipient_name ?? "",
        email: row.recipient_email,
        unsubscribeUrl: unsubscribeUrl(row.recipient_email),
      };
      const tpl = step.render(ctx);
      const { error } = await resend.emails.send({
        from: SITE.emailFrom,
        to: row.recipient_email,
        replyTo: SITE.email,
        subject: stripCrLf(tpl.subject),
        text: tpl.text,
        html: tpl.html,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl(row.recipient_email)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      if (error) throw new Error(JSON.stringify(error));
      await markSent(row.id);
      sent += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[email-followups] send failed", row.id, msg);
      await markFailed(row.id, msg.slice(0, 500));
      failed += 1;
    }
  }
  return { processed: due.length, sent, skipped, failed };
}

// ─────────────────────────────────────────────────────────────────────
// Partial-lead recovery — queues a single partial_recovery email for
// every partial_leads row that has a usable email, hasn't converted,
// and was created between 30 minutes and 24 hours ago. Idempotent via
// recovery_queued_at column.
//
// Vercel Hobby plan limits crons to once per day, so this runs inside
// the same /api/cron/process-followups endpoint as the queue processor.
// Rows queued here use anchorTime in the past so scheduled_for ~= now,
// and they're picked up in the same cron run by processQueue().
// ─────────────────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export async function recoverPartials(): Promise<{
  candidates: number;
  queued: number;
}> {
  const url = process.env.DATABASE_URL;
  if (!url) return { candidates: 0, queued: 0 };
  const sql = neon(url);

  // Idempotent migration — adds the column on first run if missing.
  try {
    await sql`ALTER TABLE partial_leads ADD COLUMN IF NOT EXISTS recovery_queued_at TIMESTAMPTZ`;
  } catch {
    // Table doesn't exist yet (no partials submitted in this env). OK.
    return { candidates: 0, queued: 0 };
  }

  const candidates = (await sql`
    SELECT session_id, email, name
      FROM partial_leads
     WHERE converted = false
       AND email IS NOT NULL
       AND email LIKE '%@%.%'
       AND recovery_queued_at IS NULL
       AND created_at <= now() - interval '30 minutes'
       AND created_at >= now() - interval '24 hours'
     ORDER BY created_at
     LIMIT 50
  `) as Array<{ session_id: string; email: string; name: string | null }>;

  let queued = 0;
  for (const row of candidates) {
    try {
      const ids = await queueSequence({
        sequenceId: "partial_recovery",
        recipientEmail: row.email,
        recipientName: row.name,
        // Anchor in the past so the +30m delay puts scheduled_for ~now.
        anchorTime: new Date(Date.now() - 30 * 60 * 1000),
      });
      if (ids.length > 0) queued += 1;
      await sql`
        UPDATE partial_leads
           SET recovery_queued_at = now()
         WHERE session_id = ${row.session_id}
      `;
    } catch (err) {
      console.error("[recoverPartials]", row.session_id, err);
    }
  }

  return { candidates: candidates.length, queued };
}

// ─────────────────────────────────────────────────────────────────────
// Cron auth — Vercel injects Authorization: Bearer ${CRON_SECRET}
// on scheduled runs. Public hits without that header get 401 so
// nobody can drain the Resend budget by triggering manual cron runs.
// ─────────────────────────────────────────────────────────────────────

export function isAuthorisedCronRequest(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }
  const header = req.headers.get("authorization");
  if (!header) return false;
  return header === `Bearer ${expected}`;
}
