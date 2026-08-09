// Persistence for the Quo (formerly OpenPhone) business line, (326) 222-5444.
//
// Quo pushes call + message events at us over a signed webhook; this is where
// they land. Two tables, same "no-migration" convention as monitor.ts /
// valuations.ts: created on first use via CREATE TABLE IF NOT EXISTS behind a
// module `initialized` flag, no-op without DATABASE_URL. Nothing here ALTERs
// `valuations` — the link between a call and a lead is a nullable column on
// OUR side, so a bug in here can never damage the leads pipeline.
//
// WHY external_number EXISTS: every join we care about ("which lead is this
// call from?") is by phone. Quo gives us `from`/`to` in E.164, our own
// contact_phone is free text a visitor typed, and the SAFER-scraped
// `telephone` is formatted differently again. Storing a normalised LAST-10
// projection once, at write time, means the admin page can index-scan instead
// of regexp-ing 50k rows on every page load. See lib/db/contact-search.ts,
// which does the same reduction on the other side of the join.
//
// Events arrive OUT OF ORDER and more than once. `call.completed` usually
// lands before `call.recording.completed`, but not always, and Quo retries on
// any non-2xx. So every write here is an idempotent upsert keyed on Quo's own
// id, and late-arriving fields use COALESCE so a retry of an earlier event
// can't blank a field a later event already filled.

import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

let initialized = false;

function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

