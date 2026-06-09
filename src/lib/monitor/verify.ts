// Per-carrier verification: the step that turns a discovered candidate into a
// rated, eligibility-scored prospect.
//
// Pulls the two bulk tables that carry CURRENT truth (Carrier authority +
// bipd_file) and HISTORICAL insurance (InsHist), joining via an 8-digit padded
// DOT (Census is unpadded — see lpadDot). It then runs the pure engine:
//   currentInsured  <- Carrier.bipd_file (NOT InsHist; the active policy is
//                      never in InsHist)
//   insurance       <- rateInsuranceHistory(InsHist rows, { currentInsured })
//   eligibility     <- computeEligibility(anchor = earliest BIPD effective)
//   audit + score   <- combineAuditScore / acquisitionScore (UCC still 'unknown'
//                      until the safety team fills it in)
//
// Two entry points share ONE pure evaluator (evaluateCarrier) so the single and
// batched paths can never diverge:
//   verifyCandidate(input)        — fetch one carrier (on-demand tool, tests)
//   verifyCandidatesBatch(inputs) — fetch Carrier + InsHist for MANY DOTs in two
//                                   Socrata IN(...) queries, group in JS, then
//                                   evaluate each. Turns the 34k backlog from
//                                   ~2 HTTP calls per carrier into ~2 per batch.
//
// QCMobile is NOT called here (that's the hot-prospect enrich step in a later
// phase) so this stays entirely on bulk data and well under any quota.

import { DATASETS, lpadDot, socrataQuery } from "@/lib/monitor/socrata";
import { rateInsuranceHistory } from "@/lib/audit/insurance-rating";
import { computeEligibility } from "@/lib/monitor/eligibility";
import { acquisitionScore, combineAuditScore } from "@/lib/audit/score";
import type {
  AuditRating,
  CarrierRow,
  EligibilityResult,
  InsHistRow,
  InsuranceHistoryResult,
} from "@/lib/monitor/types";

// FMCSA's test/sentinel row. lpadDot("0") and other degenerate inputs collapse
// to this — never query it (it returns meaningless data).
const SENTINEL_DOT = "00000000";

const CARRIER_SELECT =
  "dot_number,docket_number,common_stat,contract_stat,broker_stat,property_chk,passenger_chk,bipd_file,legal_name,dba_name";
const INSHIST_SELECT =
  "dot_number,docket_number,ins_form_code,ins_class_code,mod_col_1,mod_col_3,policy_no,name_company,min_cov_amount,effective_date,cancl_effective_date,cancl_method";

export type VerifyResult = {
  dotNumber: string;
  carrierFound: boolean;
  authorityActive: boolean;
  brokerOnly: boolean;
  currentInsured: boolean;
  insurance: InsuranceHistoryResult;
  eligibility: EligibilityResult;
  auditRating: AuditRating;
  acquisitionScore: number;
};

export type VerifyInput = {
  dotNumber: string;
  addDate: string | null;
  powerUnits?: number | null;
  today?: Date;
};

function isActive(s: string | null | undefined): boolean {
  return s === "A";
}

function bipdOnFile(row: CarrierRow): boolean {
  const v = (row.bipd_file ?? "").replace(/[^0-9]/g, "");
  return v.length > 0 && Number(v) > 0;
}

// ---------------------------------------------------------------------------
// Pure evaluator — given the already-fetched Carrier + InsHist rows for ONE
// carrier, produce its verdict. No I/O, so it is identical for the single and
// batched fetch paths and is trivially unit-testable.
// ---------------------------------------------------------------------------
export function evaluateCarrier(args: {
  dotNumber: string;
  addDate: string | null;
  powerUnits?: number | null;
  today?: Date;
  carrierRows: CarrierRow[];
  insRows: InsHistRow[];
}): VerifyResult {
  const { carrierRows, insRows } = args;

  const carrierFound = carrierRows.length > 0;
  const currentInsured = carrierRows.some(bipdOnFile);
  // Active for-hire property authority on at least one docket, not a bus line.
  const authorityActive = carrierRows.some(
    (r) =>
      (isActive(r.common_stat) || isActive(r.contract_stat)) &&
      r.property_chk === "Y" &&
      r.passenger_chk !== "Y",
  );
  // Broker-only = every docket is broker-active with no common/contract active.
  const brokerOnly =
    carrierFound &&
    carrierRows.every(
      (r) =>
        isActive(r.broker_stat) &&
        !isActive(r.common_stat) &&
        !isActive(r.contract_stat),
    );

  // The active insurer's NAME isn't in the bulk Carrier table; it's filled in
  // later by the QCMobile hot-prospect enrich step.
  const insurance = rateInsuranceHistory(insRows, {
    currentInsured,
    currentInsurer: null,
    today: args.today,
  });

  const eligibility = computeEligibility({
    anchorDate: insurance.earliestBipdEffective,
    anchorSource: "bipd",
    addDate: args.addDate,
    authorityActive,
    continuous: insurance.continuous,
    currentlyUninsured: insurance.lapsedNow,
    today: args.today,
  });

  // UCC is human-supplied later → 'unknown' here. No QCMobile valuation yet.
  const auditRating = combineAuditScore(insurance.rating, "unknown", {
    currentlyUninsured: insurance.lapsedNow,
  });
  const score = acquisitionScore({
    insurance: insurance.rating,
    ucc: "unknown",
    valuationFactor: null,
    fleetUnits: args.powerUnits ?? null,
    daysTo180: eligibility.daysTo180,
    eligibility: eligibility.state,
    currentlyUninsured: insurance.lapsedNow,
  });

  return {
    dotNumber: args.dotNumber,
    carrierFound,
    authorityActive,
    brokerOnly,
    currentInsured,
    insurance,
    eligibility,
    auditRating,
    acquisitionScore: score,
  };
}

