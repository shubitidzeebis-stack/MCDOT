// Persistence for the outbound monitoring agent that is NOT carried on the
// reused `valuations` table:
//   - monitor_cursor    : per-phase sweep checkpoint (resume across cron runs)
//   - outreach_queue     : forked from email_followups for cold acquisition
//                          sends (separate sender domain — see lib/email)
//   - agent_actions      : compliance audit trail (who/what/when)
//
// Same "no-migration" convention as valuations.ts / leads.ts: tables are
// created on first use via CREATE TABLE IF NOT EXISTS, guarded by a module
// `initialized` flag. No-ops without DATABASE_URL.

import { neon } from "@neondatabase/serverless";
import { ensureValuationsSchema } from "@/lib/db/valuations";
import type { MonitorCandidate } from "@/lib/monitor/types";

type Sql = ReturnType<typeof neon>;

let initialized = false;

function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export async function ensureMonitorTables(): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS monitor_cursor (
      id TEXT PRIMARY KEY,
      last_processed_day DATE,
      last_run_at TIMESTAMPTZ,
      last_run_summary JSONB
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS outreach_queue (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      valuation_id INT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'email',
      recipient_email TEXT,
      recipient_phone TEXT,
      persona TEXT,
      draft_subject TEXT,
      draft_body_html TEXT,
      draft_body_text TEXT,
      stage TEXT NOT NULL DEFAULT 'draft',
      approved_by TEXT,
      approved_at TIMESTAMPTZ,
      scheduled_for TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      attempts INT NOT NULL DEFAULT 0,
      last_error TEXT
    )
  `;
  // When a sender claimed the row ('approved' -> 'sending'). Lets the reaper
  // detect rows stranded mid-send by a crash/timeout.
  await sql`ALTER TABLE outreach_queue ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ`;
  // Which touch of the sequence this row is: 1 = first cold email, 2 = the
  // single follow-up. Uniqueness is per (valuation, persona, touch) so a
  // follow-up can coexist with the sent first-touch row while still making
  // duplicate sends of the SAME touch impossible. Create the new index before
  // dropping the old one so there is never an unguarded window.
  await sql`ALTER TABLE outreach_queue ADD COLUMN IF NOT EXISTS touch INT NOT NULL DEFAULT 1`;
  // Which sender identity (lowercased bare address, see outreach/senders.ts)
  // this row drafts/sends as. NULL = legacy rows and single-sender mode: the
  // env OUTREACH_EMAIL_FROM identity. Display name + per-sender cap resolve
  // from Edge Config at send time, so config edits never touch queued rows.
  await sql`ALTER TABLE outreach_queue ADD COLUMN IF NOT EXISTS sender TEXT`;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS outreach_queue_active_touch_uq
      ON outreach_queue (valuation_id, persona, touch)
      WHERE stage NOT IN ('failed', 'dead')
  `;
  await sql`DROP INDEX IF EXISTS outreach_queue_active_uq`;
  // Processed webhook deliveries (Svix at-least-once) — PK insert dedupes
  // retries so a re-delivered bounce/complaint isn't double-counted into the
  // auto-pause thresholds.
  await sql`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS outreach_queue_stage_idx ON outreach_queue (stage)`;
  await sql`
    CREATE INDEX IF NOT EXISTS outreach_queue_due_idx
      ON outreach_queue (scheduled_for) WHERE stage = 'approved'
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS agent_actions (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      valuation_id INT,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      detail JSONB
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS agent_actions_valuation_idx ON agent_actions (valuation_id)`;
  await sql`CREATE INDEX IF NOT EXISTS agent_actions_action_idx ON agent_actions (action)`;

  // Single-row circuit breaker for outbound sending. Flipped to paused=true
  // automatically by the bounce/complaint webhook; the sender refuses to send
  // while paused. Resumed manually from the admin dashboard.
  await sql`
    CREATE TABLE IF NOT EXISTS outreach_control (
      id INT PRIMARY KEY DEFAULT 1,
      paused BOOLEAN NOT NULL DEFAULT false,
      reason TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  initialized = true;
}

export type MonitorCursor = {
  id: string;
  last_processed_day: string | null;
  last_run_at: string | null;
  last_run_summary: unknown;
};

export async function getCursor(id: string): Promise<MonitorCursor | null> {
  const sql = getSql();
  if (!sql) return null;
  await ensureMonitorTables();
  const rows = (await sql`
    SELECT id, last_processed_day::text AS last_processed_day,
           last_run_at::text AS last_run_at, last_run_summary
      FROM monitor_cursor WHERE id = ${id}
  `) as MonitorCursor[];
  return rows[0] ?? null;
}

export async function setCursor(
  id: string,
  lastProcessedDay: string | null,
  summary: unknown,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureMonitorTables();
  await sql`
    INSERT INTO monitor_cursor (id, last_processed_day, last_run_at, last_run_summary)
    VALUES (${id}, ${lastProcessedDay}, now(), ${summary ? JSON.stringify(summary) : null}::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      last_processed_day = COALESCE(EXCLUDED.last_processed_day, monitor_cursor.last_processed_day),
      last_run_at = EXCLUDED.last_run_at,
      last_run_summary = EXCLUDED.last_run_summary
  `;
}

// ---------------------------------------------------------------------------
// Monitor candidates live on the shared `valuations` table (source='monitor').
// These helpers ensure the additive schema exists, then upsert/verify/list.
// ---------------------------------------------------------------------------

// Discovery upsert — idempotent on the partial unique index
// (dot_number) WHERE source='monitor'. Re-running discovery refreshes contact
// + fleet fields without creating duplicates or touching inbound rows.
export async function upsertMonitorCandidate(
  c: MonitorCandidate,
): Promise<number | null> {
  const sql = getSql();
  if (!sql) return null;
  if (!c.dotNumber) return null;
  await ensureValuationsSchema();
  const rows = (await sql`
    INSERT INTO valuations (
      source, monitor_stage, dot_number, legal_name, dba_name,
      census_email, contact_email, telephone, add_date, power_units,
      drivers_count, phy_address, outreach_channel, created_at, updated_at
    ) VALUES (
      'monitor', 'discovered', ${c.dotNumber}, ${c.legalName}, ${c.dbaName},
      ${c.email}, ${c.email}, ${c.phone}, ${c.addDate}, ${c.powerUnits},
      ${c.totalDrivers}, ${JSON.stringify(c.phyAddress)}::jsonb,
      ${c.email ? "email" : "phone"}, now(), now()
    )
    ON CONFLICT (dot_number) WHERE source = 'monitor'
    DO UPDATE SET
      legal_name = EXCLUDED.legal_name,
      dba_name = EXCLUDED.dba_name,
      census_email = EXCLUDED.census_email,
      telephone = EXCLUDED.telephone,
      -- Keep the FIRST-SEEN registration date: a later Census correction must
      -- not silently shift the carrier's 4-month floor / 180-day clock.
      add_date = COALESCE(valuations.add_date, EXCLUDED.add_date),
      power_units = EXCLUDED.power_units,
      drivers_count = EXCLUDED.drivers_count,
      phy_address = EXCLUDED.phy_address,
      updated_at = now()
    RETURNING id
  `) as Array<{ id: number }>;
  return rows[0]?.id ?? null;
}

export type MonitorVerification = {
  bipdAnchorDate: string | null;
  eligibleAt: string | null;
  daysTo180: number | null;
  eligibilityState: string;
  insuranceCurrent: boolean;
  insuranceRating: string;
  insuranceGaps: unknown;
  auditScore: string;
  acquisitionScore: number;
  authorityStatus: string | null;
  monitorStage: string;
  disqualifyReason: string | null;
};

export async function updateMonitorVerification(
  id: number,
  v: MonitorVerification,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureValuationsSchema();
  await sql`
    UPDATE valuations SET
      bipd_anchor_date = ${v.bipdAnchorDate},
      eligible_at = ${v.eligibleAt},
      days_to_180 = ${v.daysTo180},
      eligibility_state = ${v.eligibilityState},
      insurance_current = ${v.insuranceCurrent},
      insurance_rating = ${v.insuranceRating},
      insurance_gaps = ${v.insuranceGaps ? JSON.stringify(v.insuranceGaps) : null}::jsonb,
      audit_score = ${v.auditScore},
      acquisition_score = ${v.acquisitionScore},
      authority_status = ${v.authorityStatus},
      monitor_stage = ${v.monitorStage},
      disqualify_reason = ${v.disqualifyReason},
      updated_at = now()
    WHERE id = ${id} AND source = 'monitor'
  `;
}

// One-time recovery: rows disqualified UNDER THE OLD LOGIC (where a carrier
// merely absent from the FMCSA authority table was wrongly disqualified) carry
// no disqualify_reason. Reset those to 'discovered' so the fixed verify pass can
// re-classify them precisely (broker/inactive → disqualified WITH a reason;
// not-found → parked; active+insured → recovered). Genuine safety failures are
// left alone. Returns how many were re-opened.
export async function reopenStaleDisqualified(): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;
  await ensureValuationsSchema();
  const rows = (await sql`
    UPDATE valuations
       SET monitor_stage = 'discovered',
           authority_status = NULL,
           disqualify_reason = NULL,
           updated_at = now() - interval '15 days'
     WHERE source = 'monitor'
       AND monitor_stage = 'disqualified'
       AND disqualify_reason IS NULL
       AND (safety_status IS NULL OR safety_status <> 'fail')
     RETURNING id
  `) as Array<{ id: number }>;
  return rows.length;
}

// A discovered carrier that isn't in the FMCSA Carrier authority table yet.
// We do NOT disqualify it (that would permanently drop a carrier on a data
// blip) — we tag authority_status='not_found' and leave it 'discovered' so the
// verify queue retries it (at most weekly, see listMonitorForVerification).
export async function markMonitorNotFound(id: number): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureValuationsSchema();
  await sql`
    UPDATE valuations SET authority_status = 'not_found', updated_at = now()
     WHERE id = ${id} AND source = 'monitor'
  `;
}

export type MonitorVerifyTarget = {
  id: number;
  dot_number: string;
  add_date: string | null;
  power_units: number | null;
};

// Rows needing (re)verification: freshly discovered, or last touched > 14d ago.
export async function listMonitorForVerification(
  limit: number,
): Promise<MonitorVerifyTarget[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureValuationsSchema();
  // Assess freshly-discovered rows ONCE they reach the 4-month floor (carriers
  // younger than 120 days aren't worth the effort yet and stay parked), oldest
  // first so the near-180-day set fills fastest; then re-verify 'verified' rows
  // older than 14 days to refresh insurance/authority. not-found rows (absent
  // from the FMCSA authority table) are retried at most weekly rather than
  // disqualified. Terminal/in-flight stages are excluded so we never waste FMCSA
  // quota or regress an already-contacted carrier.
  const rows = (await sql`
    SELECT id, dot_number, add_date::text AS add_date, power_units
      FROM valuations
     WHERE source = 'monitor'
       AND dot_number IS NOT NULL
       AND (monitor_stage IS NULL OR monitor_stage NOT IN
            ('sent','suppressed','drafted','approved','outreach_phone','disqualified'))
       AND (
             ((monitor_stage = 'discovered' OR monitor_stage IS NULL)
                AND add_date IS NOT NULL
                AND add_date <= CURRENT_DATE - INTERVAL '120 days'
                AND (authority_status IS DISTINCT FROM 'not_found'
                     OR updated_at < now() - interval '7 days'))
             OR (monitor_stage = 'verified' AND updated_at < now() - interval '14 days')
           )
     ORDER BY (monitor_stage IS DISTINCT FROM 'discovered'), add_date ASC NULLS LAST
     LIMIT ${limit}
  `) as MonitorVerifyTarget[];
  return rows;
}

export type MonitorRow = {
  id: number;
  created_at: string;
  legal_name: string | null;
  dba_name: string | null;
  dot_number: string | null;
  mc_number: string | null;
  monitor_stage: string | null;
  add_date: string | null;
  bipd_anchor_date: string | null;
  eligible_at: string | null;
  days_to_180: number | null;
  eligibility_state: string | null;
  insurance_current: boolean | null;
  insurance_rating: string | null;
  insurance_gaps: unknown;
  audit_score: string | null;
  acquisition_score: number | null;
  ucc_status: string | null;
  ucc_rating: string | null;
  census_email: string | null;
  telephone: string | null;
  phy_address: unknown;
  power_units: number | null;
  drivers_count: number | null;
  outreach_channel: string | null;
};

// Admin work-queue ordering: hottest first (smallest positive days_to_180),
// nulls last, then by acquisition score.
export async function listMonitorCandidates(limit = 500): Promise<MonitorRow[]> {
  const sql = getSql();
  if (!sql) return [];
  // Never throw into the admin dashboard render — degrade to empty on any error.
  try {
    await ensureValuationsSchema();
    const rows = (await sql`
      SELECT id, created_at::text AS created_at, legal_name, dba_name, dot_number,
             mc_number, monitor_stage, add_date::text AS add_date,
             bipd_anchor_date::text AS bipd_anchor_date,
             eligible_at::text AS eligible_at,
             (eligible_at - CURRENT_DATE) AS days_to_180,
             CASE
               WHEN authority_status = 'not_found' THEN 'not_in_fmcsa'
               WHEN eligible_at IS NULL THEN COALESCE(eligibility_state, '(unassessed)')
               WHEN authority_status IN ('inactive', 'broker_only') THEN 'authority_inactive'
               WHEN insurance_current = false THEN 'continuity_broken'
               WHEN (eligible_at - CURRENT_DATE) > 60 THEN 'too_new'
               WHEN (eligible_at - CURRENT_DATE) > 0 THEN 'approaching'
               WHEN (eligible_at - CURRENT_DATE) >= -185 THEN 'eligible_now'
               ELSE 'aged_out'
             END AS eligibility_state,
             insurance_current, insurance_rating, insurance_gaps, audit_score,
             acquisition_score, ucc_status, ucc_rating, census_email, telephone,
             phy_address, power_units, drivers_count, outreach_channel
        FROM valuations
       WHERE source = 'monitor'
       ORDER BY (eligible_at IS NULL), eligible_at ASC,
                acquisition_score DESC NULLS LAST
       LIMIT ${limit}
    `) as MonitorRow[];
    return rows;
  } catch (err) {
    console.error("[listMonitorCandidates] error", err);
    return [];
  }
}

// Inputs needed to recompute the combined audit + acquisition score when the
// safety team enters UCC findings.
export type MonitorAuditInputs = {
  insurance_rating: string | null;
  insurance_current: boolean | null;
  eligibility_state: string | null;
  days_to_180: number | null;
  power_units: number | null;
  safety_penalty: number | null;
};

export async function getMonitorAuditInputs(
  id: number,
): Promise<MonitorAuditInputs | null> {
  const sql = getSql();
  if (!sql) return null;
  await ensureValuationsSchema();
  // Timing recomputed LIVE from eligible_at (the stored copies go stale as the
  // carrier ages) so a UCC-triggered rescore weighs current proximity, and the
  // persisted safety_penalty so the rescore can re-apply it.
  const rows = (await sql`
    SELECT insurance_rating, insurance_current,
           CASE
             WHEN eligible_at IS NULL THEN eligibility_state
             WHEN authority_status IN ('inactive', 'broker_only') THEN 'authority_inactive'
             WHEN insurance_current = false THEN 'continuity_broken'
             WHEN (eligible_at - CURRENT_DATE) > 60 THEN 'too_new'
             WHEN (eligible_at - CURRENT_DATE) > 0 THEN 'approaching'
             WHEN (eligible_at - CURRENT_DATE) >= -185 THEN 'eligible_now'
             ELSE 'aged_out'
           END AS eligibility_state,
           (eligible_at - CURRENT_DATE) AS days_to_180,
           power_units, safety_penalty
      FROM valuations WHERE id = ${id} AND source = 'monitor'
  `) as MonitorAuditInputs[];
  return rows[0] ?? null;
}

export type UccCapture = {
  uccStatus: string;
  uccRating: string;
  uccFindings: unknown;
  auditedBy: string;
  auditScore: string;
  acquisitionScore: number | null;
};

export async function recordUccFindings(
  id: number,
  c: UccCapture,
): Promise<{ ok: boolean }> {
  const sql = getSql();
  if (!sql) return { ok: false };
  await ensureValuationsSchema();
  await sql`
    UPDATE valuations SET
      ucc_status = ${c.uccStatus},
      ucc_rating = ${c.uccRating},
      ucc_findings = ${c.uccFindings ? JSON.stringify(c.uccFindings) : null}::jsonb,
      audited_by = ${c.auditedBy},
      audited_at = now(),
      audit_score = ${c.auditScore},
      acquisition_score = ${c.acquisitionScore},
      updated_at = now()
    WHERE id = ${id} AND source = 'monitor'
  `;
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Outreach queue (cold acquisition sends) — separate from the transactional
// email_followups queue because cold M&A must use the outreach sending domain.
// ---------------------------------------------------------------------------

// Candidates ready for a draft: verified, in the pre-warm/eligible window, and
// currently insured. (Channel — email vs phone — is decided by the caller.)
export type MonitorDraftTarget = {
  id: number;
  dot_number: string | null;
  mc_number: string | null;
  legal_name: string | null;
  dba_name: string | null;
  census_email: string | null;
  telephone: string | null;
  phy_address: unknown;
  power_units: number | null;
  days_to_180: number | null;
  eligibility_state: string | null;
  eligible_at: string | null;
};

export async function listMonitorForDrafting(
  limit: number,
): Promise<MonitorDraftTarget[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureValuationsSchema();
  // "Ready to email" gate. In-window is computed LIVE from eligible_at (so a
  // carrier that aged into the window since its last verify is picked up without
  // a re-verify): days_to_180 in [-185, 60] = approaching ∪ eligible_now.
  // The window opens 60 days before the 180 mark (widened from 30 on
  // 2026-08-05 per Lukas — reach first; the intro email carries the exact
  // date they cross, so early contact stays accurate).
  // Insurance: CURRENT insurance is the hard gate; history is soft — a carrier
  // insured now with green/amber/unknown history qualifies ('unknown' is the
  // normal state for a healthy new carrier that never cancelled a policy, so
  // excluding it would drop most real targets). Safety must be an explicit pass.
  const rows = (await sql`
    SELECT id, dot_number, mc_number, legal_name, dba_name, census_email,
           telephone, phy_address, power_units,
           (eligible_at - CURRENT_DATE) AS days_to_180,
           CASE
             WHEN (eligible_at - CURRENT_DATE) > 0 THEN 'approaching'
             ELSE 'eligible_now'
           END AS eligibility_state,
           eligible_at::text AS eligible_at
      FROM valuations
     WHERE source = 'monitor'
       AND monitor_stage = 'verified'
       AND eligible_at IS NOT NULL
       AND (eligible_at - CURRENT_DATE) <= 60
       AND (eligible_at - CURRENT_DATE) >= -185
       AND insurance_current = true
       AND insurance_rating IN ('green', 'amber', 'unknown')
       AND safety_status = 'pass'
     ORDER BY (eligible_at - CURRENT_DATE) ASC NULLS LAST
     LIMIT ${limit}
  `) as MonitorDraftTarget[];
  return rows;
}

// Winding-down targets: ACTIVE authority + LAPSED insurance (the main gate
// requires insurance_current = true, so these never enter the normal draft
// pass) + in-window + safety pass. Often an owner shutting down — the moment
// the "sell it before FMCSA pulls it" email lands hardest. First touch, so
// monitor_stage is still 'verified'; drafting moves it to 'drafted' exactly
// like the main pass, which keeps one-email-per-company guarantees intact.
export async function listWindingDownTargets(
  limit: number,
): Promise<MonitorDraftTarget[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureValuationsSchema();
  const rows = (await sql`
    SELECT id, dot_number, mc_number, legal_name, dba_name, census_email,
           telephone, phy_address, power_units,
           (eligible_at - CURRENT_DATE) AS days_to_180,
           CASE
             WHEN (eligible_at - CURRENT_DATE) > 0 THEN 'approaching'
             ELSE 'eligible_now'
           END AS eligibility_state,
           eligible_at::text AS eligible_at
      FROM valuations
     WHERE source = 'monitor'
       AND monitor_stage = 'verified'
       AND authority_status = 'active'
       AND insurance_current = false
       AND eligible_at IS NOT NULL
       AND (eligible_at - CURRENT_DATE) <= 60
       AND (eligible_at - CURRENT_DATE) >= -185
       AND safety_status = 'pass'
     ORDER BY (eligible_at - CURRENT_DATE) ASC NULLS LAST
     LIMIT ${limit}
  `) as MonitorDraftTarget[];
  return rows;
}

// The single follow-up touch: carriers whose first cold email went out ≥
// delayDays ago, still sitting at status 'offer_sent' (any human-recorded
// outcome — replied / interested / not interested / do-not-contact — excludes
// them automatically), with no touch-2 row ever created. intro_first says the
// first email went out BEFORE the carrier crossed 180 days, so the follow-up
// can open with "you've crossed it now".
export type FollowUpTarget = MonitorDraftTarget & {
  first_sent_at: string | null;
  intro_first: boolean | null;
  /** Sender address of the touch-1 email — the follow-up MUST come from the
   *  same persona ("I wrote a few weeks back"). NULL = legacy identity. */
  first_sender: string | null;
};

export async function listFollowUpTargets(
  limit: number,
  delayDays: number,
): Promise<FollowUpTarget[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureValuationsSchema();
  await ensureMonitorTables();
  const rows = (await sql`
    SELECT v.id, v.dot_number, v.mc_number, v.legal_name, v.dba_name,
           v.census_email, v.telephone, v.phy_address, v.power_units,
           (v.eligible_at - CURRENT_DATE) AS days_to_180,
           CASE
             WHEN (v.eligible_at - CURRENT_DATE) > 0 THEN 'approaching'
             ELSE 'eligible_now'
           END AS eligibility_state,
           v.eligible_at::text AS eligible_at,
           oq.sent_at::text AS first_sent_at,
           (v.eligible_at IS NOT NULL AND oq.sent_at::date < v.eligible_at)
             AS intro_first,
           oq.sender AS first_sender
      FROM valuations v
      JOIN outreach_queue oq
        ON oq.valuation_id = v.id
       AND oq.touch = 1
       AND oq.stage = 'sent'
       AND oq.channel = 'email'
     WHERE v.source = 'monitor'
       AND v.monitor_stage = 'sent'
       AND v.status = 'offer_sent'
       AND oq.sent_at <= now() - make_interval(days => ${delayDays})
       AND NOT EXISTS (
             SELECT 1 FROM outreach_queue x
              WHERE x.valuation_id = v.id AND x.touch >= 2
           )
     ORDER BY oq.sent_at ASC
     LIMIT ${limit}
  `) as FollowUpTarget[];
  return rows;
}

// Human-recorded outcome of an outreach conversation — the dashboard's
// Replied / Interested / Not interested / Do-not-contact buttons. Stored in
// valuations.status; anything other than 'offer_sent' takes the carrier out
// of the follow-up pool.
export const MONITOR_OUTCOMES = [
  "replied",
  "interested",
  "not_interested",
  "do_not_contact",
] as const;
export type MonitorOutcome = (typeof MONITOR_OUTCOMES)[number];

export async function setMonitorOutcome(
  valuationId: number,
  outcome: MonitorOutcome | "clear",
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureValuationsSchema();
  const status = outcome === "clear" ? "offer_sent" : outcome;
  await sql`
    UPDATE valuations
       SET status = ${status}, status_updated_at = now(), updated_at = now()
     WHERE id = ${valuationId} AND source = 'monitor'
  `;
}

export async function getOutcomeCounts(): Promise<Record<string, number>> {
  const sql = getSql();
  if (!sql) return {};
  try {
    await ensureValuationsSchema();
    return await groupCounts(
      sql,
      sql`SELECT status AS k, count(*)::int AS n
            FROM valuations
           WHERE source = 'monitor'
             AND status IN ('replied', 'interested', 'not_interested', 'do_not_contact')
           GROUP BY 1`,
    );
  } catch (err) {
    console.error("[getOutcomeCounts] error", err);
    return {};
  }
}

// Carriers awaiting the FMCSA safety enrich: in-window + verified, not yet
// safety-checked. (Not insurance-gated — enrich the whole in-window set so the
// dashboard shows complete safety data and a later insurance-gate change needs
// no re-enrich.) Hottest first.
export type MonitorSafetyTarget = {
  id: number;
  dot_number: string | null;
  // Lets the enrich fall back to QCMobile's docket endpoint now that the
  // by-DOT endpoint returns empty (post-Motus-cutover breakage).
  mc_number: string | null;
};

export async function listMonitorForSafetyEnrich(
  limit: number,
): Promise<MonitorSafetyTarget[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureValuationsSchema();
  // In-window computed LIVE from eligible_at (days_to_180 in [-185, 60]) so a
  // carrier that just aged into the window is enriched without waiting for a
  // re-verify. Hottest (closest to/just past 180) first.
  const rows = (await sql`
    SELECT id, dot_number, mc_number
      FROM valuations
     WHERE source = 'monitor'
       AND monitor_stage = 'verified'
       AND dot_number IS NOT NULL
       AND eligible_at IS NOT NULL
       AND (eligible_at - CURRENT_DATE) <= 60
       AND (eligible_at - CURRENT_DATE) >= -185
       AND safety_checked_at IS NULL
     ORDER BY (eligible_at - CURRENT_DATE) ASC NULLS LAST
     LIMIT ${limit}
  `) as MonitorSafetyTarget[];
  return rows;
}

// Persist a safety verdict. A 'fail' disqualifies the carrier; pass/review keep
// it verified. The score penalty is subtracted from acquisition_score.
export async function updateMonitorSafety(
  id: number,
  s: {
    driverOosRate: number | null;
    vehicleOosRate: number | null;
    crashTotal: number | null;
    safetyRating: string | null;
    status: "pass" | "review" | "fail";
    penalty: number;
    reasons: string[];
  },
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  try {
    await ensureValuationsSchema();
    await sql`
      UPDATE valuations
         SET safety_checked_at = now(),
             driver_oos_rate = ${s.driverOosRate},
             vehicle_oos_rate = ${s.vehicleOosRate},
             crash_total = ${s.crashTotal},
             safety_rating = ${s.safetyRating},
             safety_status = ${s.status},
             safety_findings = ${JSON.stringify(s.reasons)}::jsonb,
             safety_penalty = ${s.penalty},
             acquisition_score = GREATEST(0, COALESCE(acquisition_score, 0) - ${s.penalty}),
             monitor_stage = CASE WHEN ${s.status} = 'fail' THEN 'disqualified' ELSE monitor_stage END,
             disqualify_reason = CASE WHEN ${s.status} = 'fail' THEN 'safety_fail' ELSE disqualify_reason END,
             updated_at = now()
       WHERE id = ${id} AND source = 'monitor'
    `;
  } catch (err) {
    console.error("[updateMonitorSafety] error", err);
  }
}

export async function getSafetyStatusCounts(): Promise<Record<string, number>> {
  const sql = getSql();
  if (!sql) return {};
  try {
    await ensureValuationsSchema();
    return await groupCounts(
      sql,
      sql`SELECT COALESCE(safety_status, '(pending)') AS k, count(*)::int AS n
            FROM valuations
           WHERE source = 'monitor'
             AND eligible_at IS NOT NULL
             AND (eligible_at - CURRENT_DATE) <= 60
             AND (eligible_at - CURRENT_DATE) >= -185
           GROUP BY 1`,
    );
  } catch (err) {
    console.error("[getSafetyStatusCounts] error", err);
    return {};
  }
}

export async function setMonitorStage(
  valuationId: number,
  stage: string,
  channel?: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureValuationsSchema();
  if (channel !== undefined) {
    await sql`UPDATE valuations SET monitor_stage = ${stage}, outreach_channel = ${channel}, updated_at = now() WHERE id = ${valuationId} AND source = 'monitor'`;
  } else {
    await sql`UPDATE valuations SET monitor_stage = ${stage}, updated_at = now() WHERE id = ${valuationId} AND source = 'monitor'`;
  }
}

/**
 * Applied when the pre-draft Motus spot-check contradicts the frozen legacy
 * data (see sweep.ts pass 3). A detected insurance lapse flips
 * insurance_current=false, which removes the carrier from the normal draft
 * gate AND makes it a winding-down target (active authority + lapsed
 * insurance) — the correct track for that state. A dead authority also stamps
 * authority_status='inactive', taking it out of both tracks.
 */
export async function applyMotusDraftVerdict(
  valuationId: number,
  v: { authorityActive: boolean; insuranceActive: boolean },
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureValuationsSchema();
  await sql`
    UPDATE valuations
       SET insurance_current = ${v.insuranceActive},
           authority_status = CASE WHEN ${v.authorityActive} THEN authority_status ELSE 'inactive' END,
           updated_at = now()
     WHERE id = ${valuationId} AND source = 'monitor'
  `;
}

export async function markMonitorOfferSent(valuationId: number): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureValuationsSchema();
  // A human-recorded outcome (replied/interested/…) must survive a later send
  // (e.g. a follow-up that was already approved when the outcome was recorded).
  await sql`
    UPDATE valuations
       SET monitor_stage = 'sent',
           status = CASE
             WHEN status IN ('replied', 'interested', 'not_interested', 'do_not_contact')
               THEN status
             ELSE 'offer_sent'
           END,
           updated_at = now()
     WHERE id = ${valuationId} AND source = 'monitor'
  `;
}

export async function enqueueDraft(d: {
  valuationId: number;
  channel: string;
  recipientEmail: string | null;
  recipientPhone: string | null;
  persona: string;
  subject: string | null;
  bodyText: string | null;
  /** 1 = first cold email (default), 2 = the single follow-up touch. */
  touch?: number;
  /** Lowercased sender address the body was drafted as; null = legacy sender. */
  sender?: string | null;
}): Promise<number | null> {
  const sql = getSql();
  if (!sql) return null;
  await ensureMonitorTables();
  const touch = d.touch ?? 1;
  const sender = d.sender ?? null;
  const rows = (await sql`
    INSERT INTO outreach_queue (
      valuation_id, channel, recipient_email, recipient_phone, persona,
      draft_subject, draft_body_text, stage, touch, sender
    ) VALUES (
      ${d.valuationId}, ${d.channel}, ${d.recipientEmail}, ${d.recipientPhone},
      ${d.persona}, ${d.subject}, ${d.bodyText}, 'draft', ${touch}, ${sender}
    )
    ON CONFLICT (valuation_id, persona, touch) WHERE stage NOT IN ('failed', 'dead')
    DO UPDATE SET
      channel = EXCLUDED.channel,
      recipient_email = EXCLUDED.recipient_email,
      recipient_phone = EXCLUDED.recipient_phone,
      draft_subject = EXCLUDED.draft_subject,
      draft_body_text = EXCLUDED.draft_body_text,
      sender = EXCLUDED.sender
    WHERE outreach_queue.stage = 'draft'
    RETURNING id
  `) as Array<{ id: number }>;
  // null = the existing row is in-flight (approved/sending/sent) — caller must
  // NOT regress the carrier's stage; the draft content was left untouched.
  return rows[0]?.id ?? null;
}

export type OutreachDraftRow = {
  id: number;
  valuation_id: number;
  channel: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  persona: string | null;
  draft_subject: string | null;
  draft_body_text: string | null;
  stage: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  legal_name: string | null;
  dba_name: string | null;
  dot_number: string | null;
  acquisition_score: number | null;
};

export async function listOutreachDrafts(limit = 200): Promise<OutreachDraftRow[]> {
  const sql = getSql();
  if (!sql) return [];
  // Never throw into the admin dashboard render — degrade to empty on any error.
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      SELECT oq.id, oq.valuation_id, oq.channel, oq.recipient_email,
             oq.recipient_phone, oq.persona, oq.draft_subject, oq.draft_body_text,
             oq.stage, oq.attempts, oq.last_error,
             oq.created_at::text AS created_at,
             v.legal_name, v.dba_name, v.dot_number, v.acquisition_score
        FROM outreach_queue oq
        LEFT JOIN valuations v ON v.id = oq.valuation_id
       WHERE oq.stage IN ('draft', 'approved', 'failed')
       ORDER BY oq.created_at DESC
       LIMIT ${limit}
    `) as OutreachDraftRow[];
    return rows;
  } catch (err) {
    console.error("[listOutreachDrafts] error", err);
    return [];
  }
}

