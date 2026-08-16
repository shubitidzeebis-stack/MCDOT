// FMCSA data client. Combines three sources:
//
// 1. QCMobile API (https://mobile.fmcsa.dot.gov/qc/services/) — JSON,
//    requires API key. Gives us legal name, DOT, MC, address, authority
//    status, OOS rates, crashes, insurance, safety rating.
//    ⚠ Since the 2026-05-14 Motus cutover its authority/insurance fields
//    come from a FROZEN pipeline (stale, no error signal), and since
//    ~2026-08-15 its BY-DOT carrier endpoint returns empty for every DOT
//    while the docket-number endpoint still answers. Safety fields (MCMIS)
//    remain valid — it is now effectively our safety-and-census source.
//
// 2. Motus (src/lib/motus.ts) — FMCSA's system of record since 2026-05-14.
//    Authoritative for authority status + insurance; also the ONLY source
//    for post-cutover carriers (incl. the new 8-digit MC series). When
//    QCMobile misses a DOT, we recover through Motus and re-enter QCMobile
//    via the still-working docket endpoint to keep safety/census fields.
//
// 3. SAFER snapshot HTML scrape — public, no key. Gives us telephone
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

import {
  motusLookupByDot,
  motusResolveDocketToDot,
  BIPD_REQUIRED_THOUSANDS,
  type MotusSnapshot,
} from "@/lib/motus";

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
  // Provenance — set by lookupCarrier when Motus was consulted. Rides inside
  // the carrier object on purpose: it lands in the fmcsa_raw JSONB snapshot
  // with zero schema changes, so every stored row records which system
  // produced its authority/insurance verdict.
  _motus?: {
    checkedAt: string;
    found: boolean;
    // "qcmobile" = QCMobile answered directly; "qcmobile_docket" = recovered
    // via Motus docket + QCMobile docket endpoint; "motus" = synthesized
    // entirely from Motus (no QCMobile record).
    carrierSource: "qcmobile" | "qcmobile_docket" | "motus";
    // FmcsaCarrier fields rewritten because Motus (system of record) disagreed
    // with the frozen legacy value.
    overrides: string[];
    hasActiveAuthority?: boolean;
    insuranceActive?: boolean;
    outOfService?: boolean;
    errored?: boolean;
  };
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

// Motus disagrees with the frozen legacy record → the legacy fields get
// rewritten in place (Motus is the system of record), and each rewritten
// field name is recorded for provenance.
function applyMotusOverrides(c: FmcsaCarrier, m: MotusSnapshot): string[] {
  const overrides: string[] = [];
  const legacyActive =
    c.commonAuthorityStatus === "A" || c.commonAuthorityStatus === "Y";
  if (m.hasActiveAuthority && !legacyActive) {
    c.commonAuthorityStatus = "A";
    overrides.push("commonAuthorityStatus");
  } else if (!m.hasActiveAuthority && legacyActive) {
    c.commonAuthorityStatus = "I";
    overrides.push("commonAuthorityStatus");
  }
  const motusAllowed = m.hasActiveAuthority && !m.outOfService ? "Y" : "N";
  if (c.allowedToOperate !== motusAllowed) {
    c.allowedToOperate = motusAllowed;
    overrides.push("allowedToOperate");
  }
  const legacyInsured = Number(c.bipdInsuranceOnFile) > 0;
  if (m.insuranceActive && !legacyInsured) {
    c.bipdInsuranceOnFile = m.insuranceMaxCoverage
      ? String(Math.round(m.insuranceMaxCoverage / 1000))
      : BIPD_REQUIRED_THOUSANDS;
    overrides.push("bipdInsuranceOnFile");
  } else if (!m.insuranceActive && legacyInsured) {
    c.bipdInsuranceOnFile = "0";
    overrides.push("bipdInsuranceOnFile");
  }
  return overrides;
}

// A carrier only Motus knows (post-cutover registration, or QCMobile outage).
// Safety/inspection numbers are zero — truthful for the brand-new carriers
// this mostly serves; scale/address/identity come from Motus itself.
function synthesizeFromMotus(m: MotusSnapshot): FmcsaCarrier {
  const active = m.hasActiveAuthority;
  return {
    dotNumber: Number(m.dotNumber),
    legalName: m.legalName ?? "UNKNOWN CARRIER",
    dbaName: m.dbaName,
    commonAuthorityStatus: active ? "A" : "I",
    contractAuthorityStatus: "N",
    brokerAuthorityStatus: "N",
    allowedToOperate: active && !m.outOfService ? "Y" : "N",
    statusCode: active ? "A" : "I",
    bipdInsuranceOnFile:
      m.insuranceActive && m.insuranceMaxCoverage
        ? String(Math.round(m.insuranceMaxCoverage / 1000))
        : m.insuranceActive
          ? BIPD_REQUIRED_THOUSANDS
          : "0",
    bipdInsuranceRequired: "Y",
    bipdRequiredAmount: BIPD_REQUIRED_THOUSANDS,
    totalPowerUnits: m.powerUnits ?? 0,
    totalDrivers: m.drivers ?? 0,
    driverInsp: 0,
    driverOosInsp: 0,
    driverOosRate: 0,
    driverOosRateNationalAverage: "5.51",
    vehicleInsp: 0,
    vehicleOosInsp: 0,
    vehicleOosRate: 0,
    vehicleOosRateNationalAverage: "20.72",
    crashTotal: 0,
    fatalCrash: 0,
    injCrash: 0,
    towawayCrash: 0,
    safetyRating: null,
    safetyRatingDate: null,
    mcs150Outdated: "N",
    phyStreet: m.address?.street ?? null,
    phyCity: m.address?.city ?? null,
    phyState: m.address?.state ?? null,
    phyZipcode: m.address?.zip ?? null,
    phyCountry: "US",
    carrierOperation: null,
  };
}

