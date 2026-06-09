// FMCSA data client. Combines two sources:
//
// 1. QCMobile API (https://mobile.fmcsa.dot.gov/qc/services/) — JSON,
//    requires API key. Gives us legal name, DOT, MC, address, authority
//    status, OOS rates, crashes, insurance, safety rating.
//
// 2. SAFER snapshot HTML scrape — public, no key. Gives us telephone
//    and MCS-150 Form Date. The QCMobile API documentation lists a
//    `telephone` field but the actual API JSON does not return it, even
//    for fully active for-hire carriers. SAFER's public HTML page does.
//
// We use MCS-150 Form Date as a proxy for "authority age" — for newly
// registered carriers it's the registration date; for existing carriers
// it's the last refile (every 24 months). It's the best public proxy
// for "how long has this carrier been operating with this MC".
//
// Reference: https://mobile.fmcsa.dot.gov/QCDevsite/

const BASE_URL = "https://mobile.fmcsa.dot.gov/qc/services";
const SAFER_URL =
  "https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=";

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
  | {
      ok: true;
      carrier: FmcsaCarrier;
      mcNumbers: string[];
      // Pulled from SAFER HTML — not available in QCMobile JSON.
      telephone: string | null;
      mcs150FormDate: string | null; // MM/DD/YYYY string from SAFER
      authorityAgeDays: number | null; // computed from mcs150FormDate
    }
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

// Pull telephone + MCS-150 Form Date from SAFER's public HTML.
// Both fields are missing from QCMobile JSON. SAFER doesn't require an
// API key. We parse the small chunks of HTML we need with targeted
// regex — no full HTML parser dependency.
async function scrapeSaferSnapshot(
  dot: number,
): Promise<{ telephone: string | null; mcs150FormDate: string | null }> {
  try {
    const res = await fetch(`${SAFER_URL}${dot}`, {
      headers: {
        // SAFER blocks default Node fetches without a UA.
        "User-Agent":
          "Mozilla/5.0 (compatible; VeritorValuation/1.0; +https://groupveritor.com)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { telephone: null, mcs150FormDate: null };
    const html = await res.text();

    // Phone — appears under <TH>Phone:</TH> followed by a <TD> with the
    // formatted number ("(424) 341-1111"). Grab the next phone-shaped
    // sequence after the Phone: label.
    let telephone: string | null = null;
    const phoneSection = html.split(/Phone:/i)[1] ?? "";
    const phoneMatch = phoneSection.match(/\(\d{3}\)\s*\d{3}-\d{4}/);
    if (phoneMatch) telephone = phoneMatch[0];

    // MCS-150 Form Date — appears as MM/DD/YYYY under a TH labeled
    // "MCS-150 Form Date:".
    let mcs150FormDate: string | null = null;
    const mcs150Section = html.split(/MCS-150 Form Date:/i)[1] ?? "";
    const dateMatch = mcs150Section.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch) mcs150FormDate = dateMatch[0];

    return { telephone, mcs150FormDate };
  } catch {
    return { telephone: null, mcs150FormDate: null };
  }
}

function authorityAgeDaysFromMcs150(mcs150FormDate: string | null): number | null {
  if (!mcs150FormDate) return null;
  // MM/DD/YYYY → Date
  const m = mcs150FormDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const formDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  const now = new Date();
  const diffMs = now.getTime() - formDate.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
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
    // Run docket-numbers + SAFER scrape in parallel — both are best-
    // effort enrichment and we don't want to serialize their latency.
    const [mcNumbers, safer] = await Promise.all([
      lookupDocketNumbers(carrier.dotNumber),
      scrapeSaferSnapshot(carrier.dotNumber),
    ]);
    const authorityAgeDays = authorityAgeDaysFromMcs150(safer.mcs150FormDate);
    return {
      ok: true,
      carrier,
      mcNumbers,
      telephone: safer.telephone,
      mcs150FormDate: safer.mcs150FormDate,
      authorityAgeDays,
    };
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

// Lightweight QCMobile-only lookup (no SAFER scrape / docket call) used by the
// monitor safety enrich, where we only need the OOS / crash / safety-rating
// fields. Returns null if the DOT isn't in QCMobile yet (brand-new carrier);
// THROWS on a persistent API error so the caller can retry next run.
//
// QCMobile is flaky and frequently returns transient 503s, so unlike the inbound
// wizard's single-shot lookup this retries 5xx/429 with exponential backoff.
export async function lookupCarrierBasics(dot: string): Promise<FmcsaCarrier | null> {
  // THROW (don't return null) when the key is missing: a null is interpreted by
  // the safety enrich as "brand-new carrier, no record → pass clean", so a
  // silently-unset key would mark every carrier safe WITHOUT a real check.
  // Throwing leaves the carrier unchecked to retry, which is the safe failure.
  if (!process.env.FMCSA_API_KEY) throw new Error("FMCSA_API_KEY not set");
  const num = normalizeNumber(dot);
  if (!num) return null;
  const url = `${BASE_URL}/carriers/${num}?webKey=${getKey()}`;
  let lastStatus = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      // Network/timeout — retry with backoff.
      await new Promise((r) => setTimeout(r, 600 * 2 ** attempt + Math.random() * 400));
      continue;
    }
    if (res.ok) {
      const data = (await res.json()) as FmcsaContentResponse;
      if (!data.content || data.content.length === 0) return null;
      const first = data.content[0];
      if (first && typeof first === "object" && "carrier" in first) {
        return first.carrier as FmcsaCarrier;
      }
      return first as FmcsaCarrier;
    }
    lastStatus = res.status;
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 600 * 2 ** attempt + Math.random() * 400));
      continue;
    }
    // 404 = the DOT is genuinely not in QCMobile (brand-new carrier) — that is
    // a CONFIRMED not-found, same as 200-with-empty-content. Throwing here
    // would retry the same carrier every run forever and starve the enrich.
    if (res.status === 404) return null;
    break; // other non-retryable 4xx (401 bad key etc.) -> throw below
  }
  throw new Error(`FMCSA ${lastStatus || "network"}`);
}

// Convenience flags used by the pricing algorithm + UI displays.
export type InsuranceStatus = "active" | "lapsed" | "not_required" | "unknown";

export function deriveInsuranceStatus(c: FmcsaCarrier): InsuranceStatus {
  const required = c.bipdInsuranceRequired === "Y";
  const onFile = Number(c.bipdInsuranceOnFile) > 0;
  if (!required) return "not_required";
  if (onFile) return "active";
  return "lapsed";
}

export function deriveCarrierFlags(c: FmcsaCarrier) {
  const hasActiveAuthority =
    c.commonAuthorityStatus === "A" || c.commonAuthorityStatus === "Y";
  const insuranceStatus = deriveInsuranceStatus(c);
  const hasInsuranceOnFile =
    insuranceStatus === "active" || insuranceStatus === "not_required";
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
    insuranceStatus,
    isAllowedToOperate,
    driverOosBetterThanAvg,
    vehicleOosBetterThanAvg,
    driverOosCritical,
    vehicleOosCritical,
  };
}