// Sent-emails log for the dashboard: every delivered outreach email, newest
// first, joined to the carrier it went to.
export type OutreachSentRow = {
  id: number;
  sent_at: string | null;
  recipient_email: string | null;
  draft_subject: string | null;
  persona: string | null;
  sender: string | null;
  legal_name: string | null;
  dba_name: string | null;
  dot_number: string | null;
};

export async function listOutreachSentRows(limit = 50): Promise<OutreachSentRow[]> {
  const sql = getSql();
  if (!sql) return [];
  // Never throw into the admin dashboard render — degrade to empty on any error.
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      SELECT oq.id, oq.sent_at::text AS sent_at, oq.recipient_email,
             oq.draft_subject, oq.persona, oq.sender,
             v.legal_name, v.dba_name, v.dot_number
        FROM outreach_queue oq
        LEFT JOIN valuations v ON v.id = oq.valuation_id
       WHERE oq.stage = 'sent'
       ORDER BY oq.sent_at DESC NULLS LAST
       LIMIT ${limit}
    `) as OutreachSentRow[];
    return rows;
  } catch (err) {
    console.error("[listOutreachSentRows] error", err);
    return [];
  }
}

export async function updateDraftContent(
  id: number,
  subject: string,
  body: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureMonitorTables();
  await sql`UPDATE outreach_queue SET draft_subject = ${subject}, draft_body_text = ${body} WHERE id = ${id} AND stage IN ('draft', 'approved', 'failed')`;
}

export async function approveOutreach(id: number, approvedBy: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureMonitorTables();
  // Stage guard prevents re-approving an already-sent/dead row (e.g. a double
  // "Send now" click on stale UI) from re-queueing a duplicate send.
  await sql`UPDATE outreach_queue SET stage = 'approved', approved_by = ${approvedBy}, approved_at = now(), scheduled_for = now() WHERE id = ${id} AND stage IN ('draft', 'approved', 'failed')`;
}

export async function discardOutreach(id: number): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureMonitorTables();
  await sql`UPDATE outreach_queue SET stage = 'dead' WHERE id = ${id}`;
}

export type DueOutreach = {
  id: number;
  valuation_id: number;
  channel: string;
  recipient_email: string | null;
  persona: string | null;
  draft_subject: string | null;
  draft_body_text: string | null;
  attempts: number;
  sender: string | null;
};

// Atomically CLAIM due rows by flipping 'approved' -> 'sending' and returning
// them in one statement. Because the UPDATE re-checks `stage='approved'` under a
// row lock, two concurrent senders (e.g. the daily cron racing a "Send now")
// can't both claim the same row — preventing duplicate emails to a prospect.
// The caller marks each 'sent' on success, or markOutreachFailed resets it.
//
// Sender filtering happens AT CLAIM TIME so rows for a sender that has hit its
// per-domain daily cap are never claimed (and never risk the stale-sending
// reaper): `excludeSenders` skips rows whose sender address is capped out;
// `includeLegacy=false` additionally skips NULL-sender (legacy-identity) rows.
export async function getDueOutreach(
  limit: number,
  opts?: { excludeSenders?: string[]; includeLegacy?: boolean },
): Promise<DueOutreach[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureMonitorTables();
  const excluded = opts?.excludeSenders ?? [];
  const includeLegacy = opts?.includeLegacy ?? true;
  // FOR UPDATE SKIP LOCKED makes the claim atomic under ANY concurrency (two
  // overlapping senders each lock disjoint rows), not just the single-statement
  // HTTP path. claimed_at lets the reaper spot rows stranded mid-send.
  const rows = (await sql`
    UPDATE outreach_queue SET stage = 'sending', claimed_at = now()
     WHERE id IN (
       SELECT id FROM outreach_queue
        WHERE stage = 'approved' AND channel = 'email'
          AND (scheduled_for IS NULL OR scheduled_for <= now())
          AND (
                (sender IS NULL AND ${includeLegacy})
             OR (sender IS NOT NULL AND sender <> ALL(${excluded}::text[]))
          )
        ORDER BY scheduled_for ASC NULLS FIRST
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
     )
    RETURNING id, valuation_id, channel, recipient_email, persona, draft_subject,
              draft_body_text, attempts, sender
  `) as DueOutreach[];
  return rows;
}

// Rolling-24h sent counts per sender identity (NULL sender = the legacy env
// identity, keyed as ''). Drives the per-domain warm-up caps in send.ts.
export async function getSentBySender(): Promise<Record<string, number>> {
  const sql = getSql();
  if (!sql) return {};
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      SELECT COALESCE(sender, '') AS sender, count(*)::int AS n
        FROM outreach_queue
       WHERE stage = 'sent' AND sent_at > now() - interval '24 hours'
       GROUP BY COALESCE(sender, '')
    `) as Array<{ sender: string; n: number }>;
    const out: Record<string, number> = {};
    for (const r of rows) out[r.sender] = r.n;
    return out;
  } catch (err) {
    console.error("[getSentBySender] error", err);
    return {};
  }
}

