// Valuation persistence — every MC/DOT lookup gets recorded in the
// `valuations` table immediately, before contact info is collected.
// That way even bouncing visitors enrich our pipeline.
//
// The table is auto-created on first write (matching the project's
// "no-migration" convention from leads.ts / partial-leads.ts).
//
// Lifecycle:
// 1. createValuation() — server saves FMCSA snapshot tied to sessionId.
//    Returns id. has_amazon_relay + valuation_low/high are still null.
// 2. updateValuationContact() — when the user provides email/phone/name.
// 3. finalizeValuation() — when relay flag is given and pricing computed.
//    Sets has_amazon_relay + valuation_low/high.

import { neon } from "@neondatabase/serverless";
import { deriveInsuranceStatus, type FmcsaCarrier } from "@/lib/fmcsa";
import type { ValuationResult } from "@/lib/valuation";

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
    CREATE TABLE IF NOT EXISTS valuations (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      session_id TEXT,
      mc_number TEXT,
      dot_number TEXT,
      legal_name TEXT,
      dba_name TEXT,
      authority_status TEXT,
      authority_age_days INT,
      power_units INT,
      drivers_count INT,
      phy_address JSONB,
      vehicle_oos_pct NUMERIC,
      vehicle_oos_national_avg NUMERIC,
      driver_oos_pct NUMERIC,
      driver_oos_national_avg NUMERIC,
      crashes_24mo INT,
      safety_rating TEXT,
      bipd_insurance_on_file NUMERIC,
      mcs150_outdated TEXT,
      has_amazon_relay BOOLEAN,
      valuation_low INT,
      valuation_high INT,
      valuation_floored_reason TEXT,
      fmcsa_raw JSONB,
      attribution JSONB,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      contact_provided_at TIMESTAMPTZ,
      ip TEXT,
      user_agent TEXT
    )
  `;
  // Status workflow + internal notes — additive columns so this works
  // on existing tables that pre-date the workflow feature.
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS notes_internal TEXT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS telephone TEXT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS mcs150_form_date TEXT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS insurance_status TEXT`;
  // Internal test funnel-walks (?test=1). Real rows default false.
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false`;
  // --- Outbound monitoring agent (additive) ---------------------------------
  // The valuations table is reused for outbound acquisition targets discovered
  // by the monitoring agent. `source` partitions inbound (the /get-offer
  // wizard) from monitor (the agent). Existing rows backfill to 'inbound' via
  // the column default, so all current admin views keep working unchanged.
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'inbound'`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS monitor_stage TEXT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS add_date DATE`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS census_email TEXT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS bipd_anchor_date DATE`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS eligible_at DATE`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS days_to_180 INT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS eligibility_state TEXT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS insurance_current BOOLEAN`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS insurance_rating TEXT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS insurance_gaps JSONB`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS ucc_status TEXT DEFAULT 'pending'`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS ucc_rating TEXT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS ucc_findings JSONB`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS audited_by TEXT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS audited_at TIMESTAMPTZ`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS audit_score TEXT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS acquisition_score INT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS persona TEXT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS outreach_channel TEXT`;
  // Safety audit (FMCSA SMS/SAFER enrich): OOS rates, crashes, rating + verdict.
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS safety_checked_at TIMESTAMPTZ`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS driver_oos_rate REAL`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS vehicle_oos_rate REAL`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS crash_total INT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS safety_rating TEXT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS safety_status TEXT`;
  await sql`ALTER TABLE valuations ADD COLUMN IF NOT EXISTS safety_findings JSONB`;
  await sql`CREATE INDEX IF NOT EXISTS valuations_mc_idx ON valuations (mc_number)`;
  await sql`CREATE INDEX IF NOT EXISTS valuations_dot_idx ON valuations (dot_number)`;
  await sql`CREATE INDEX IF NOT EXISTS valuations_session_idx ON valuations (session_id)`;
  await sql`CREATE INDEX IF NOT EXISTS valuations_email_idx ON valuations (contact_email)`;
  await sql`CREATE INDEX IF NOT EXISTS valuations_created_at_idx ON valuations (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS valuations_status_idx ON valuations (status)`;
  // Monitor partition + work-queue ordering indexes. The partial unique index
  // makes discovery upserts idempotent (one monitor row per DOT) while still
  // allowing a separate inbound row for the same DOT.
  await sql`CREATE INDEX IF NOT EXISTS valuations_source_idx ON valuations (source)`;
  await sql`CREATE INDEX IF NOT EXISTS valuations_monitor_stage_idx ON valuations (monitor_stage)`;
  await sql`CREATE INDEX IF NOT EXISTS valuations_eligible_at_idx ON valuations (eligible_at)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS valuations_monitor_dot_uq ON valuations (dot_number) WHERE source = 'monitor'`;
  initialized = true;
}

// Ensure the valuations schema (including the additive monitor columns) exists.
// Safe to call from READ paths (admin dashboard, CSV export) so queries that
// reference newer columns like `source` don't fail on a fresh deploy before the
// first wizard write triggers ensureTable(). No-op without DATABASE_URL.
export async function ensureValuationsSchema(): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  try {
    await ensureTable(sql);
  } catch (err) {
    console.error("[ensureValuationsSchema] error", err);
  }
}

export type ValuationStatus =
  | "new"
  | "contacted"
  | "diligence"
  | "offer_sent"
  | "closed_won"
  | "closed_lost";

export const VALUATION_STATUSES: ValuationStatus[] = [
  "new",
  "contacted",
  "diligence",
  "offer_sent",
  "closed_won",
  "closed_lost",
];

// Admin-side hard delete. Caller is responsible for verifying auth
// upstream. Used to clear test rows from the admin panel.
export async function adminDeleteValuation(id: number): Promise<{ ok: boolean }> {
  const sql = getSql();
  if (!sql) return { ok: false };
  try {
    await ensureTable(sql);
    await sql`DELETE FROM valuations WHERE id = ${id}`;
    return { ok: true };
  } catch (err) {
    console.error("[adminDeleteValuation] error", err);
    return { ok: false };
  }
}

// Admin-side mutation. Updates status and/or notes by id. No session-id
// auth here — caller is responsible for verifying ADMIN_KEY upstream.
export async function adminUpdateValuation(
  id: number,
  patch: { status?: ValuationStatus; notesInternal?: string },
): Promise<{ ok: boolean }> {
  const sql = getSql();
  if (!sql) return { ok: false };
  try {
    await ensureTable(sql);
    if (patch.status !== undefined && patch.notesInternal !== undefined) {
      await sql`
        UPDATE valuations
           SET status = ${patch.status},
               status_updated_at = now(),
               notes_internal = ${patch.notesInternal},
               updated_at = now()
         WHERE id = ${id}
      `;
    } else if (patch.status !== undefined) {
      await sql`
        UPDATE valuations
           SET status = ${patch.status},
               status_updated_at = now(),
               updated_at = now()
         WHERE id = ${id}
      `;
    } else if (patch.notesInternal !== undefined) {
      await sql`
        UPDATE valuations
           SET notes_internal = ${patch.notesInternal},
               updated_at = now()
         WHERE id = ${id}
      `;
    }
    return { ok: true };
  } catch (err) {
    console.error("[adminUpdateValuation] error", err);
    return { ok: false };
  }
}

export type CreateValuationInput = {
  sessionId: string;
  carrier: FmcsaCarrier;
  mcNumbers: string[];
  authorityAgeDays: number | null;
  telephone: string | null;
  mcs150FormDate: string | null;
  attribution: unknown;
  isTest?: boolean;
};

export async function createValuation(
  input: CreateValuationInput,
  meta: { ip: string; userAgent: string },
): Promise<{ ok: boolean; id?: number; reason?: string }> {
  const sql = getSql();
  if (!sql) return { ok: false, reason: "no DATABASE_URL — skipped" };

  try {
    await ensureTable(sql);
    const c = input.carrier;
    const mcNumber = input.mcNumbers[0] ?? null;
    const phyAddress = {
      street: c.phyStreet,
      city: c.phyCity,
      state: c.phyState,
      zip: c.phyZipcode,
      country: c.phyCountry,
    };

    const insuranceStatus = deriveInsuranceStatus(c);
    const result = await sql`
      INSERT INTO valuations (
        session_id, mc_number, dot_number, legal_name, dba_name,
        authority_status, authority_age_days, power_units, drivers_count,
        phy_address, vehicle_oos_pct, vehicle_oos_national_avg,
        driver_oos_pct, driver_oos_national_avg, crashes_24mo,
        safety_rating, bipd_insurance_on_file, mcs150_outdated,
        telephone, mcs150_form_date, insurance_status,
        fmcsa_raw, attribution, ip, user_agent, is_test
      ) VALUES (
        ${input.sessionId},
        ${mcNumber},
        ${String(c.dotNumber)},
        ${c.legalName},
        ${c.dbaName},
        ${c.commonAuthorityStatus},
        ${input.authorityAgeDays},
        ${c.totalPowerUnits},
        ${c.totalDrivers},
        ${JSON.stringify(phyAddress)}::jsonb,
        ${c.vehicleOosRate},
        ${Number(c.vehicleOosRateNationalAverage) || null},
        ${c.driverOosRate},
        ${Number(c.driverOosRateNationalAverage) || null},
        ${c.crashTotal},
        ${c.safetyRating},
        ${Number(c.bipdInsuranceOnFile) || 0},
        ${c.mcs150Outdated},
        ${input.telephone},
        ${input.mcs150FormDate},
        ${insuranceStatus},
        ${JSON.stringify(c)}::jsonb,
        ${input.attribution ? JSON.stringify(input.attribution) : null}::jsonb,
        ${meta.ip},
        ${meta.userAgent},
        ${input.isTest ?? false}
      )
      RETURNING id
    `;
    const id = (result as Array<{ id: number }>)[0]?.id;
    return { ok: true, id };
  } catch (err) {
    console.error("[createValuation] error", err);
    return { ok: false, reason: "db error" };
  }
}

export async function updateValuationContact(
  id: number,
  sessionId: string,
  contact: { name?: string; email?: string; phone?: string },
): Promise<{ ok: boolean }> {
  const sql = getSql();
  if (!sql) return { ok: false };
  try {
    await ensureTable(sql);
    await sql`
      UPDATE valuations
      SET
        contact_name = COALESCE(${contact.name ?? null}, contact_name),
        contact_email = COALESCE(${contact.email ?? null}, contact_email),
        contact_phone = COALESCE(${contact.phone ?? null}, contact_phone),
        contact_provided_at = COALESCE(contact_provided_at, now()),
        updated_at = now()
      WHERE id = ${id} AND session_id = ${sessionId}
    `;
    return { ok: true };
  } catch (err) {
    console.error("[updateValuationContact] error", err);
    return { ok: false };
  }
}

export async function finalizeValuation(
  id: number,
  sessionId: string,
  hasAmazonRelay: boolean,
  result: ValuationResult,
): Promise<{ ok: boolean }> {
  const sql = getSql();
  if (!sql) return { ok: false };
  try {
    await ensureTable(sql);
    await sql`
      UPDATE valuations
      SET
        has_amazon_relay = ${hasAmazonRelay},
        valuation_low = ${result.low},
        valuation_high = ${result.high},
        valuation_floored_reason = ${result.flooredReason},
        updated_at = now()
      WHERE id = ${id} AND session_id = ${sessionId}
    `;
    return { ok: true };
  } catch (err) {
    console.error("[finalizeValuation] error", err);
    return { ok: false };
  }
}