// Public entrypoint. Accepts either MC or DOT, with or without prefix.
// `kind` tells us how to interpret the input.
//
// Source strategy (2026-08): QCMobile first for the full record, then Motus
// for the authority/insurance truth. A QCMobile miss is a QUESTION, not an
// answer — the by-DOT endpoint went empty at the Motus cutover's tail end and
// post-cutover carriers never appear in it — so a miss falls through to Motus,
// and when Motus knows the carrier we re-enter QCMobile through its
// still-working docket endpoint to recover safety/census fields.
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
    // A QCMobile ERROR must not kill the lookup — Motus can still answer.
    let carrier: FmcsaCarrier | null = null;
    let qcErrored = false;
    try {
      carrier = kind === "mc" ? await lookupByMc(num) : await lookupByDot(num);
    } catch {
      qcErrored = true;
    }
    let carrierSource: "qcmobile" | "qcmobile_docket" | "motus" = "qcmobile";
    let motus: MotusSnapshot | null = null;
    let motusErrored = false;

    if (carrier) {
      // QCMobile answered — overlay current truth from the system of record.
      try {
        motus = await motusLookupByDot(String(carrier.dotNumber));
      } catch {
        motusErrored = true;
      }
    } else {
      // QCMobile miss → ask Motus before declaring the carrier nonexistent.
      try {
        const dot =
          kind === "dot" ? num : await motusResolveDocketToDot(num);
        motus = dot ? await motusLookupByDot(dot) : null;
      } catch {
        motusErrored = true;
      }
      if (motus) {
        // Docket re-entry: QCMobile's docket endpoint still works, so an
        // established carrier invisible to the broken by-DOT endpoint can
        // still yield its full record (safety, census scale, address).
        for (const docket of motus.dockets) {
          try {
            carrier = await lookupByMc(docket);
            if (carrier) {
              carrierSource = "qcmobile_docket";
              break;
            }
          } catch {
            // best-effort — fall through to synthesis
          }
        }
        if (!carrier) {
          carrier = synthesizeFromMotus(motus);
          carrierSource = "motus";
        }
      }
    }

    if (!carrier) {
      // Neither system knows it — but if a source was unreachable we genuinely
      // don't know, and must not tell a real carrier they don't exist.
      if (motusErrored || qcErrored) {
        return {
          ok: false,
          reason: "api_error",
          message: "Carrier data sources are temporarily unavailable. Please try again.",
        };
      }
      return {
        ok: false,
        reason: "not_found",
        message:
          "We couldn't find a carrier with that number. New authorities sometimes take 30+ days to appear in FMCSA — try our contact form instead.",
      };
    }

    const overrides = motus ? applyMotusOverrides(carrier, motus) : [];
    carrier._motus = {
      checkedAt: new Date().toISOString(),
      found: motus !== null,
      carrierSource,
      overrides,
      ...(motus
        ? {
            hasActiveAuthority: motus.hasActiveAuthority,
            insuranceActive: motus.insuranceActive,
            outOfService: motus.outOfService,
          }
        : {}),
      ...(motusErrored ? { errored: true } : {}),
    };

    // Run docket-numbers + SAFER scrape in parallel — both are best-
    // effort enrichment and we don't want to serialize their latency.
    const [docketNumbers, safer] = await Promise.all([
      lookupDocketNumbers(carrier.dotNumber),
      scrapeSaferSnapshot(carrier.dotNumber),
    ]);
    // The docket-numbers endpoint is DOT-keyed (same outage risk as by-DOT);
    // Motus dockets fill the gap, active authorities first.
    const mcNumbers =
      docketNumbers.length === 0 && motus ? motus.dockets : docketNumbers;
    const telephone = safer.telephone ?? motus?.phone ?? null;
    const mcs150FormDate = safer.mcs150FormDate ?? motus?.mcs150Date ?? null;
    const authorityAgeDays = authorityAgeDaysFromMcs150(mcs150FormDate);
    return {
      ok: true,
      carrier,
      mcNumbers,
      telephone,
      mcs150FormDate,
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
// Since QCMobile's by-DOT endpoint went empty (~2026-08-15), an empty response
// is no longer proof of a brand-new carrier — pass the candidate's MC so the
// still-working docket endpoint gets a shot before we fall back to "no record".
//
// QCMobile is flaky and frequently returns transient 503s, so unlike the inbound
// wizard's single-shot lookup this retries 5xx/429 with exponential backoff.
export async function lookupCarrierBasics(
  dot: string,
  mc?: string | null,
): Promise<FmcsaCarrier | null> {
  // THROW (don't return null) when the key is missing: a null is interpreted by
  // the safety enrich as "brand-new carrier, no record → pass clean", so a
  // silently-unset key would mark every carrier safe WITHOUT a real check.
  // Throwing leaves the carrier unchecked to retry, which is the safe failure.
  if (!process.env.FMCSA_API_KEY) throw new Error("FMCSA_API_KEY not set");
  const num = normalizeNumber(dot);
  if (!num) return null;
  const byDot = await qcMobileBasicsByDot(num);
  if (byDot) return byDot;
  // By-DOT came back empty. Try the docket endpoint before concluding anything.
  const mcDigits = normalizeNumber(mc ?? "");
  if (mcDigits) {
    try {
      const byDocket = await lookupByMc(mcDigits);
      if (byDocket) return byDocket;
    } catch {
      // best-effort — the by-DOT verdict below still applies
    }
  }
  return null;
}

async function qcMobileBasicsByDot(num: string): Promise<FmcsaCarrier | null> {
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