// Per-sender dashboard stats — one row per identity ('' = legacy rows queued
// before the multi-domain split; the dashboard folds those into the env
// identity, mirroring how send.ts counts them against its cap). Bounce and
// complaint events only record the recipient, so each is attributed to the
// identity that most recently emailed that address.
export type SenderStatsRow = {
  sender: string;
  sent24h: number;
  sent7d: number;
  sentTotal: number;
  queued: number;
  bounced7d: number;
  complained7d: number;
  lastSentAt: string | null;
};

export async function getOutreachSenderStats(): Promise<SenderStatsRow[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      WITH ev AS (
        SELECT aa.action,
               (SELECT COALESCE(oq.sender, '')
                  FROM outreach_queue oq
                 WHERE lower(oq.recipient_email) = lower(aa.detail->>'email')
                   AND oq.stage = 'sent'
                 ORDER BY oq.sent_at DESC NULLS LAST
                 LIMIT 1) AS sender
          FROM agent_actions aa
         WHERE aa.action IN ('outreach_bounced', 'outreach_complained')
           AND aa.created_at > now() - interval '7 days'
      )
      SELECT q.sender,
             q.sent24h,
             q.sent7d,
             q.sent_total,
             q.queued,
             q.last_sent_at,
             COALESCE(e.bounced, 0) AS bounced7d,
             COALESCE(e.complained, 0) AS complained7d
        FROM (
          SELECT COALESCE(sender, '') AS sender,
                 count(*) FILTER (WHERE stage = 'sent' AND sent_at > now() - interval '24 hours')::int AS sent24h,
                 count(*) FILTER (WHERE stage = 'sent' AND sent_at > now() - interval '7 days')::int AS sent7d,
                 count(*) FILTER (WHERE stage = 'sent')::int AS sent_total,
                 count(*) FILTER (WHERE stage IN ('draft', 'approved', 'sending'))::int AS queued,
                 max(sent_at) FILTER (WHERE stage = 'sent')::text AS last_sent_at
            FROM outreach_queue
           GROUP BY COALESCE(sender, '')
        ) q
        LEFT JOIN (
          SELECT sender,
                 count(*) FILTER (WHERE action = 'outreach_bounced')::int AS bounced,
                 count(*) FILTER (WHERE action = 'outreach_complained')::int AS complained
            FROM ev
           WHERE sender IS NOT NULL
           GROUP BY sender
        ) e ON e.sender = q.sender
       ORDER BY q.sent_total DESC, q.sender
    `) as Array<{
      sender: string;
      sent24h: number;
      sent7d: number;
      sent_total: number;
      queued: number;
      last_sent_at: string | null;
      bounced7d: number;
      complained7d: number;
    }>;
    return rows.map((r) => ({
      sender: r.sender,
      sent24h: Number(r.sent24h),
      sent7d: Number(r.sent7d),
      sentTotal: Number(r.sent_total),
      queued: Number(r.queued),
      bounced7d: Number(r.bounced7d),
      complained7d: Number(r.complained7d),
      lastSentAt: r.last_sent_at,
    }));
  } catch (err) {
    console.error("[getOutreachSenderStats] error", err);
    return [];
  }
}

// Un-claim a row this run decided not to send (e.g. its sender identity hit
// the per-domain cap between claim and send). Back to 'approved' untouched so
// a later run picks it up — and the stale-sending reaper never sees it.
export async function releaseOutreachClaim(id: number): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    UPDATE outreach_queue SET stage = 'approved', claimed_at = NULL
     WHERE id = ${id} AND stage = 'sending'
  `;
}

