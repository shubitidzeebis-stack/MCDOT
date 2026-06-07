// Combined audit scoring ("rate both") — audit/score.ts
//
// Two pure, deterministic functions that fold the per-signal ratings produced by
// the insurance and UCC audits into (a) a single worst-of audit rating and
// (b) a 0..100 acquisition-attractiveness score. No Date usage, no I/O — every
// output is a pure function of the inputs so rows score identically on re-run.
//
// ---------------------------------------------------------------------------
// combineAuditScore(insurance, ucc, opts?) -> AuditRating ('green'|'amber'|'red')
// ---------------------------------------------------------------------------
// Maps each 4-value rating onto a severity ordering green < amber < red and
// returns the WORST of the two. The 'unknown' value (pending enrichment) is
// treated as 'amber' — it is capped at amber so a not-yet-checked signal can
// never read as fully clean, but also never as a hard blocker. If
// opts.currentlyUninsured is true the result is forced to 'red' (a live lapse
// overrides everything).
//
// ---------------------------------------------------------------------------
// acquisitionScore(input) -> integer 0..100 (clamped)
// ---------------------------------------------------------------------------
// Weighted sum of five sub-scores, each a 0..1 factor times its weight:
//
//     insurance   25
//     ucc         15
//     fleetFit    20
//     proximity   25
//     valuation   15      (total = 100)
//
// score = round( sum(factor_i * weight_i) / sum(weight_i) * 100 )
//
// Sub-score factors:
//   insurance:  green=1   amber=.6  red=0    unknown=.4
//   ucc:        green=1   amber=.5  red=0    unknown=.5
//   fleetFit (power units):  1u=.6  2..5u=1  6..12u=.85  13..20u=.6  >20u=0  null=.5
//   proximity:  eligible_now=1
//               approaching  -> linear ramp .5..1 as daysTo180 goes 30 -> 0 (clamped)
//               too_new=.35  aged_out=.5  awaiting_authority=.2  others=0
//   valuation:  the valuationFactor (0..1) passed in from computeValuation
//
// Pre-enrich redistribution: when valuationFactor == null (QCMobile enrich has
// not run yet) the valuation weight (15) is dropped and the denominator becomes
// the sum of the remaining four weights. Because the score divides by the sum of
// the weights actually in play, dropping a weight redistributes its influence
// proportionally across the survivors — so a pre-enrich row still scores on the
// same 0..100 scale instead of being penalised for missing data.
//
// HARD ZERO: the whole score collapses to 0 when the carrier is structurally
// un-acquirable — eligibility is 'authority_inactive' or 'continuity_broken',
// or currentlyUninsured === true.

import type {
  InsuranceRating,
  UccRating,
  AuditRating,
  EligibilityState,
} from "@/lib/monitor/types";

// --- local helpers (in-file only) ------------------------------------------

type Severity = 0 | 1 | 2; // green < amber < red

function insuranceSeverity(r: InsuranceRating): Severity {
  switch (r) {
    case "green":
      return 0;
    case "red":
      return 2;
    // 'amber' and 'unknown' (pending — capped at amber)
    default:
      return 1;
  }
}

function uccSeverity(r: UccRating): Severity {
  switch (r) {
    case "green":
      return 0;
    case "red":
      return 2;
    default:
      return 1;
  }
}

const SEVERITY_TO_RATING: Record<Severity, AuditRating> = {
  0: "green",
  1: "amber",
  2: "red",
};

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function insuranceWeightFactor(r: InsuranceRating): number {
  switch (r) {
    case "green":
      return 1;
    case "amber":
      return 0.6;
    case "red":
      return 0;
    case "unknown":
      return 0.4;
    default:
      return 0.4;
  }
}

function uccWeightFactor(r: UccRating): number {
  switch (r) {
    case "green":
      return 1;
    case "amber":
      return 0.5;
    case "red":
      return 0;
    case "unknown":
      return 0.5;
    default:
      return 0.5;
  }
}

