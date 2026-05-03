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