// Crash recovery: a row stuck in 'sending' for >30 min was claimed by a sender
// that died mid-loop. The email MAY have gone out (crash after the Resend call),
// so we do NOT auto-retry — we dead-letter it to 'failed' for a HUMAN to verify
// in the Resend dashboard and explicitly re-approve. Prevents both the
// stranded-forever row and an accidental duplicate cold email.
export async function reapStaleSending(): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      UPDATE outreach_queue
         SET stage = 'failed',
             last_error = 'stale sending claim (sender crashed mid-send?) — check Resend before re-approving'
       WHERE stage = 'sending'
         AND claimed_at IS NOT NULL
         AND claimed_at < now() - interval '30 minutes'
      RETURNING id
    `) as Array<{ id: number }>;
    return rows.length;
  } catch (err) {
    console.error("[reapStaleSending] error", err);
    return 0;
  }
}

// P5 auto-send: draft-stage email rows + their score + persona, for the sender
// to filter against autoSendPersonas + threshold and auto-approve.
export type AutoSendCandidate = {
  id: number;
  persona: string | null;
  acquisition_score: number | null;
};

export async function listAutoSendCandidates(limit: number): Promise<AutoSendCandidate[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureMonitorTables();
  const rows = (await sql`
    SELECT oq.id, oq.persona, v.acquisition_score
      FROM outreach_queue oq
      JOIN valuations v ON v.id = oq.valuation_id
     WHERE oq.stage = 'draft' AND oq.channel = 'email'
     ORDER BY v.acquisition_score DESC NULLS LAST
     LIMIT ${limit}
  `) as AutoSendCandidate[];
  return rows;
}

export async function markOutreachSent(id: number): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureMonitorTables();
  // Stage guard: only a row we actually hold the 'sending' claim on can be
  // marked sent — a stale caller can't flip a reaped/dead row.
  await sql`UPDATE outreach_queue SET stage = 'sent', sent_at = now() WHERE id = ${id} AND stage = 'sending'`;
}

export async function markOutreachFailed(id: number, error: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureMonitorTables();
  // A failed/aborted send releases the 'sending' claim back to 'approved' to
  // retry next run; after 5 attempts it dead-letters instead. Stage-guarded so
  // a late failure callback can never regress a row that was already marked
  // sent (which would cause a duplicate send next run).
  await sql`
    UPDATE outreach_queue
       SET attempts = attempts + 1,
           last_error = ${error.slice(0, 500)},
           stage = CASE WHEN attempts + 1 >= 5 THEN 'dead' ELSE 'approved' END
     WHERE id = ${id} AND stage = 'sending'
  `;
}

// Webhook idempotency: returns true exactly once per delivery id (Svix retries
// the same id on at-least-once delivery). FAIL-SAFE false on error so a DB blip
// can't double-count an event into the auto-pause thresholds.
export async function recordWebhookEvent(id: string): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      INSERT INTO webhook_events (id) VALUES (${id})
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `) as Array<{ id: string }>;
    return rows.length > 0;
  } catch (err) {
    console.error("[recordWebhookEvent] error", err);
    return false;
  }
}

