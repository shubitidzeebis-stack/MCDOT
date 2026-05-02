// Partial-lead persistence — captures form-fill progress as the user
// types, before they hit Submit.
//
// Stored in a separate `partial_leads` table to keep `leads` clean as
// the qualified-submission table. When a partial converts to a full
// submission, we mark the partial as `converted = true` and link it via
// session_id, so we have an audit trail.

import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

let initialized = false;

function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

async function ensureTable(sql: Sql) {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS partial_leads (
      session_id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      name TEXT,
      email TEXT,
      phone TEXT,
      company TEXT,
      mc TEXT,
      has_relay TEXT,
      mc_age_days TEXT,
      insurance TEXT,
      state TEXT,
      notes TEXT,
      locale TEXT,
      ip TEXT,
      user_agent TEXT,
      page TEXT,
      converted BOOLEAN NOT NULL DEFAULT false,
      converted_lead_id INTEGER
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS partial_leads_email_idx ON partial_leads (email)`;
  await sql`CREATE INDEX IF NOT EXISTS partial_leads_updated_at_idx ON partial_leads (updated_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS partial_leads_converted_idx ON partial_leads (converted) WHERE converted = false`;
  initialized = true;
}

export type PartialPayload = {
  sessionId: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  mc?: string;
  hasRelay?: string;
  mcAgeDays?: string;
  insurance?: string;
  state?: string;
  notes?: string;
  locale?: string;
  page?: string;
};

export async function savePartial(
  payload: PartialPayload,
  meta: { ip: string; userAgent: string },
): Promise<{ ok: boolean; reason?: string }> {
  const sql = getSql();
  if (!sql) return { ok: false, reason: "no DATABASE_URL — skipped" };

  try {
    await ensureTable(sql);
    // Upsert by session_id so each partial captures the latest state of
    // the form. Don't overwrite a value with empty/null — keeps the
    // freshest non-empty value the user typed.
    await sql`
      INSERT INTO partial_leads (
        session_id, name, email, phone, company, mc, has_relay,
        mc_age_days, insurance, state, notes, locale, page, ip, user_agent
      ) VALUES (
        ${payload.sessionId},
        ${payload.name ?? null},
        ${payload.email ?? null},
        ${payload.phone ?? null},
        ${payload.company ?? null},
        ${payload.mc ?? null},
        ${payload.hasRelay ?? null},
        ${payload.mcAgeDays ?? null},
        ${payload.insurance ?? null},
        ${payload.state ?? null},
        ${payload.notes ?? null},
        ${payload.locale ?? null},
        ${payload.page ?? null},
        ${meta.ip},
        ${meta.userAgent}
      )
      ON CONFLICT (session_id) DO UPDATE SET
        updated_at = now(),
        name        = COALESCE(NULLIF(EXCLUDED.name, ''),        partial_leads.name),
        email       = COALESCE(NULLIF(EXCLUDED.email, ''),       partial_leads.email),
        phone       = COALESCE(NULLIF(EXCLUDED.phone, ''),       partial_leads.phone),
        company     = COALESCE(NULLIF(EXCLUDED.company, ''),     partial_leads.company),
        mc          = COALESCE(NULLIF(EXCLUDED.mc, ''),          partial_leads.mc),
        has_relay   = COALESCE(NULLIF(EXCLUDED.has_relay, ''),   partial_leads.has_relay),
        mc_age_days = COALESCE(NULLIF(EXCLUDED.mc_age_days, ''), partial_leads.mc_age_days),
        insurance   = COALESCE(NULLIF(EXCLUDED.insurance, ''),   partial_leads.insurance),
        state       = COALESCE(NULLIF(EXCLUDED.state, ''),       partial_leads.state),
        notes       = COALESCE(NULLIF(EXCLUDED.notes, ''),       partial_leads.notes),
        locale      = COALESCE(NULLIF(EXCLUDED.locale, ''),      partial_leads.locale),
        page        = COALESCE(NULLIF(EXCLUDED.page, ''),        partial_leads.page),
        ip          = EXCLUDED.ip,
        user_agent  = EXCLUDED.user_agent
    `;
    return { ok: true };
  } catch (err) {
    console.error("[savePartial] error", err);
    return { ok: false, reason: "db error" };
  }
}

// Marks a partial as converted to a full lead. Best-effort — failure
// doesn't break the user-facing flow.
export async function markPartialConverted(
  sessionId: string,
  leadId: number,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  try {
    await sql`
      UPDATE partial_leads
      SET converted = true, converted_lead_id = ${leadId}
      WHERE session_id = ${sessionId}
    `;
  } catch (err) {
    console.error("[markPartialConverted] error", err);
  }
}
