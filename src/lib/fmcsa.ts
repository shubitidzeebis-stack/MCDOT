// FMCSA QCMobile API client.
//
// We hit two endpoints per lookup:
// 1. /carriers/docket-number/{MC}      — by MC number
//    OR /carriers/{DOT}                 — by DOT number
// 2. /carriers/{DOT}/docket-numbers     — to confirm MC list
//
// The carrier endpoint returns everything we need for valuation
// EXCEPT email, phone, and the date the authority was granted. Email
// and phone are collected separately in the wizard. Authority date is
// asked of the seller (optional — defaults to neutral pricing).
//
// Reference: https://mobile.fmcsa.dot.gov/QCDevsite/

const BASE_URL = "https://mobile.fmcsa.dot.gov/qc/services";

// FMCSA's response shape. Fields are stringly-typed because their API
// returns "Y"/"N", numeric strings, or null in inconsistent ways.
export type FmcsaCarrier = {
  dotNumber: number;
  legalName: string;
  dbaName: string | null;
  // Authority status — "A"/"Y" active, "I" inactive, "N" never had
  commonAuthorityStatus: string;
  contractAuthorityStatus: string;
  brokerAuthorityStatus: string;
  // "Y" = currently allowed to operate
  allowedToOperate: string;
  // "A" = Active, "I" = Inactive
  statusCode: string;
  // Insurance — "0" with required "Y" is a red flag (no insurance on file)
  bipdInsuranceOnFile: string;
  bipdInsuranceRequired: string;
  bipdRequiredAmount: string;
  // Carrier scale
  totalPowerUnits: number;
  totalDrivers: number;
  // Inspections (lifetime) — useful as proxies for OOS rate confidence
  driverInsp: number;
  driverOosInsp: number;
  driverOosRate: number;
  driverOosRateNationalAverage: string;
  vehicleInsp: number;
  vehicleOosInsp: number;
  vehicleOosRate: number;
  vehicleOosRateNationalAverage: string;
  // Crashes (24mo per FMCSA)
  crashTotal: number;
  fatalCrash: number;
  injCrash: number;
  towawayCrash: number;
  // Safety rating: "S" Satisfactory, "C" Conditional, "U" Unsatisfactory, null = none
  safetyRating: string | null;
  safetyRatingDate: string | null;
  // Compliance — "Y" if MCS-150 is overdue
  mcs150Outdated: string;
  // Address
  phyStreet: string | null;
  phyCity: string | null;
  phyState: string | null;
  phyZipcode: string | null;
  phyCountry: string | null;
  // Operation type
  carrierOperation: { carrierOperationCode: string; carrierOperationDesc: string } | null;
};

export type FmcsaLookupResult =
  | { ok: true; carrier: FmcsaCarrier; mcNumbers: string[] }
  | { ok: false; reason: "not_found" | "api_error" | "no_key"; message: string };

function getKey(): string {
  const key = process.env.FMCSA_API_KEY;
  if (!key) throw new Error("FMCSA_API_KEY not set");
  return key;
}

// Strip "MC", "MC-", or "USDOT" prefixes; trim non-digits.
function normalizeNumber(input: string): string {
  return input.replace(/[^0-9]/g, "");
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // FMCSA can be slow — generous timeout
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`FMCSA ${res.status}`);
  }
  return res.json();
}

type FmcsaContentResponse = {
  content: Array<{ carrier: FmcsaCarrier } | FmcsaCarrier> | null;
};

// Look up by MC docket number.
async function lookupByMc(mc: string): Promise<FmcsaCarrier | null> {
  const key = getKey();
  const url = `${BASE_URL}/carriers/docket-number/${mc}?webKey=${key}`;
  const data = (await fetchJson(url)) as FmcsaContentResponse;
  if (!data.content || data.content.length === 0) return null;
  const first = data.content[0];
  // Response shape varies — sometimes wrapped in { carrier: {...} }
  if (first && typeof first === "object" && "carrier" in first) {
    return first.carrier as FmcsaCarrier;
  }
  return first as FmcsaCarrier;
}

// Look up by DOT number.
async function lookupByDot(dot: string): Promise<FmcsaCarrier | null> {
  const key = getKey();
  const url = `${BASE_URL}/carriers/${dot}?webKey=${key}`;
  const data = (await fetchJson(url)) as FmcsaContentResponse;
  if (!data.content || data.content.length === 0) return null;
  const first = data.content[0];
  if (first && typeof first === "object" && "carrier" in first) {
    return first.carrier as FmcsaCarrier;
  }
  return first as FmcsaCarrier;
}

// Pull MC docket numbers tied to a DOT.
async function lookupDocketNumbers(dot: number): Promise<string[]> {
  try {
    const key = getKey();
    const url = `${BASE_URL}/carriers/${dot}/docket-numbers?webKey=${key}`;
    const data = (await fetchJson(url)) as {
      content: Array<{ docketNumber: number; prefix: string }>;
    };
    if (!data.content) return [];
    return data.content
      .filter((d) => d.prefix === "MC")
      .map((d) => String(d.docketNumber));
  } catch {
    return [];
  }
}

// Public entrypoint. Accepts either MC or DOT, with or without prefix.
// `kind` tells us how to interpret the input.
export async function lookupCarrier(
  input: string,
  kind: "mc" | "dot",
): Promise<FmcsaLookupResult> {
  if (!process.env.FMCSA_API_KEY) {
    return { ok: false, reason: "no_key", message: "FMCSA API key not configured." };
  }
  const num = normalizeNumber(input);
  if (!num) {
    return { ok: false, reason: "not_found", message: "Please enter a valid number." };
  }
  try {
    const carrier = kind === "mc" ? await lookupByMc(num) : await lookupByDot(num);
    if (!carrier) {
      return {
        ok: false,
        reason: "not_found",
        message:
          "We couldn't find a carrier with that number. New authorities sometimes take 30+ days to appear in FMCSA — try our contact form instead.",
      };
    }
    const mcNumbers = await lookupDocketNumbers(carrier.dotNumber);
    return { ok: true, carrier, mcNumbers };
  } catch (err) {
    return {
      ok: false,
      reason: "api_error",
      message:
        err instanceof Error
          ? `FMCSA lookup failed: ${err.message}`
          : "FMCSA lookup failed.",
    };
  }
}

// Convenience flags used by the pricing algorithm.
export function deriveCarrierFlags(c: FmcsaCarrier) {
  const hasActiveAuthority =
    c.commonAuthorityStatus === "A" || c.commonAuthorityStatus === "Y";
  const hasInsuranceOnFile =
    Number(c.bipdInsuranceOnFile) > 0 || c.bipdInsuranceRequired !== "Y";
  const isAllowedToOperate = c.allowedToOperate === "Y";
  const driverNatAvg = Number(c.driverOosRateNationalAverage) || 5.51;
  const vehicleNatAvg = Number(c.vehicleOosRateNationalAverage) || 20.72;
  const driverOosBetterThanAvg = c.driverOosRate < driverNatAvg;
  const vehicleOosBetterThanAvg = c.vehicleOosRate < vehicleNatAvg;
  const driverOosCritical = c.driverOosRate >= 50;
  const vehicleOosCritical = c.vehicleOosRate >= 50;
  return {
    hasActiveAuthority,
    hasInsuranceOnFile,
    isAllowedToOperate,
    driverOosBetterThanAvg,
    vehicleOosBetterThanAvg,
    driverOosCritical,
    vehicleOosCritical,
  };
}