// One-time requalification: force every verified row back through the verify
// queue (by aging updated_at past the 14-day staleness gate) so the whole
// verified set is re-rated under the CURRENT engine after a rules change.
// Idempotent and safe — verify is a refresh, not a state regression.
export async function requalifyVerified(): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;
  await ensureValuationsSchema();
  const rows = (await sql`
    UPDATE valuations
       SET updated_at = now() - interval '15 days'
     WHERE source = 'monitor' AND monitor_stage = 'verified'
    RETURNING id
  `) as Array<{ id: number }>;
  return rows.length;
}

// Dead-letter every not-yet-sent outreach row (draft/approved) and return the
// carriers to 'verified' so the next sweep re-drafts them with CURRENT copy.
// Used after a template change so stale wording can never go out.
export async function discardPendingOutreach(): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;
  await ensureMonitorTables();
  const rows = (await sql`
    UPDATE outreach_queue SET stage = 'dead', last_error = 'discarded: template change'
     WHERE stage IN ('draft', 'approved')
    RETURNING valuation_id
  `) as Array<{ valuation_id: number }>;
  if (rows.length > 0) {
    const ids = rows.map((r) => r.valuation_id);
    await sql`
      UPDATE valuations SET monitor_stage = 'verified', updated_at = now()
       WHERE id = ANY(${ids}) AND source = 'monitor' AND monitor_stage = 'drafted'
    `;
  }
  return rows.length;
}

