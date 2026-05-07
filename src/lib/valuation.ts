import { deriveCarrierFlags, type FmcsaCarrier } from "@/lib/fmcsa";

// Pricing algorithm — deliberately bounded between $8,000 and $22,000
// (or up to $25,000 for top-tier Amazon Relay carriers with A+ safety).
//
// Inputs:
// - FMCSA carrier snapshot
// - hasAmazonRelay: boolean (user-reported in wizard)
// - authorityAgeDays: number | null (user-confirmed in wizard, optional)
//
// Output: { low, high } range. Spread is ~$3,000 around the computed
// midpoint so the range feels honest without giving away the negotiation
// floor.
//
// Floor triggers (hard $8K, no exceptions):
// - No active for-hire authority
// - No allowed-to-operate flag
// - Vehicle OR driver OOS ≥ 50%
//
// Ceiling logic:
// - Default ceiling: $22,000
// - Top-tier ceiling ($25,000): hasAmazonRelay AND safetyRating === 'S'
//   (Satisfactory is the highest official FMCSA rating — we treat it as
//   the "A+" tier per the user's spec)

export type ValuationInput = {
  hasAmazonRelay: boolean;
  authorityAgeDays: number | null;
};

export type ValuationResult = {
  low: number;
  high: number;
  midpoint: number;
  factor: number;
  flooredReason: string | null;
};

const FLOOR = 8000;
const DEFAULT_CEILING = 22000;
const TOP_TIER_CEILING = 25000;
const SPREAD_PADDING = 1500;

export function computeValuation(
  carrier: FmcsaCarrier,
  input: ValuationInput,
): ValuationResult {
  const flags = deriveCarrierFlags(carrier);

  // Hard floor cases — return $8K flat (low === high so the UI shows
  // a single floor figure, e.g. "$8,000".)
  if (!flags.isAllowedToOperate) {
    return floorResult("Carrier is not currently allowed to operate.");
  }
  if (!flags.hasActiveAuthority) {
    return floorResult("Common (for-hire) authority is not active.");
  }
  if (flags.driverOosCritical) {
    return floorResult("Driver out-of-service rate is at or above 50%.");
  }
  if (flags.vehicleOosCritical) {
    return floorResult("Vehicle out-of-service rate is at or above 50%.");
  }

  // Compute multiplier on the spread (0..1).
  let factor = 0;

  // Amazon Relay — biggest single driver of value.
  if (input.hasAmazonRelay) factor += 0.3;

  // Authority age. Fresh = +0.20, 6-12mo = +0.10, >2yr = -0.15.
  if (input.authorityAgeDays !== null) {
    if (input.authorityAgeDays < 180) factor += 0.2;
    else if (input.authorityAgeDays < 365) factor += 0.1;
    else if (input.authorityAgeDays > 730) factor -= 0.15;
  }

  // Out-of-service rates — reward better-than-average performance,
  // already-handled critical case above.
  if (flags.vehicleOosBetterThanAvg) factor += 0.15;
  if (flags.driverOosBetterThanAvg) factor += 0.15;

  // Crashes (24mo).
  if (carrier.crashTotal > 5) factor -= 0.15;
  else if (carrier.crashTotal > 2) factor -= 0.1;

  // Insurance gap is a serious risk.
  if (!flags.hasInsuranceOnFile) factor -= 0.2;

  // MCS-150 outdated = compliance risk.
  if (carrier.mcs150Outdated === "Y") factor -= 0.05;

  // Clamp factor to [0, 1].
  factor = Math.max(0, Math.min(1, factor));

  // Decide ceiling.
  const isTopTier =
    input.hasAmazonRelay && carrier.safetyRating === "S";
  const ceiling = isTopTier ? TOP_TIER_CEILING : DEFAULT_CEILING;
  const spread = ceiling - FLOOR;

  const midpoint = FLOOR + spread * factor;
  const low = Math.max(FLOOR, Math.round((midpoint - SPREAD_PADDING) / 100) * 100);
  const high = Math.min(ceiling, Math.round((midpoint + SPREAD_PADDING) / 100) * 100);

  return {
    low,
    high,
    midpoint: Math.round(midpoint),
    factor,
    flooredReason: null,
  };
}

function floorResult(reason: string): ValuationResult {
  return {
    low: FLOOR,
    high: FLOOR,
    midpoint: FLOOR,
    factor: 0,
    flooredReason: reason,
  };
}

// Format helper for the UI. Returns "$X,XXX – $Y,XXX" or just
// "$X,XXX" when low === high (floor case).
export function formatRange(v: ValuationResult): string {
  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (v.low === v.high) return fmt(v.low);
  return `${fmt(v.low)} – ${fmt(v.high)}`;
}
