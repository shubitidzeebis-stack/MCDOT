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
  // One active draft/send per (valuation, persona). Failed/dead rows are
  // excluded so a retry can be re-queued.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS outreach_queue_active_uq
      ON outreach_queue (valuation_id, persona)
      WHERE stage NOT IN ('failed', 'dead')
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
      add_date = EXCLUDED.add_date,
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
      updated_at = now()
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
  // Verify freshly-discovered rows FIRST (so hot, near-180-day carriers aren't
  // stuck behind a re-verify backlog), then re-verify 'verified' rows older than
  // 14 days. Terminal/in-flight stages (sent/suppressed/drafted/approved/
  // phone-queued/disqualified) are excluded so we don't waste FMCSA quota or
  // regress an already-contacted carrier back into the pipeline.
  const rows = (await sql`
    SELECT id, dot_number, add_date::text AS add_date, power_units
      FROM valuations
     WHERE source = 'monitor'
       AND dot_number IS NOT NULL
       AND (monitor_stage IS NULL OR monitor_stage NOT IN
            ('sent','suppressed','drafted','approved','outreach_phone','disqualified'))
       AND (monitor_stage = 'discovered' OR monitor_stage IS NULL
            OR updated_at < now() - interval '14 days')
     ORDER BY (monitor_stage IS DISTINCT FROM 'discovered'), updated_at ASC
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
             (eligible_at - CURRENT_DATE) AS days_to_180, eligibility_state,
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
};

export async function getMonitorAuditInputs(
  id: number,
): Promise<MonitorAuditInputs | null> {
  const sql = getSql();
  if (!sql) return null;
  await ensureValuationsSchema();
  const rows = (await sql`
    SELECT insurance_rating, insurance_current, eligibility_state,
           days_to_180, power_units
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
};

export async function listMonitorForDrafting(
  limit: number,
): Promise<MonitorDraftTarget[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureValuationsSchema();
  const rows = (await sql`
    SELECT id, dot_number, mc_number, legal_name, dba_name, census_email,
           telephone, phy_address, power_units, days_to_180, eligibility_state
      FROM valuations
     WHERE source = 'monitor'
       AND monitor_stage = 'verified'
       AND eligibility_state IN ('approaching', 'eligible_now')
       AND insurance_current = true
       AND insurance_rating IN ('green', 'amber')
     ORDER BY days_to_180 ASC NULLS LAST
     LIMIT ${limit}
  `) as MonitorDraftTarget[];
  return rows;
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

export async function markMonitorOfferSent(valuationId: number): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureValuationsSchema();
  await sql`UPDATE valuations SET monitor_stage = 'sent', status = 'offer_sent', updated_at = now() WHERE id = ${valuationId} AND source = 'monitor'`;
}

export async function enqueueDraft(d: {
  valuationId: number;
  channel: string;
  recipientEmail: string | null;
  recipientPhone: string | null;
  persona: string;
  subject: string | null;
  bodyText: string | null;
}): Promise<number | null> {
  const sql = getSql();
  if (!sql) return null;
  await ensureMonitorTables();
  const rows = (await sql`
    INSERT INTO outreach_queue (
      valuation_id, channel, recipient_email, recipient_phone, persona,
      draft_subject, draft_body_text, stage
    ) VALUES (
      ${d.valuationId}, ${d.channel}, ${d.recipientEmail}, ${d.recipientPhone},
      ${d.persona}, ${d.subject}, ${d.bodyText}, 'draft'
    )
    ON CONFLICT (valuation_id, persona) WHERE stage NOT IN ('failed', 'dead')
    DO UPDATE SET
      channel = EXCLUDED.channel,
      recipient_email = EXCLUDED.recipient_email,
      recipient_phone = EXCLUDED.recipient_phone,
      draft_subject = EXCLUDED.draft_subject,
      draft_body_text = EXCLUDED.draft_body_text
    RETURNING id
  `) as Array<{ id: number }>;
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
};

// Atomically CLAIM due rows by flipping 'approved' -> 'sending' and returning
// them in one statement. Because the UPDATE re-checks `stage='approved'` under a
// row lock, two concurrent senders (e.g. the daily cron racing a "Send now")
// can't both claim the same row — preventing duplicate emails to a prospect.
// The caller marks each 'sent' on success, or markOutreachFailed resets it.
export async function getDueOutreach(limit: number): Promise<DueOutreach[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureMonitorTables();
  const rows = (await sql`
    UPDATE outreach_queue SET stage = 'sending'
     WHERE id IN (
       SELECT id FROM outreach_queue
        WHERE stage = 'approved' AND channel = 'email'
          AND (scheduled_for IS NULL OR scheduled_for <= now())
        ORDER BY scheduled_for ASC NULLS FIRST
        LIMIT ${limit}
     )
    RETURNING id, valuation_id, channel, recipient_email, persona, draft_subject,
              draft_body_text, attempts
  `) as DueOutreach[];
  return rows;
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
  await sql`UPDATE outreach_queue SET stage = 'sent', sent_at = now() WHERE id = ${id}`;
}

export async function markOutreachFailed(id: number, error: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureMonitorTables();
  // A failed/aborted send releases the 'sending' claim back to 'approved' to
  // retry next run; after 5 attempts it dead-letters instead.
  await sql`
    UPDATE outreach_queue
       SET attempts = attempts + 1,
           last_error = ${error.slice(0, 500)},
           stage = CASE WHEN attempts + 1 >= 5 THEN 'dead' ELSE 'approved' END
     WHERE id = ${id}
  `;
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
// Dashboard aggregates — all fail-safe (return empty on any error) so the
// agent dashboard can never 500.
// ---------------------------------------------------------------------------

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
    return await groupCounts(
      sql,
      sql`SELECT COALESCE(eligibility_state, '(pending)') AS k, count(*)::int AS n
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
             eligibility_state, insurance_rating, acquisition_score, outreach_channel
        FROM valuations
       WHERE source = 'monitor'
         AND eligibility_state IN ('approaching', 'eligible_now')
       ORDER BY acquisition_score DESC NULLS LAST, eligible_at ASC NULLS LAST
       LIMIT ${limit}
    `) as HotProspect[];
    return rows;
  } catch (err) {
    console.error("[listHotProspects] error", err);
    return [];
  }
}
