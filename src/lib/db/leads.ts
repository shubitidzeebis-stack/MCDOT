// Lead persistence — writes to Neon Postgres if DATABASE_URL is set,
// otherwise no-ops (so local dev works without a DB). The table is
// auto-created on first write so we don't need migrations on day one.
//
// Schema evolves additively via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
// inside ensureTable so we don't need a separate migration step.

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

  // Additive columns — safe to add to an existing table at any time.
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS attribution JSONB`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS leads_priority_idx ON leads (priority) WHERE priority IS NOT NULL`;

  initialized = true;
}

// Lead priority — surfaces on the team email + admin views so the team
// can triage hottest leads first. Heuristic, not authoritative; can be
// overridden manually.
function computePriority(payload: ContactPayload): "high" | "medium" | "low" {
  // Active Amazon Relay LLCs are the highest-value acquisitions.
  if (payload.hasRelay === "yes") return "high";
  // MC + insurance active for 6+ months (Amazon Relay onboarding bar) +
  // active insurance = qualified non-Relay lead.
  const mcAge = payload.mcAgeDays ? parseInt(payload.mcAgeDays, 10) : NaN;
  if (
    payload.hasRelay === "no" &&
    payload.insurance === "active" &&
    Number.isFinite(mcAge) &&
    mcAge >= 180
  ) {
    return "medium";
  }
  return "low";
}

export async function saveLead(
  payload: ContactPayload,
  meta: { ip: string; userAgent: string },
): Promise<{
  ok: boolean;
  reason?: string;
  id?: number;
  priority?: "high" | "medium" | "low";
}> {
  const sql = getSql();
  if (!sql) return { ok: false, reason: "no DATABASE_URL — skipped" };

  try {
    await ensureTable(sql);
    const priority = computePriority(payload);
    const attribution = payload.attribution ?? null;

    const result = await sql`
      INSERT INTO leads (
        name, email, phone, company, mc, has_relay, mc_age_days,
        insurance, state, notes, locale, ip, user_agent,
        attribution, priority
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
        ${meta.userAgent},
        ${attribution ? JSON.stringify(attribution) : null}::jsonb,
        ${priority}
      )
      RETURNING id
    `;
    const id = (result as Array<{ id: number }>)[0]?.id;
    return { ok: true, id, priority };
  } catch (err) {
    console.error("[saveLead] error", err);
    return { ok: false, reason: "db error" };
  }
}