// Fleet fit by power units. Tight 2..5 sweet spot; over 20 is a no.
function fleetFitFactor(units: number | null | undefined): number {
  if (units == null) return 0.5;
  if (units <= 0) return 0; // no power units = not a fit
  if (units === 1) return 0.6;
  if (units <= 5) return 1;
  if (units <= 12) return 0.85;
  if (units <= 20) return 0.6;
  return 0;
}

// Proximity to the 180-day Amazon Relay eligibility clock.
function proximityFactor(
  eligibility: EligibilityState | undefined,
  daysTo180: number | null | undefined,
): number {
  switch (eligibility) {
    case "eligible_now":
      return 1;
    case "approaching": {
      // Linear ramp: daysTo180 30 -> .5, 0 -> 1 (clamped to [.5, 1]).
      const d = daysTo180 == null ? 30 : daysTo180;
      const ramp = 1 - (d / 30) * 0.5;
      if (ramp < 0.5) return 0.5;
      if (ramp > 1) return 1;
      return ramp;
    }
    case "too_new":
      return 0.35;
    case "aged_out":
      return 0.5;
    case "awaiting_authority":
      return 0.2;
    default:
      return 0;
  }
}

// --- exports ----------------------------------------------------------------

/**
 * Fold the insurance and UCC ratings into a single audit rating: the worst of
 * the two on a green < amber < red scale, with 'unknown' treated as 'amber'
 * (pending — capped). A live insurance lapse forces 'red'.
 */
export function combineAuditScore(
  insurance: InsuranceRating,
  ucc: UccRating,
  opts?: { currentlyUninsured?: boolean },
): AuditRating {
  if (opts?.currentlyUninsured === true) return "red";
  const worst = Math.max(
    insuranceSeverity(insurance),
    uccSeverity(ucc),
  ) as Severity;
  return SEVERITY_TO_RATING[worst];
}

/**
 * Overall acquisition attractiveness, 0..100 (integer, clamped). Weighted blend
 * of insurance, UCC, fleet fit, eligibility proximity, and (post-enrich)
 * valuation. See the top-of-file comment for the full formula. Returns 0 for
 * structurally un-acquirable carriers.
 */
export function acquisitionScore(input: {
  insurance: InsuranceRating;
  ucc: UccRating;
  valuationFactor?: number | null; // 0..1 from computeValuation; null pre-enrich
  fleetUnits?: number | null; // power units
  daysTo180?: number | null; // positive = not yet eligible
  eligibility?: EligibilityState;
  currentlyUninsured?: boolean;
}): number {
  // Hard zeros: structurally un-acquirable.
  if (input.currentlyUninsured === true) return 0;
  if (
    input.eligibility === "authority_inactive" ||
    input.eligibility === "continuity_broken"
  ) {
    return 0;
  }

  // Sub-score factors (each 0..1).
  const insFactor = insuranceWeightFactor(input.insurance);
  const uccFactor = uccWeightFactor(input.ucc);
  const fleetFactor = fleetFitFactor(input.fleetUnits);
  const proxFactor = proximityFactor(input.eligibility, input.daysTo180);

  // Weights.
  const W_INSURANCE = 25;
  const W_UCC = 15;
  const W_FLEET = 20;
  const W_PROXIMITY = 25;
  const W_VALUATION = 15;

  let weightedSum =
    insFactor * W_INSURANCE +
    uccFactor * W_UCC +
    fleetFactor * W_FLEET +
    proxFactor * W_PROXIMITY;
  let totalWeight = W_INSURANCE + W_UCC + W_FLEET + W_PROXIMITY;

  // Valuation participates only when known. When null its weight is dropped
  // from the denominator, redistributing its influence proportionally across
  // the surviving four sub-scores.
  if (input.valuationFactor != null) {
    const valFactor = clamp01(input.valuationFactor);
    weightedSum += valFactor * W_VALUATION;
    totalWeight += W_VALUATION;
  }

  if (totalWeight <= 0) return 0;

  const raw = (weightedSum / totalWeight) * 100;
  const rounded = Math.round(raw);
  if (rounded < 0) return 0;
  if (rounded > 100) return 100;
  return rounded;
}