/** Reduce anything phone-shaped to bare last-10 digits, or null. */
export function last10(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

export async function ensureCallsSchema(): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS quo_calls (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      direction TEXT,
      status TEXT,
      from_number TEXT,
      to_number TEXT,
      -- The OTHER party, last-10 digits. Indexed; this is the join key.
      external_number TEXT,
      -- Quo user id that handled it. Null on a missed call.
      quo_user_id TEXT,
      answered_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      duration_sec INT,
      recording_url TEXT,
      voicemail_url TEXT,
      transcript JSONB,
      summary JSONB,
      -- Auto-link into the pipeline, resolved at ingest.
      valuation_id INT,
      match_source TEXT,
      -- Operator triage: set when someone deals with a missed call.
      handled_at TIMESTAMPTZ,
      handled_by TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS quo_calls_created_idx ON quo_calls (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS quo_calls_external_idx ON quo_calls (external_number)`;
  await sql`CREATE INDEX IF NOT EXISTS quo_calls_valuation_idx ON quo_calls (valuation_id)`;
  // Partial index for the "missed and unrecovered" board — the one query on
  // this page that runs on every load and must stay fast as the table grows.
  await sql`
    CREATE INDEX IF NOT EXISTS quo_calls_unhandled_idx
      ON quo_calls (created_at DESC)
      WHERE direction = 'incoming' AND answered_at IS NULL AND handled_at IS NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS quo_messages (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      direction TEXT,
      status TEXT,
      from_number TEXT,
      to_number TEXT,
      external_number TEXT,
      body TEXT,
      valuation_id INT,
      match_source TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS quo_messages_created_idx ON quo_messages (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS quo_messages_external_idx ON quo_messages (external_number)`;

  initialized = true;
}

export type CallUpsert = {
  id: string;
  direction: string | null;
  status: string | null;
  fromNumber: string | null;
  toNumber: string | null;
  externalNumber: string | null;
  quoUserId: string | null;
  answeredAt: string | null;
  completedAt: string | null;
  durationSec: number | null;
  valuationId: number | null;
  matchSource: string | null;
};

/**
 * Idempotent upsert of the core call row.
 *
 * COALESCE on every nullable field is deliberate: Quo retries deliveries, and
 * a replayed `call.ringing` (which carries no duration or answer time) must
 * not wipe values a later `call.completed` already wrote. New non-null values
 * win; nulls never overwrite.
 */
export async function upsertCall(c: CallUpsert): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureCallsSchema();
  await sql`
    INSERT INTO quo_calls (
      id, direction, status, from_number, to_number, external_number,
      quo_user_id, answered_at, completed_at, duration_sec,
      valuation_id, match_source
    ) VALUES (
      ${c.id}, ${c.direction}, ${c.status}, ${c.fromNumber}, ${c.toNumber},
      ${c.externalNumber}, ${c.quoUserId}, ${c.answeredAt}, ${c.completedAt},
      ${c.durationSec}, ${c.valuationId}, ${c.matchSource}
    )
    ON CONFLICT (id) DO UPDATE SET
      direction       = COALESCE(EXCLUDED.direction,       quo_calls.direction),
      status          = COALESCE(EXCLUDED.status,          quo_calls.status),
      from_number     = COALESCE(EXCLUDED.from_number,     quo_calls.from_number),
      to_number       = COALESCE(EXCLUDED.to_number,       quo_calls.to_number),
      external_number = COALESCE(EXCLUDED.external_number, quo_calls.external_number),
      quo_user_id     = COALESCE(EXCLUDED.quo_user_id,     quo_calls.quo_user_id),
      answered_at     = COALESCE(EXCLUDED.answered_at,     quo_calls.answered_at),
      completed_at    = COALESCE(EXCLUDED.completed_at,    quo_calls.completed_at),
      duration_sec    = COALESCE(EXCLUDED.duration_sec,    quo_calls.duration_sec),
      valuation_id    = COALESCE(EXCLUDED.valuation_id,    quo_calls.valuation_id),
      match_source    = COALESCE(EXCLUDED.match_source,    quo_calls.match_source),
      updated_at      = now()
  `;
}

/**
 * Attach a recording / transcript / summary that arrived on its own event.
 *
 * Inserts a stub row if the media event beat `call.completed` to us — losing a
 * recording because the events raced would be worse than a row that briefly
 * has no direction.
 */
export async function attachCallMedia(
  id: string,
  patch: {
    recordingUrl?: string | null;
    voicemailUrl?: string | null;
    transcript?: unknown;
    summary?: unknown;
  },
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureCallsSchema();
  const transcript = patch.transcript == null ? null : JSON.stringify(patch.transcript);
  const summary = patch.summary == null ? null : JSON.stringify(patch.summary);
  await sql`
    INSERT INTO quo_calls (id, recording_url, voicemail_url, transcript, summary)
    VALUES (
      ${id}, ${patch.recordingUrl ?? null}, ${patch.voicemailUrl ?? null},
      ${transcript}::jsonb, ${summary}::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      recording_url = COALESCE(EXCLUDED.recording_url, quo_calls.recording_url),
      voicemail_url = COALESCE(EXCLUDED.voicemail_url, quo_calls.voicemail_url),
      transcript    = COALESCE(EXCLUDED.transcript,    quo_calls.transcript),
      summary       = COALESCE(EXCLUDED.summary,       quo_calls.summary),
      updated_at    = now()
  `;
}

export type MessageUpsert = {
  id: string;
  direction: string | null;
  status: string | null;
  fromNumber: string | null;
  toNumber: string | null;
  externalNumber: string | null;
  body: string | null;
  valuationId: number | null;
  matchSource: string | null;
};

export async function upsertMessage(m: MessageUpsert): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureCallsSchema();
  await sql`
    INSERT INTO quo_messages (
      id, direction, status, from_number, to_number, external_number,
      body, valuation_id, match_source
    ) VALUES (
      ${m.id}, ${m.direction}, ${m.status}, ${m.fromNumber}, ${m.toNumber},
      ${m.externalNumber}, ${m.body}, ${m.valuationId}, ${m.matchSource}
    )
    ON CONFLICT (id) DO UPDATE SET
      status       = COALESCE(EXCLUDED.status,       quo_messages.status),
      body         = COALESCE(EXCLUDED.body,         quo_messages.body),
      valuation_id = COALESCE(EXCLUDED.valuation_id, quo_messages.valuation_id),
      match_source = COALESCE(EXCLUDED.match_source, quo_messages.match_source)
  `;
}

/** One row of the admin call log, already joined to the linked lead. */
export type CallRow = {
  id: string;
  created_at: string;
  direction: string | null;
  status: string | null;
  external_number: string | null;
  answered_at: string | null;
  duration_sec: number | null;
  recording_url: string | null;
  voicemail_url: string | null;
  transcript: unknown;
  summary: unknown;
  handled_at: string | null;
  handled_by: string | null;
  valuation_id: number | null;
  match_source: string | null;
  legal_name: string | null;
  dba_name: string | null;
  contact_name: string | null;
  lead_status: string | null;
  mc_number: string | null;
  dot_number: string | null;
};

/**
 * Call log for the admin page. LEFT JOIN so a call from an unknown number
 * still shows — those are the ones worth triaging into the pipeline.
 */
export async function listCalls(limit = 200): Promise<CallRow[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    await ensureCallsSchema();
    return (await sql`
      SELECT c.id, c.created_at::text AS created_at, c.direction, c.status,
             c.external_number, c.answered_at::text AS answered_at,
             c.duration_sec, c.recording_url, c.voicemail_url,
             c.transcript, c.summary,
             c.handled_at::text AS handled_at, c.handled_by,
             c.valuation_id, c.match_source,
             v.legal_name, v.dba_name, v.contact_name,
             v.status AS lead_status, v.mc_number, v.dot_number
        FROM quo_calls c
        LEFT JOIN valuations v ON v.id = c.valuation_id
       ORDER BY c.created_at DESC
       LIMIT ${limit}
    `) as CallRow[];
  } catch (err) {
    console.error("[listCalls] read failed", err);
    return [];
  }
}

/** Mark a missed call as dealt with, so it drops off the recovery board. */
export async function markCallHandled(
  id: string,
  actor: string,
  handled: boolean,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureCallsSchema();
  if (handled) {
    await sql`
      UPDATE quo_calls
         SET handled_at = now(), handled_by = ${actor}, updated_at = now()
       WHERE id = ${id}
    `;
  } else {
    await sql`
      UPDATE quo_calls
         SET handled_at = NULL, handled_by = NULL, updated_at = now()
       WHERE id = ${id}
    `;
  }
}