// Compliance trail: every agent transition + every human approve/send.
// Best-effort — never throws into the caller.
export async function logAgentAction(
  action: string,
  actor: string,
  valuationId: number | null,
  detail?: unknown,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  try {
    await ensureMonitorTables();
    await sql`
      INSERT INTO agent_actions (valuation_id, action, actor, detail)
      VALUES (${valuationId}, ${action}, ${actor}, ${detail ? JSON.stringify(detail) : null}::jsonb)
    `;
  } catch (err) {
    console.error("[logAgentAction] error", err);
  }
}

// ---------------------------------------------------------------------------
// Outreach circuit breaker — bounce/complaint auto-pause.
// ---------------------------------------------------------------------------

// FAIL-SAFE: if the breaker can't be read, treat sending as paused. The pause
// is a reputation safeguard; halting on a DB blip is safer than sending blind.
export async function isOutreachPaused(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      SELECT paused FROM outreach_control WHERE id = 1
    `) as { paused: boolean }[];
    return rows[0]?.paused === true;
  } catch (err) {
    console.error("[isOutreachPaused] error", err);
    return true; // fail-safe
  }
}

export async function setOutreachPaused(reason: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  try {
    await ensureMonitorTables();
    await sql`
      INSERT INTO outreach_control (id, paused, reason, updated_at)
      VALUES (1, true, ${reason.slice(0, 300)}, now())
      ON CONFLICT (id) DO UPDATE
        SET paused = true, reason = ${reason.slice(0, 300)}, updated_at = now()
    `;
  } catch (err) {
    console.error("[setOutreachPaused] error", err);
  }
}

export async function resumeOutreach(): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  try {
    await ensureMonitorTables();
    await sql`
      INSERT INTO outreach_control (id, paused, reason, updated_at)
      VALUES (1, false, NULL, now())
      ON CONFLICT (id) DO UPDATE
        SET paused = false, reason = NULL, updated_at = now()
    `;
  } catch (err) {
    console.error("[resumeOutreach] error", err);
  }
}

export async function getOutreachControl(): Promise<{
  paused: boolean;
  reason: string | null;
  updated_at: string | null;
}> {
  const sql = getSql();
  if (!sql) return { paused: false, reason: null, updated_at: null };
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      SELECT paused, reason, updated_at::text AS updated_at
        FROM outreach_control WHERE id = 1
    `) as { paused: boolean; reason: string | null; updated_at: string | null }[];
    return rows[0] ?? { paused: false, reason: null, updated_at: null };
  } catch (err) {
    console.error("[getOutreachControl] error", err);
    return { paused: false, reason: null, updated_at: null };
  }
}

// Rolling deliverability counts for the auto-pause decision.
export async function getOutreachHealth(
  days = 7,
): Promise<{ sent: number; bounced: number; complained: number }> {
  const sql = getSql();
  if (!sql) return { sent: 0, bounced: 0, complained: 0 };
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      SELECT
        (SELECT count(*) FROM outreach_queue
          WHERE stage = 'sent' AND sent_at > now() - make_interval(days => ${days})) AS sent,
        (SELECT count(*) FROM agent_actions
          WHERE action = 'outreach_bounced' AND created_at > now() - make_interval(days => ${days})) AS bounced,
        (SELECT count(*) FROM agent_actions
          WHERE action = 'outreach_complained' AND created_at > now() - make_interval(days => ${days})) AS complained
    `) as { sent: string | number; bounced: string | number; complained: string | number }[];
    const r = rows[0] ?? { sent: 0, bounced: 0, complained: 0 };
    return {
      sent: Number(r.sent),
      bounced: Number(r.bounced),
      complained: Number(r.complained),
    };
  } catch (err) {
    console.error("[getOutreachHealth] error", err);
    return { sent: 0, bounced: 0, complained: 0 };
  }
}

// ---------------------------------------------------------------------------
// Dashboard aggregates — all fail-safe (return empty on any error) so the
// agent dashboard can never 500.
// ---------------------------------------------------------------------------

// DB canary so the dashboard can tell "genuinely empty" from "unreachable" —
// without it, an outage renders as a healthy-looking page full of zeros.
export async function pingDb(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// THE canonical "ready to email" number — the exact listMonitorForDrafting gate
// (verified + in-window + insured now + acceptable history + safety pass),
// split by usable email. Every dashboard surface that talks about the ready
// backlog must use this so the numbers agree.
export type ReadyStats = { ready: number; readyEmail: number };

export async function getReadyToEmailStats(): Promise<ReadyStats> {
  const sql = getSql();
  if (!sql) return { ready: 0, readyEmail: 0 };
  try {
    await ensureValuationsSchema();
    const rows = (await sql`
      SELECT count(*)::int AS ready,
             count(*) FILTER (
               WHERE census_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]{2,}$'
             )::int AS ready_email
        FROM valuations
       WHERE source = 'monitor'
         AND monitor_stage = 'verified'
         AND eligible_at IS NOT NULL
         AND (eligible_at - CURRENT_DATE) <= 60
         AND (eligible_at - CURRENT_DATE) >= -185
         AND insurance_current = true
         AND insurance_rating IN ('green', 'amber', 'unknown')
         AND safety_status = 'pass'
    `) as Array<{ ready: number; ready_email: number }>;
    const r = rows[0];
    return { ready: Number(r?.ready ?? 0), readyEmail: Number(r?.ready_email ?? 0) };
  } catch (err) {
    console.error("[getReadyToEmailStats] error", err);
    return { ready: 0, readyEmail: 0 };
  }
}

// Rolled-up sweep activity for the dashboard's plain-English pulse: when the
// agent last did anything, and how much work each pass did recently. The
// per-pass numbers come from the sweep heartbeats (agent_actions.detail) that
// were previously logged but never shown anywhere.
export type AgentPulse = {
  lastSweepAt: string | null;
  discovered7d: number;
  newRows7d: number;
  verified24h: number;
  enriched24h: number;
  drafted24h: number;
};

export async function getAgentPulse(): Promise<AgentPulse> {
  const empty: AgentPulse = {
    lastSweepAt: null,
    discovered7d: 0,
    newRows7d: 0,
    verified24h: 0,
    enriched24h: 0,
    drafted24h: 0,
  };
  const sql = getSql();
  if (!sql) return empty;
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      SELECT
        (SELECT max(created_at)::text FROM agent_actions
          WHERE action = 'sweep_completed') AS last_sweep_at,
        COALESCE((SELECT sum((detail->>'discovered')::int) FROM agent_actions
          WHERE action = 'sweep_completed'
            AND created_at > now() - interval '7 days'), 0)::int AS discovered_7d,
        (SELECT count(*) FROM valuations
          WHERE source = 'monitor'
            AND created_at > now() - interval '7 days')::int AS new_rows_7d,
        COALESCE((SELECT sum((detail->>'verified')::int) FROM agent_actions
          WHERE action = 'sweep_completed'
            AND created_at > now() - interval '1 day'), 0)::int AS verified_24h,
        COALESCE((SELECT sum((detail->>'enriched')::int) FROM agent_actions
          WHERE action = 'sweep_completed'
            AND created_at > now() - interval '1 day'), 0)::int AS enriched_24h,
        COALESCE((SELECT sum((detail->>'drafted')::int) FROM agent_actions
          WHERE action = 'sweep_completed'
            AND created_at > now() - interval '1 day'), 0)::int AS drafted_24h
    `) as Array<{
      last_sweep_at: string | null;
      discovered_7d: number;
      new_rows_7d: number;
      verified_24h: number;
      enriched_24h: number;
      drafted_24h: number;
    }>;
    const r = rows[0];
    if (!r) return empty;
    return {
      lastSweepAt: r.last_sweep_at,
      discovered7d: Number(r.discovered_7d),
      newRows7d: Number(r.new_rows_7d),
      verified24h: Number(r.verified_24h),
      enriched24h: Number(r.enriched_24h),
      drafted24h: Number(r.drafted_24h),
    };
  } catch (err) {
    console.error("[getAgentPulse] error", err);
    return empty;
  }
}

// Sends that genuinely need a human: failed rows (send error / stale-claim
// reaper — the email may or may not have gone out) and rows dead-lettered after
// exhausting retries. Deliberate discards and unsubscribe suppressions are NOT
// attention items and are excluded — counting them made the old dead-letter
// badge a permanent false alarm.
export type FailedSendCounts = { failed: number; deadAfterRetries: number };

