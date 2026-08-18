// cal.eu bookings mirrored into our own DB (table cal_meetings), so the admin
// calendar widget and the SMS reminder cron read local rows instead of hitting
// the Cal API on every render. The mirror is written by lib/cal/sync.ts.
//
// Same conventions as calls.ts: created on first use via CREATE TABLE IF NOT
// EXISTS behind a module `initialized` flag, no-op without DATABASE_URL, and
// every write is an idempotent upsert keyed on Cal's own booking `uid` — the
// sync can run any number of times (cron + page-load refresh racing) and
// converge to the same rows.
//
// reminder_sent_at doubles as the atomic claim for the 30-minute SMS (same
// pattern as quo_calls.insights_at): the cron UPDATE ... RETURNING claims each
// due row exactly once even if two cron ticks overlap, and a failed send
// releases the claim so the next tick retries.

import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

let initialized = false;

function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

async function ensureMeetingsSchema(sql: Sql): Promise<void> {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS cal_meetings (
      -- Cal's booking uid (stable across reschedules of the same booking).
      uid TEXT PRIMARY KEY,
      cal_id BIGINT,
      title TEXT,
      -- Cal's own status string ("accepted", "cancelled", ...). Everything
      -- that reads this table filters on 'accepted'.
      status TEXT NOT NULL DEFAULT 'accepted',
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ,
      attendee_name TEXT,
      attendee_email TEXT,
      attendee_phone TEXT,
      attendee_tz TEXT,
      join_url TEXT,
      -- Auto-link into the pipeline, resolved at sync time by email/phone.
      valuation_id INT,
      match_source TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      reminder_sent_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS cal_meetings_starts_idx ON cal_meetings (starts_at)`;
  // Single-row bookkeeping so page loads know whether the mirror is fresh
  // enough to skip a live Cal fetch. One row, id pinned to 1.
  await sql`
    CREATE TABLE IF NOT EXISTS cal_sync_state (
      id INT PRIMARY KEY,
      synced_at TIMESTAMPTZ
    )
  `;
  initialized = true;
}

export type MeetingUpsert = {
  uid: string;
  calId: number | null;
  title: string | null;
  status: string;
  startsAt: string;
  endsAt: string | null;
  attendeeName: string | null;
  attendeeEmail: string | null;
  attendeePhone: string | null;
  attendeeTz: string | null;
  joinUrl: string | null;
  valuationId: number | null;
  matchSource: string | null;
};

export async function upsertMeeting(m: MeetingUpsert): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureMeetingsSchema(sql);
  await sql`
    INSERT INTO cal_meetings (
      uid, cal_id, title, status, starts_at, ends_at,
      attendee_name, attendee_email, attendee_phone, attendee_tz,
      join_url, valuation_id, match_source
    ) VALUES (
      ${m.uid}, ${m.calId}, ${m.title}, ${m.status}, ${m.startsAt}, ${m.endsAt},
      ${m.attendeeName}, ${m.attendeeEmail}, ${m.attendeePhone}, ${m.attendeeTz},
      ${m.joinUrl}, ${m.valuationId}, ${m.matchSource}
    )
    ON CONFLICT (uid) DO UPDATE SET
      cal_id = EXCLUDED.cal_id,
      title = COALESCE(EXCLUDED.title, cal_meetings.title),
      status = EXCLUDED.status,
      starts_at = EXCLUDED.starts_at,
      ends_at = EXCLUDED.ends_at,
      attendee_name = COALESCE(EXCLUDED.attendee_name, cal_meetings.attendee_name),
      attendee_email = COALESCE(EXCLUDED.attendee_email, cal_meetings.attendee_email),
      attendee_phone = COALESCE(EXCLUDED.attendee_phone, cal_meetings.attendee_phone),
      attendee_tz = COALESCE(EXCLUDED.attendee_tz, cal_meetings.attendee_tz),
      join_url = COALESCE(EXCLUDED.join_url, cal_meetings.join_url),
      -- Keep the first successful lead match; a later sync where the lookup
      -- happened to miss must not blank an existing link.
      valuation_id = COALESCE(cal_meetings.valuation_id, EXCLUDED.valuation_id),
      match_source = COALESCE(cal_meetings.match_source, EXCLUDED.match_source),
      -- A reschedule moves starts_at → the old reminder no longer covers the
      -- new time, so re-arm it. Same-time re-syncs keep the sent marker.
      reminder_sent_at = CASE
        WHEN cal_meetings.starts_at IS DISTINCT FROM EXCLUDED.starts_at THEN NULL
        ELSE cal_meetings.reminder_sent_at
      END,
      updated_at = now()
  `;
}

/**
 * Reconcile deletions: any FUTURE row still marked accepted whose uid was NOT
 * in the latest "upcoming" fetch has been cancelled (or rescheduled onto a new
 * uid) on Cal's side. Self-healing: if Cal ever returns the uid again, the
 * upsert above flips it straight back to accepted.
 *
 * Cal uids are URL-safe base62 (no commas), so the string_to_array trick the
 * codebase already uses for the neon http driver is unambiguous here too.
 */
export async function cancelMissingUpcoming(keepUids: string[]): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;
  await ensureMeetingsSchema(sql);
  const keep = keepUids.join(",");
  const rows = (await sql`
    UPDATE cal_meetings
       SET status = 'cancelled', updated_at = now()
     WHERE status = 'accepted'
       AND starts_at > now()
       AND NOT (uid = ANY(string_to_array(${keep}, ',')))
    RETURNING uid
  `) as Array<{ uid: string }>;
  return rows.length;
}

export type MeetingRow = {
  uid: string;
  title: string | null;
  status: string;
  starts_at: string;
  ends_at: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  join_url: string | null;
  valuation_id: number | null;
  legal_name: string | null;
  // Lead snapshot for the widget's company popover — joined here so one
  // query feeds the whole card and clicking a company needs no round-trip.
  dba_name: string | null;
  mc_number: string | null;
  dot_number: string | null;
  lead_status: string | null;
  lead_source: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  telephone: string | null;
  valuation_low: number | null;
  valuation_high: number | null;
  lead_city: string | null;
  lead_state: string | null;
};

/**
 * Meetings for the admin widget: a little bit of the past (so a meeting that
 * just started, or this morning's, still shows under "today") plus the next
 * ~3 days. The widget buckets rows into today/tomorrow in the VIEWER's
 * timezone, which this query can't know — hence the generous window.
 */
export async function listUpcomingMeetings(): Promise<MeetingRow[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureMeetingsSchema(sql);
  return (await sql`
    SELECT m.uid, m.title, m.status,
           m.starts_at::text AS starts_at,
           m.ends_at::text AS ends_at,
           m.attendee_name, m.attendee_email, m.join_url, m.valuation_id,
           v.legal_name, v.dba_name, v.mc_number, v.dot_number,
           v.status AS lead_status, v.source AS lead_source,
           v.contact_name, v.contact_email, v.contact_phone, v.telephone,
           v.valuation_low, v.valuation_high,
           v.phy_address->>'city' AS lead_city,
           v.phy_address->>'state' AS lead_state
      FROM cal_meetings m
      LEFT JOIN valuations v ON v.id = m.valuation_id
     WHERE m.status = 'accepted'
       AND m.starts_at > now() - interval '12 hours'
       AND m.starts_at < now() + interval '72 hours'
     ORDER BY m.starts_at
     LIMIT 40
  `) as MeetingRow[];
}

export type DueReminder = {
  uid: string;
  starts_at: string;
  attendee_name: string | null;
  join_url: string | null;
  legal_name: string | null;
};

/**
 * Atomically claim every accepted meeting starting within the next
 * `withinMinutes` whose reminder hasn't been sent. The claim-in-the-WHERE
 * makes overlapping cron ticks safe: exactly one caller gets each row.
 * A booking made closer-in than the window still gets a reminder — the next
 * tick picks it up immediately rather than never.
 */
export async function claimDueReminders(withinMinutes = 30): Promise<DueReminder[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureMeetingsSchema(sql);
  return (await sql`
    UPDATE cal_meetings m
       SET reminder_sent_at = now(), updated_at = now()
     WHERE m.status = 'accepted'
       AND m.reminder_sent_at IS NULL
       AND m.starts_at > now()
       AND m.starts_at <= now() + make_interval(mins => ${withinMinutes})
    RETURNING m.uid, m.starts_at::text AS starts_at, m.attendee_name, m.join_url,
              (SELECT v.legal_name FROM valuations v WHERE v.id = m.valuation_id) AS legal_name
  `) as DueReminder[];
}

/** Release a claim after a failed SMS so the next cron tick retries it. */
export async function releaseReminder(uid: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    UPDATE cal_meetings SET reminder_sent_at = NULL, updated_at = now()
    WHERE uid = ${uid}
  `;
}

export async function getSyncedAt(): Promise<Date | null> {
  const sql = getSql();
  if (!sql) return null;
  await ensureMeetingsSchema(sql);
  const rows = (await sql`
    SELECT synced_at::text AS synced_at FROM cal_sync_state WHERE id = 1
  `) as Array<{ synced_at: string | null }>;
  const iso = rows[0]?.synced_at;
  return iso ? new Date(iso) : null;
}

export async function markSynced(): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureMeetingsSchema(sql);
  await sql`
    INSERT INTO cal_sync_state (id, synced_at) VALUES (1, now())
    ON CONFLICT (id) DO UPDATE SET synced_at = now()
  `;
}
