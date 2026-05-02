// Lead persistence — writes to Neon Postgres if DATABASE_URL is set,
// otherwise no-ops (so local dev works without a DB). The table is
// auto-created on first write so we don't need migrations on day one.

import { neon } from "@neondatabase/serverless";
import type { ContactPayload } from "@/lib/security/schemas";

let initialized = false;

type Sql = ReturnType<typeof neon>;

function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

async function ensureTable(sql: Sql) {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      company TEXT,
      mc TEXT,
      has_relay TEXT,
      mc_age_days TEXT,
      insurance TEXT,
      state TEXT,
      notes TEXT,
      locale TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email)`;
  await sql`CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC)`;
  initialized = true;
}

export async function saveLead(
  payload: ContactPayload,
  meta: { ip: string; userAgent: string },
): Promise<{ ok: boolean; reason?: string }> {
  const sql = getSql();
  if (!sql) return { ok: false, reason: "no DATABASE_URL — skipped" };

  try {
    await ensureTable(sql);
    await sql`
      INSERT INTO leads (
        name, email, phone, company, mc, has_relay, mc_age_days,
        insurance, state, notes, locale, ip, user_agent
      ) VALUES (
        ${payload.name},
        ${payload.email},
        ${payload.phone},
        ${payload.company ?? null},
        ${payload.mc ?? null},
        ${payload.hasRelay ?? null},
        ${payload.mcAgeDays ?? null},
        ${payload.insurance ?? null},
        ${payload.state ?? null},
        ${payload.notes ?? null},
        ${payload.locale},
        ${meta.ip},
        ${meta.userAgent}
      )
    `;
    return { ok: true };
  } catch (err) {
    console.error("[saveLead] error", err);
    return { ok: false, reason: "db error" };
  }
}
