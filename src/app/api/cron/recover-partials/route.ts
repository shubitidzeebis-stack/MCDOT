// Vercel cron — once an hour, looks for partial form-fills that:
//   1. have a usable email
//   2. haven't converted to a full lead (converted = false)
//   3. were created between 30 minutes and 24 hours ago
//   4. haven't already been queued for the partial_recovery sequence
//
// Queues a single partial_recovery email for each, then marks the row
// so we never queue twice for the same session.
//
// We add a `recovery_queued_at` column on first run if it isn't there
// yet — keeps deploys idempotent without a separate migration.

import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { isAuthorisedCronRequest, queueSequence } from "@/lib/email/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthorisedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ ok: true, queued: 0, reason: "no DATABASE_URL" });
  }

  const sql = neon(url);

  // Idempotent migration — adds the column on first run if missing.
  await sql`
    ALTER TABLE partial_leads
      ADD COLUMN IF NOT EXISTS recovery_queued_at TIMESTAMPTZ
  `;

  // Pick eligible rows. Cap at 50 per cron run to keep the function
  // fast and bounded.
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
        anchorTime: new Date(Date.now() - 30 * 60 * 1000), // fires immediately
      });
      if (ids.length > 0) queued += 1;
      // Mark queued either way — if isUnsubscribed returned true, we
      // don't want to re-check this row every hour.
      await sql`
        UPDATE partial_leads
           SET recovery_queued_at = now()
         WHERE session_id = ${row.session_id}
      `;
    } catch (err) {
      console.error("[recover-partials]", row.session_id, err);
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    queued,
  });
}