// ---------------------------------------------------------------------------
// Fetch helpers — single (one DOT) and batched (a Socrata IN clause).
// ---------------------------------------------------------------------------
async function fetchCarrierRows(dot8: string): Promise<CarrierRow[]> {
  return socrataQuery<CarrierRow>(DATASETS.carrier, {
    select: CARRIER_SELECT,
    where: `dot_number='${dot8}'`,
    limit: 50,
  });
}

async function fetchInsHistRows(dot8: string): Promise<InsHistRow[]> {
  // No $order on the MM/DD/YYYY text dates (lexical != chronological) — the
  // rating module parses + sorts in JS. A carrier has only a handful of rows.
  return socrataQuery<InsHistRow>(DATASETS.insHist, {
    select: INSHIST_SELECT,
    where: `dot_number='${dot8}'`,
    limit: 200,
  });
}

// dot8s are digit-only (lpadDot output) so inlining them in an IN(...) literal
// is injection-safe.
function inClause(dot8s: string[]): string {
  return dot8s.map((d) => `'${d}'`).join(",");
}

async function fetchCarrierRowsBatch(dot8s: string[]): Promise<CarrierRow[]> {
  return socrataQuery<CarrierRow>(DATASETS.carrier, {
    select: CARRIER_SELECT,
    where: `dot_number IN (${inClause(dot8s)})`,
    limit: dot8s.length * 50,
  });
}

async function fetchInsHistRowsBatch(dot8s: string[]): Promise<InsHistRow[]> {
  return socrataQuery<InsHistRow>(DATASETS.insHist, {
    select: INSHIST_SELECT,
    where: `dot_number IN (${inClause(dot8s)})`,
    // Match the single-carrier budget (200 rows/DOT): Socrata's limit is GLOBAL
    // across the batch, so a smaller cap could silently truncate one carrier's
    // history (hiding gaps/REVOKED rows -> false green). 100 × 200 = 20k ≤ the
    // 50k SODA max.
    limit: dot8s.length * 200,
  });
}

function groupByDot<T extends { dot_number?: string | null }>(
  rows: T[],
): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = lpadDot(r.dot_number ?? "");
    const arr = m.get(k);
    if (arr) arr.push(r);
    else m.set(k, [r]);
  }
  return m;
}

// Single-carrier verify (on-demand audit tool, unit tests).
export async function verifyCandidate(input: VerifyInput): Promise<VerifyResult> {
  const dot8 = lpadDot(input.dotNumber);
  if (dot8 === SENTINEL_DOT) {
    return evaluateCarrier({ ...input, carrierRows: [], insRows: [] });
  }
  const [carrierRows, insRows] = await Promise.all([
    fetchCarrierRows(dot8),
    fetchInsHistRows(dot8),
  ]);
  return evaluateCarrier({ ...input, carrierRows, insRows });
}

// Batched verify — two Socrata queries for the whole chunk, grouped + evaluated
// in JS. Results are returned in the SAME order as `inputs`. Sentinel/empty
// DOTs resolve to a not-found verdict (carrierFound=false) without a query.
export async function verifyCandidatesBatch(
  inputs: VerifyInput[],
  today?: Date,
): Promise<VerifyResult[]> {
  const dot8s: string[] = [];
  const seen = new Set<string>();
  for (const inp of inputs) {
    const dot8 = lpadDot(inp.dotNumber);
    if (!dot8 || dot8 === SENTINEL_DOT || seen.has(dot8)) continue;
    seen.add(dot8);
    dot8s.push(dot8);
  }

  let carrierByDot = new Map<string, CarrierRow[]>();
  let insByDot = new Map<string, InsHistRow[]>();
  if (dot8s.length > 0) {
    const [carrierRows, insRows] = await Promise.all([
      fetchCarrierRowsBatch(dot8s),
      fetchInsHistRowsBatch(dot8s),
    ]);
    carrierByDot = groupByDot(carrierRows);
    insByDot = groupByDot(insRows);
  }

  return inputs.map((inp) => {
    const dot8 = lpadDot(inp.dotNumber);
    return evaluateCarrier({
      ...inp,
      today: inp.today ?? today,
      carrierRows: carrierByDot.get(dot8) ?? [],
      insRows: insByDot.get(dot8) ?? [],
    });
  });
}
