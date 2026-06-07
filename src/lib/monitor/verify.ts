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

function isActive(s: string | null | undefined): boolean {
  return s === "A";
}

function bipdOnFile(row: CarrierRow): boolean {
  const v = (row.bipd_file ?? "").replace(/[^0-9]/g, "");
  return v.length > 0 && Number(v) > 0;
}

async function fetchCarrierRows(dot8: string): Promise<CarrierRow[]> {
  return socrataQuery<CarrierRow>(DATASETS.carrier, {
    select:
      "dot_number,docket_number,common_stat,contract_stat,broker_stat,property_chk,passenger_chk,bipd_file,legal_name,dba_name",
    where: `dot_number='${dot8}'`,
    limit: 50,
  });
}

async function fetchInsHistRows(dot8: string): Promise<InsHistRow[]> {
  // No $order on the MM/DD/YYYY text dates (lexical != chronological) — the
  // rating module parses + sorts in JS. A carrier has only a handful of rows.
  return socrataQuery<InsHistRow>(DATASETS.insHist, {
    select:
      "dot_number,docket_number,ins_form_code,ins_class_code,mod_col_1,mod_col_3,policy_no,name_company,min_cov_amount,effective_date,cancl_effective_date,cancl_method",
    where: `dot_number='${dot8}'`,
    limit: 200,
  });
}

export async function verifyCandidate(input: {
  dotNumber: string;
  addDate: string | null;
  powerUnits?: number | null;
  today?: Date;
}): Promise<VerifyResult> {
  const dot8 = lpadDot(input.dotNumber);
  const [carrierRows, insRows] = await Promise.all([
    fetchCarrierRows(dot8),
    fetchInsHistRows(dot8),
  ]);

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
    today: input.today,
  });

  const eligibility = computeEligibility({
    anchorDate: insurance.earliestBipdEffective,
    anchorSource: "bipd",
    addDate: input.addDate,
    authorityActive,
    continuous: insurance.continuous,
    currentlyUninsured: insurance.lapsedNow,
    today: input.today,
  });

  // UCC is human-supplied later → 'unknown' here. No QCMobile valuation yet.
  const auditRating = combineAuditScore(insurance.rating, "unknown", {
    currentlyUninsured: insurance.lapsedNow,
  });
  const score = acquisitionScore({
    insurance: insurance.rating,
    ucc: "unknown",
    valuationFactor: null,
    fleetUnits: input.powerUnits ?? null,
    daysTo180: eligibility.daysTo180,
    eligibility: eligibility.state,
    currentlyUninsured: insurance.lapsedNow,
  });

  return {
    dotNumber: input.dotNumber,
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