export async function getFailedSendCounts(): Promise<FailedSendCounts> {
  const sql = getSql();
  if (!sql) return { failed: 0, deadAfterRetries: 0 };
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      SELECT count(*) FILTER (WHERE stage = 'failed')::int AS failed,
             count(*) FILTER (WHERE stage = 'dead' AND attempts >= 5)::int AS dead_after_retries
        FROM outreach_queue
    `) as Array<{ failed: number; dead_after_retries: number }>;
    const r = rows[0];
    return {
      failed: Number(r?.failed ?? 0),
      deadAfterRetries: Number(r?.dead_after_retries ?? 0),
    };
  } catch (err) {
    console.error("[getFailedSendCounts] error", err);
    return { failed: 0, deadAfterRetries: 0 };
  }
}

async function groupCounts(
  sql: Sql,
  query: Promise<unknown>,
): Promise<Record<string, number>> {
  const rows = (await query) as Array<{ k: string; n: number }>;
  const out: Record<string, number> = {};
  for (const r of rows) out[r.k] = Number(r.n);
  return out;
}

export async function getMonitorStageCounts(): Promise<Record<string, number>> {
  const sql = getSql();
  if (!sql) return {};
  try {
    await ensureValuationsSchema();
    return await groupCounts(
      sql,
      sql`SELECT COALESCE(monitor_stage, '(unprocessed)') AS k, count(*)::int AS n
            FROM valuations WHERE source = 'monitor' GROUP BY 1`,
    );
  } catch (err) {
    console.error("[getMonitorStageCounts] error", err);
    return {};
  }
}

export async function getEligibilityCounts(): Promise<Record<string, number>> {
  const sql = getSql();
  if (!sql) return {};
  try {
    await ensureValuationsSchema();
    // Recompute the eligibility bucket LIVE from eligible_at so the dashboard
    // tracks carriers as they age (a 'too_new' row becomes 'approaching' →
    // 'eligible_now' with the calendar, no re-verify). Verified rows get a live
    // bucket; not-yet-assessed rows show '(unassessed)'.
    return await groupCounts(
      sql,
      sql`SELECT
            CASE
              WHEN authority_status = 'not_found' THEN 'not_in_fmcsa'
              WHEN eligible_at IS NULL THEN COALESCE(eligibility_state, '(unassessed)')
              WHEN authority_status IN ('inactive', 'broker_only') THEN 'authority_inactive'
              WHEN insurance_current = false THEN 'continuity_broken'
              WHEN (eligible_at - CURRENT_DATE) > 60 THEN 'too_new'
              WHEN (eligible_at - CURRENT_DATE) > 0 THEN 'approaching'
              WHEN (eligible_at - CURRENT_DATE) >= -185 THEN 'eligible_now'
              ELSE 'aged_out'
            END AS k,
            count(*)::int AS n
            FROM valuations WHERE source = 'monitor' GROUP BY 1`,
    );
  } catch (err) {
    console.error("[getEligibilityCounts] error", err);
    return {};
  }
}

export async function getInsuranceRatingCounts(): Promise<Record<string, number>> {
  const sql = getSql();
  if (!sql) return {};
  try {
    await ensureValuationsSchema();
    return await groupCounts(
      sql,
      sql`SELECT COALESCE(insurance_rating, '(pending)') AS k, count(*)::int AS n
            FROM valuations WHERE source = 'monitor' GROUP BY 1`,
    );
  } catch (err) {
    console.error("[getInsuranceRatingCounts] error", err);
    return {};
  }
}

export async function getOutreachStageCounts(): Promise<Record<string, number>> {
  const sql = getSql();
  if (!sql) return {};
  try {
    await ensureMonitorTables();
    return await groupCounts(
      sql,
      sql`SELECT COALESCE(stage, '(none)') AS k, count(*)::int AS n
            FROM outreach_queue GROUP BY 1`,
    );
  } catch (err) {
    console.error("[getOutreachStageCounts] error", err);
    return {};
  }
}

export type AgentActionRow = {
  created_at: string;
  action: string;
  actor: string;
  valuation_id: number | null;
  detail: unknown;
  legal_name: string | null;
};

export async function getRecentAgentActions(limit = 40): Promise<AgentActionRow[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      SELECT a.created_at::text AS created_at, a.action, a.actor, a.valuation_id,
             a.detail, v.legal_name
        FROM agent_actions a
        LEFT JOIN valuations v ON v.id = a.valuation_id
       ORDER BY a.created_at DESC
       LIMIT ${limit}
    `) as AgentActionRow[];
    return rows;
  } catch (err) {
    console.error("[getRecentAgentActions] error", err);
    return [];
  }
}

export async function listAllCursors(): Promise<MonitorCursor[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      SELECT id, last_processed_day::text AS last_processed_day,
             last_run_at::text AS last_run_at, last_run_summary
        FROM monitor_cursor ORDER BY id
    `) as MonitorCursor[];
    return rows;
  } catch (err) {
    console.error("[listAllCursors] error", err);
    return [];
  }
}

export type HotProspect = {
  id: number;
  legal_name: string | null;
  dba_name: string | null;
  dot_number: string | null;
  phy_address: unknown;
  days_to_180: number | null;
  eligibility_state: string | null;
  insurance_rating: string | null;
  acquisition_score: number | null;
  outreach_channel: string | null;
};

export async function listHotProspects(limit = 10): Promise<HotProspect[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    await ensureValuationsSchema();
    const rows = (await sql`
      SELECT id, legal_name, dba_name, dot_number, phy_address,
             (eligible_at - CURRENT_DATE) AS days_to_180,
             CASE
               WHEN (eligible_at - CURRENT_DATE) > 0 THEN 'approaching'
               ELSE 'eligible_now'
             END AS eligibility_state,
             insurance_rating, acquisition_score, outreach_channel
        FROM valuations
       WHERE source = 'monitor'
         AND monitor_stage = 'verified'
         AND authority_status = 'active'
         AND insurance_current = true
         AND eligible_at IS NOT NULL
         AND (eligible_at - CURRENT_DATE) <= 60
         AND (eligible_at - CURRENT_DATE) >= -185
       ORDER BY acquisition_score DESC NULLS LAST, eligible_at ASC NULLS LAST
       LIMIT ${limit}
    `) as HotProspect[];
    return rows;
  } catch (err) {
    console.error("[listHotProspects] error", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Roster export — every monitor row with its LIVE eligibility + all audit
// signals, for building the markdown "database" file. Fail-safe (empty on
// error). Caller buckets in JS.
// ---------------------------------------------------------------------------
export type MonitorExportRow = {
  id: number;
  dot_number: string | null;
  mc_number: string | null;
  legal_name: string | null;
  dba_name: string | null;
  phy_address: unknown;
  add_date: string | null;
  age_days: number | null;
  monitor_stage: string | null;
  authority_status: string | null;
  eligible_at: string | null;
  days_to_180: number | null;
  eligibility_state: string | null;
  insurance_current: boolean | null;
  insurance_rating: string | null;
  safety_status: string | null;
  safety_rating: string | null;
  crash_total: number | null;
  driver_oos_rate: number | null;
  vehicle_oos_rate: number | null;
  audit_score: string | null;
  acquisition_score: number | null;
  disqualify_reason: string | null;
  census_email: string | null;
  telephone: string | null;
  power_units: number | null;
};

export async function listMonitorForExport(
  limit = 100_000,
  offset = 0,
): Promise<MonitorExportRow[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    await ensureValuationsSchema();
    const rows = (await sql`
      SELECT id, dot_number, mc_number, legal_name, dba_name, phy_address,
             add_date::text AS add_date,
             (CURRENT_DATE - add_date) AS age_days,
             monitor_stage, authority_status,
             eligible_at::text AS eligible_at,
             (eligible_at - CURRENT_DATE) AS days_to_180,
             CASE
               WHEN authority_status = 'not_found' THEN 'not_in_fmcsa'
               WHEN eligible_at IS NULL THEN COALESCE(eligibility_state, '(unassessed)')
               WHEN authority_status IN ('inactive', 'broker_only') THEN 'authority_inactive'
               WHEN insurance_current = false THEN 'continuity_broken'
               WHEN (eligible_at - CURRENT_DATE) > 60 THEN 'too_new'
               WHEN (eligible_at - CURRENT_DATE) > 0 THEN 'approaching'
               WHEN (eligible_at - CURRENT_DATE) >= -185 THEN 'eligible_now'
               ELSE 'aged_out'
             END AS eligibility_state,
             insurance_current, insurance_rating, safety_status, safety_rating,
             crash_total, driver_oos_rate, vehicle_oos_rate, audit_score,
             acquisition_score, disqualify_reason, census_email, telephone,
             power_units
        FROM valuations
       WHERE source = 'monitor'
       ORDER BY (eligible_at - CURRENT_DATE) ASC NULLS LAST, id ASC
       LIMIT ${limit} OFFSET ${offset}
    `) as MonitorExportRow[];
    return rows;
  } catch (err) {
    console.error("[listMonitorForExport] error", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Drill-down detail queries for the interactive dashboard.
// ---------------------------------------------------------------------------

// Everything we know about one monitor company — the full audit picture shown
// when a dashboard row is clicked. Live eligibility, same CASE as the export.
export type MonitorCompanyDetail = MonitorExportRow & {
  contact_email: string | null;
  drivers_count: number | null;
  bipd_anchor_date: string | null;
  insurance_gaps: unknown;
  safety_checked_at: string | null;
  safety_findings: unknown;
  safety_penalty: number | null;
  ucc_status: string | null;
  ucc_rating: string | null;
  outreach_channel: string | null;
  updated_at: string | null;
  status: string | null;
};

export async function getMonitorCompanyDetail(
  id: number,
): Promise<MonitorCompanyDetail | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    await ensureValuationsSchema();
    const rows = (await sql`
      SELECT id, dot_number, mc_number, legal_name, dba_name, phy_address,
             add_date::text AS add_date,
             (CURRENT_DATE - add_date) AS age_days,
             monitor_stage, authority_status,
             eligible_at::text AS eligible_at,
             (eligible_at - CURRENT_DATE) AS days_to_180,
             CASE
               WHEN authority_status = 'not_found' THEN 'not_in_fmcsa'
               WHEN eligible_at IS NULL THEN COALESCE(eligibility_state, '(unassessed)')
               WHEN authority_status IN ('inactive', 'broker_only') THEN 'authority_inactive'
               WHEN insurance_current = false THEN 'continuity_broken'
               WHEN (eligible_at - CURRENT_DATE) > 60 THEN 'too_new'
               WHEN (eligible_at - CURRENT_DATE) > 0 THEN 'approaching'
               WHEN (eligible_at - CURRENT_DATE) >= -185 THEN 'eligible_now'
               ELSE 'aged_out'
             END AS eligibility_state,
             insurance_current, insurance_rating, safety_status, safety_rating,
             crash_total, driver_oos_rate, vehicle_oos_rate, audit_score,
             acquisition_score, disqualify_reason, census_email, telephone,
             power_units,
             contact_email, drivers_count,
             bipd_anchor_date::text AS bipd_anchor_date, insurance_gaps,
             safety_checked_at::text AS safety_checked_at, safety_findings,
             safety_penalty, ucc_status, ucc_rating, outreach_channel,
             updated_at::text AS updated_at, status
        FROM valuations
       WHERE id = ${id} AND source = 'monitor'
    `) as MonitorCompanyDetail[];
    return rows[0] ?? null;
  } catch (err) {
    console.error("[getMonitorCompanyDetail] error", err);
    return null;
  }
}

// The latest outreach email for a company (any stage) — full subject + body.
export type OutreachEmailDetail = {
  id: number;
  valuation_id: number;
  stage: string;
  persona: string | null;
  recipient_email: string | null;
  draft_subject: string | null;
  draft_body_text: string | null;
  created_at: string | null;
  sent_at: string | null;
  attempts: number;
  last_error: string | null;
};

export async function getLatestOutreachForValuation(
  valuationId: number,
): Promise<OutreachEmailDetail | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      SELECT id, valuation_id, stage, persona, recipient_email, draft_subject,
             draft_body_text, created_at::text AS created_at,
             sent_at::text AS sent_at, attempts, last_error
        FROM outreach_queue
       WHERE valuation_id = ${valuationId}
       ORDER BY created_at DESC
       LIMIT 1
    `) as OutreachEmailDetail[];
    return rows[0] ?? null;
  } catch (err) {
    console.error("[getLatestOutreachForValuation] error", err);
    return null;
  }
}

