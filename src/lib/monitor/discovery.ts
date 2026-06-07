// Census-based discovery of new for-hire interstate carriers.
//
// This is the front of the monitoring funnel: it sweeps the FMCSA Company
// Census (DATASETS.census) for recently-added carriers that are active,
// interstate, authorized for hire, and within a small-fleet band, then
// normalizes each raw Census row into a MonitorCandidate ready to upsert.
//
// Verified data gotchas (live 2026-06-06), all enforced below:
//   - Census add_date is YYYYMMDD TEXT — lexical order IS chronological, so it
//     is safe to range-filter and $order on. sinceDay is YYYYMMDD.
//   - Census dot_number is UNPADDED — keep it that way here; callers lpadDot()
//     before joining to InsHist/Carrier.
//   - NEVER filter on `fleetsize` (it is a letter bucket, not a count). Fleet
//     band is enforced via (power_units::number).
//   - $order MUST include add_date (never dot_number alone — not time-ordered),
//     so offset paging in socrataPaged is stable within a run.

import type { CensusRow, MonitorCandidate, Address } from "@/lib/monitor/types";
import { DATASETS, socrataPaged } from "@/lib/monitor/socrata";

// The Census fields we pull. Kept in one place so $select and the row shape
// stay in lockstep.
const CENSUS_SELECT = [
  "dot_number",
  "legal_name",
  "dba_name",
  "email_address",
  "phone",
  "phy_street",
  "phy_city",
  "phy_state",
  "phy_zip",
  "carrier_mailing_street",
  "carrier_mailing_city",
  "carrier_mailing_state",
  "carrier_mailing_zip",
  "power_units",
  "truck_units",
  "total_drivers",
  "carrier_operation",
  "classdef",
  "add_date",
  "status_code",
  "mcs150_date",
  "company_officer_1",
  "business_org_desc",
].join(", ");

// Stable time-ordered sort. add_date first (chronological), dot_number as a
// deterministic tiebreaker so offset paging is consistent.
const CENSUS_ORDER = "add_date ASC, dot_number ASC";

/**
 * Build the Census discovery $where clause.
 *
 * Active, interstate (carrier_operation 'A'), authorized-for-hire carriers
 * added on/after `sinceDay` (YYYYMMDD), within a small-fleet band measured by
 * power_units (NOT the fleetsize letter bucket). Defaults: 1..20 power units.
 */
export function buildDiscoveryWhere(opts: {
  sinceDay: string;
  minFleet?: number;
  maxFleet?: number;
}): string {
  const { sinceDay } = opts;
  const minFleet = opts.minFleet ?? 1;
  const maxFleet = opts.maxFleet ?? 20;
  return (
    `add_date >= '${sinceDay}' AND status_code='A' AND carrier_operation='A' ` +
    `AND classdef like '%AUTHORIZED FOR HIRE%' ` +
    `AND (power_units::number) between ${minFleet} and ${maxFleet}`
  );
}

// --- local helpers (in-file only) ----------------------------------------

/** Trim a Socrata string field; null when absent/empty. */
function cleanStr(v: string | null | undefined): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

/** Number(...) with a null floor — empty/non-numeric becomes null (never 0). */
function toNumOrNull(v: string | null | undefined): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s.length === 0) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Parse Census add_date (YYYYMMDD text) to ISO yyyy-mm-dd; null if invalid. */
function parseAddDate(v: string | null | undefined): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d] = m;
  // Cheap sanity check on the calendar components.
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${mo}-${d}`;
}

function makeAddress(
  street: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined,
  zip: string | null | undefined,
): Address {
  return {
    street: cleanStr(street),
    city: cleanStr(city),
    state: cleanStr(state),
    zip: cleanStr(zip),
  };
}

// --- mapping --------------------------------------------------------------

/** Normalize one raw Census row into a MonitorCandidate. */
export function mapCensusRow(row: CensusRow): MonitorCandidate {
  // UNPADDED, digits-only DOT number (Census form). Callers lpadDot() later.
  const dotNumber = String(row.dot_number ?? "").replace(/[^0-9]/g, "");

  const state = cleanStr(row.phy_state)?.toUpperCase() ?? null;

  return {
    dotNumber,
    legalName: cleanStr(row.legal_name),
    dbaName: cleanStr(row.dba_name),
    email: cleanStr(row.email_address),
    phone: cleanStr(row.phone),
    state,
    phyAddress: makeAddress(row.phy_street, row.phy_city, row.phy_state, row.phy_zip),
    mailingAddress: makeAddress(
      row.carrier_mailing_street,
      row.carrier_mailing_city,
      row.carrier_mailing_state,
      row.carrier_mailing_zip,
    ),
    powerUnits: toNumOrNull(row.power_units),
    truckUnits: toNumOrNull(row.truck_units),
    totalDrivers: toNumOrNull(row.total_drivers),
    classdef: cleanStr(row.classdef),
    addDate: parseAddDate(row.add_date),
    censusRaw: row,
  };
}

// --- discovery sweep ------------------------------------------------------

/**
 * Sweep the Census for new for-hire interstate carriers added on/after
 * `sinceDay`, paging through Socrata and normalizing each row. Defaults match
 * buildDiscoveryWhere (fleet band 1..20); maxRows defaults to 5000.
 */
export async function discoverCandidates(opts: {
  sinceDay: string;
  maxRows?: number;
  minFleet?: number;
  maxFleet?: number;
}): Promise<MonitorCandidate[]> {
  const where = buildDiscoveryWhere(opts);
  const rows = await socrataPaged<CensusRow>(
    DATASETS.census,
    { select: CENSUS_SELECT, where, order: CENSUS_ORDER },
    { maxRows: opts.maxRows ?? 5000 },
  );
  return rows.map(mapCensusRow);
}
