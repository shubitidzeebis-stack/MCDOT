// Database layer for the follow-up email queue. Two tables:
//
//  email_followups       — pending and sent rows. Cron processes due ones.
//  email_unsubscribes    — one row per opt-out address (email lower-cased).
//
// Tables auto-create on first write (see ensureTables) so deploys don't
// need a separate migration step.
//
// Graceful degradation: when no DATABASE_URL is set, all reads return
// empty and writes no-op. Letting transactional sends still work without
// a DB during local dev.

import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

export type SequenceId = "seller_nurture" | "partial_recovery";

export type FollowupRow = {
  id: number;
  recipient_email: string;
  recipient_name: string | null;
  sequence_id: SequenceId;
  step_number: number;
  scheduled_for: string;
  sent_at: string | null;
  cancelled_at: string | null;
  context: Record<string, unknown> | null;
  attempts: number;
};

let initialized = false;

function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

async function ensureTables(sql: Sql) {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS email_followups (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      recipient_email TEXT NOT NULL,
      recipient_name TEXT,
      sequence_id TEXT NOT NULL,
      step_number INTEGER NOT NULL,
      scheduled_for TIMESTAMPTZ NOT NULL,
      sent_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      cancellation_reason TEXT,
      context JSONB,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS email_followups_due_idx ON email_followups (scheduled_for) WHERE sent_at IS NULL AND cancelled_at IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS email_followups_recipient_idx ON email_followups (recipient_email)`;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS email_followups_unique_step
      ON email_followups (recipient_email, sequence_id, step_number)
      WHERE cancelled_at IS NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_unsubscribes (
      email TEXT PRIMARY KEY,
      unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      reason TEXT
    )
  `;
  initialized = true;
}

export async function isUnsubscribed(email: string): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    await ensureTables(sql);
    const rows = (await sql`
      SELECT email FROM email_unsubscribes
       WHERE email = ${email.toLowerCase()}
       LIMIT 1
    `) as Array<{ email: string }>;
    return rows.length > 0;
  } catch (err) {
    console.error("[isUnsubscribed]", err);
    return false;
  }
}

export async function unsubscribe(email: string, reason?: string) {
  const sql = getSql();
  if (!sql) return;
  try {
    await ensureTables(sql);
    await sql`
      INSERT INTO email_unsubscribes (email, reason)
      VALUES (${email.toLowerCase()}, ${reason ?? null})
      ON CONFLICT (email) DO UPDATE SET
        unsubscribed_at = now(),
        reason = COALESCE(EXCLUDED.reason, email_unsubscribes.reason)
    `;
    // Cancel any pending follow-ups for this address.
    await sql`
      UPDATE email_followups
         SET cancelled_at = now(),
             cancellation_reason = 'unsubscribed'
       WHERE recipient_email = ${email.toLowerCase()}
         AND sent_at IS NULL
         AND cancelled_at IS NULL
    `;
  } catch (err) {
    console.error("[unsubscribe]", err);
  }
}

export async function queueFollowup(params: {
  recipientEmail: string;
  recipientName?: string | null;
  sequenceId: SequenceId;
  stepNumber: number;
  scheduledFor: Date;
  context?: Record<string, unknown>;
}): Promise<number | null> {
  const sql = getSql();
  if (!sql) {
    console.warn("[queueFollowup] DB not configured — skipping");
    return null;
  }
  try {
    await ensureTables(sql);
    const rows = (await sql`
      INSERT INTO email_followups (
        recipient_email, recipient_name, sequence_id, step_number,
        scheduled_for, context
      )
      VALUES (
        ${params.recipientEmail.toLowerCase()},
        ${params.recipientName ?? null},
        ${params.sequenceId},
        ${params.stepNumber},
        ${params.scheduledFor.toISOString()},
        ${params.context ? JSON.stringify(params.context) : null}::jsonb
      )
      ON CONFLICT (recipient_email, sequence_id, step_number)
      WHERE cancelled_at IS NULL
      DO NOTHING
      RETURNING id
    `) as Array<{ id: number }>;
    return rows[0]?.id ?? null;
  } catch (err) {
    console.error("[queueFollowup]", err);
    return null;
  }
}

// Cancel any pending steps in a sequence for a recipient — used when
// the user takes the next conversion action so they don't get nagged.
export async function cancelSequence(
  recipientEmail: string,
  sequenceId: SequenceId,
  reason: string,
) {
  const sql = getSql();
  if (!sql) return;
  try {
    await ensureTables(sql);
    await sql`
      UPDATE email_followups
         SET cancelled_at = now(),
             cancellation_reason = ${reason}
       WHERE recipient_email = ${recipientEmail.toLowerCase()}
         AND sequence_id = ${sequenceId}
         AND sent_at IS NULL
         AND cancelled_at IS NULL
    `;
  } catch (err) {
    console.error("[cancelSequence]", err);
  }
}

export async function listDueFollowups(limit = 25): Promise<FollowupRow[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    await ensureTables(sql);
    const rows = (await sql`
      SELECT id, recipient_email, recipient_name, sequence_id, step_number,
             scheduled_for::text AS scheduled_for, sent_at::text AS sent_at,
             cancelled_at::text AS cancelled_at, context, attempts
        FROM email_followups
       WHERE sent_at IS NULL
         AND cancelled_at IS NULL
         AND scheduled_for <= now()
         AND attempts < 5
       ORDER BY scheduled_for
       LIMIT ${limit}
    `) as FollowupRow[];
    return rows;
  } catch (err) {
    console.error("[listDueFollowups]", err);
    return [];
  }
}

export async function markSent(id: number) {
  const sql = getSql();
  if (!sql) return;
  try {
    await sql`UPDATE email_followups SET sent_at = now() WHERE id = ${id}`;
  } catch (err) {
    console.error("[markSent]", err);
  }
}

export async function markFailed(id: number, error: string) {
  const sql = getSql();
  if (!sql) return;
  try {
    await sql`
      UPDATE email_followups
         SET attempts = attempts + 1,
             last_error = ${error}
       WHERE id = ${id}
    `;
  } catch (err) {
    console.error("[markFailed]", err);
  }
}