export async function getOutreachEmailById(
  id: number,
): Promise<OutreachEmailDetail | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    await ensureMonitorTables();
    const rows = (await sql`
      SELECT id, valuation_id, stage, persona, recipient_email, draft_subject,
             draft_body_text, created_at::text AS created_at,
             sent_at::text AS sent_at, attempts, last_error
        FROM outreach_queue
       WHERE id = ${id}
       LIMIT 1
    `) as OutreachEmailDetail[];
    return rows[0] ?? null;
  } catch (err) {
    console.error("[getOutreachEmailById] error", err);
    return null;
  }
}

// Card drill-down lists (same live-eligibility shape as the export rows).
export type MonitorListKind = "hot" | "phone" | "disqualified" | "review";

export async function listMonitorDetailRows(
  kind: MonitorListKind,
  limit = 200,
): Promise<MonitorExportRow[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    await ensureValuationsSchema();
    // Single fully-parameterized query: `kind` is a plain VALUE (no SQL
    // fragment composition — the neon template treats interpolations as
    // parameters), so each card's filter is selected by comparing ${kind}.
    const rows = (await sql`
      SELECT id, dot_number, mc_number, legal_name, dba_name, phy_address,
             add_date::text AS add_date,
             (CURRENT_DATE - add_date) AS age_days,
             monitor_stage, authority_status,
             eligible_at::text AS eligible_at,
             (eligible_at - CURRENT_DATE) AS days_to_180,
             CASE
               WHEN authority_status = 'not_found' THEN 'not_in_fmcsa'
               WHEN eligible_at IS NULL THEN COALESCE(eligibility_state, '(unassessed)')
               WHEN authority_status IN ('inactive', 'broker_only') THEN 'authority_inactive'
               WHEN insurance_current = false THEN 'continuity_broken'
               WHEN (eligible_at - CURRENT_DATE) > 60 THEN 'too_new'
               WHEN (eligible_at - CURRENT_DATE) > 0 THEN 'approaching'
               WHEN (eligible_at - CURRENT_DATE) >= -185 THEN 'eligible_now'
               ELSE 'aged_out'
             END AS eligibility_state,
             insurance_current, insurance_rating, safety_status, safety_rating,
             crash_total, driver_oos_rate, vehicle_oos_rate, audit_score,
             acquisition_score, disqualify_reason, census_email, telephone,
             power_units
        FROM valuations
       WHERE source = 'monitor'
         AND (
               (${kind} = 'hot' AND monitor_stage = 'verified'
                  AND authority_status = 'active' AND insurance_current = true
                  AND insurance_rating IN ('green', 'amber', 'unknown')
                  AND safety_status = 'pass'
                  AND eligible_at IS NOT NULL
                  AND (eligible_at - CURRENT_DATE) <= 60
                  AND (eligible_at - CURRENT_DATE) >= -185)
            OR (${kind} = 'phone' AND monitor_stage = 'outreach_phone')
            OR (${kind} = 'review' AND safety_status = 'review')
            OR (${kind} = 'disqualified' AND monitor_stage = 'disqualified')
         )
       ORDER BY
         CASE WHEN ${kind} = 'disqualified' THEN extract(epoch FROM updated_at) END DESC NULLS LAST,
         (eligible_at - CURRENT_DATE) ASC NULLS LAST,
         acquisition_score DESC NULLS LAST
       LIMIT ${limit}
    `) as MonitorExportRow[];
    return rows;
  } catch (err) {
    console.error("[listMonitorDetailRows] error", err);
    return [];
  }
}

// Add_date age distribution across ALL monitor rows — the real measurement of
// how the standing backlog splits around the 4-month floor and the 180-day
// window (independent of whether a row has been verified yet).
export type MonitorAgeHistogram = {
  no_date: number;
  under_120: number;
  d120_150: number;
  d150_180: number;
  d180_365: number;
  over_365: number;
  total: number;
};

export async function getMonitorAgeHistogram(): Promise<MonitorAgeHistogram> {
  const empty: MonitorAgeHistogram = {
    no_date: 0,
    under_120: 0,
    d120_150: 0,
    d150_180: 0,
    d180_365: 0,
    over_365: 0,
    total: 0,
  };
  const sql = getSql();
  if (!sql) return empty;
  try {
    await ensureValuationsSchema();
    const rows = (await sql`
      SELECT
        count(*) FILTER (WHERE add_date IS NULL)::int AS no_date,
        count(*) FILTER (WHERE add_date > CURRENT_DATE - INTERVAL '120 days')::int AS under_120,
        count(*) FILTER (WHERE add_date <= CURRENT_DATE - INTERVAL '120 days'
                           AND add_date > CURRENT_DATE - INTERVAL '150 days')::int AS d120_150,
        count(*) FILTER (WHERE add_date <= CURRENT_DATE - INTERVAL '150 days'
                           AND add_date > CURRENT_DATE - INTERVAL '180 days')::int AS d150_180,
        count(*) FILTER (WHERE add_date <= CURRENT_DATE - INTERVAL '180 days'
                           AND add_date > CURRENT_DATE - INTERVAL '365 days')::int AS d180_365,
        count(*) FILTER (WHERE add_date <= CURRENT_DATE - INTERVAL '365 days')::int AS over_365,
        count(*)::int AS total
        FROM valuations WHERE source = 'monitor'
    `) as MonitorAgeHistogram[];
    return rows[0] ?? empty;
  } catch (err) {
    console.error("[getMonitorAgeHistogram] error", err);
    return empty;
  }
}
