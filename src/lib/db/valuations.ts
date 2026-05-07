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
import type { FmcsaCarrier } from "@/lib/fmcsa";
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
  await sql`CREATE INDEX IF NOT EXISTS valuations_mc_idx ON valuations (mc_number)`;
  await sql`CREATE INDEX IF NOT EXISTS valuations_dot_idx ON valuations (dot_number)`;
  await sql`CREATE INDEX IF NOT EXISTS valuations_session_idx ON valuations (session_id)`;
  await sql`CREATE INDEX IF NOT EXISTS valuations_email_idx ON valuations (contact_email)`;
  await sql`CREATE INDEX IF NOT EXISTS valuations_created_at_idx ON valuations (created_at DESC)`;
  initialized = true;
}

export type CreateValuationInput = {
  sessionId: string;
  carrier: FmcsaCarrier;
  mcNumbers: string[];
  authorityAgeDays: number | null;
  attribution: unknown;
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

    const result = await sql`
      INSERT INTO valuations (
        session_id, mc_number, dot_number, legal_name, dba_name,
        authority_status, authority_age_days, power_units, drivers_count,
        phy_address, vehicle_oos_pct, vehicle_oos_national_avg,
        driver_oos_pct, driver_oos_national_avg, crashes_24mo,
        safety_rating, bipd_insurance_on_file, mcs150_outdated,
        fmcsa_raw, attribution, ip, user_agent
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
        ${JSON.stringify(c)}::jsonb,
        ${input.attribution ? JSON.stringify(input.attribution) : null}::jsonb,
        ${meta.ip},
        ${meta.userAgent}
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
