// Motus (https://motus.dot.gov) — FMCSA's registration system of record since
// the 2026-05-14 cutover, when URS / the legacy L&I system / the FMCSA Portal
// went dark. Registration, operating authority, and insurance filings now live
// HERE; the legacy public feeds (QCMobile authority+insurance fields, the
// Socrata Carrier/InsHist datasets) froze at cutover and keep serving stale
// values without any error signal. Safety data (OOS/crashes/rating) was NOT
// migrated and still comes from QCMobile.
//
// This client uses the same unauthenticated JSON API the public Motus search
// UI uses. It is UNDOCUMENTED — the shapes below were mapped from live
// responses (2026-08-16) and may drift without notice, so every parse here is
// defensive and a Motus failure must always degrade to "unknown", never to a
// hard verdict. FMCSA publishes no rate limits for it; keep call volumes to
// per-carrier lookups (no bulk sweeps — the Motus Socrata exports exist for
// that, but beware: they are PARTIAL and drop events; only this API reflects
// the complete backend).

import type { CarrierRow, InsHistRow } from "@/lib/monitor/types";

const MOTUS_BASE = "https://motus.dot.gov/api";

// Legally the BIPD floor for general-freight property carriers. Used only as
// the "required" figure when synthesizing a legacy-shaped record.
const BIPD_REQUIRED_THOUSANDS = "750";

export type MotusFiling = {
  policyNumber: string | null;
  effectiveDate: string | null; // ISO
  cancellationDate: string | null; // ISO
  maxCovAmount: number | null; // dollars
  filingStatusReason: string | null; // e.g. "TERM/REPL"
  active: boolean; // in force right now (effective ≤ now, not cancelled/disabled)
};

export type MotusAuthority = {
  docketNumber: string | null; // e.g. "MC1631145" or new-format "MC54058086"
  authorityType: string | null; // e.g. "Motor Carrier of Property (Except Household Goods)"
  status: string | null; // "Active" | "Inactive" | ...
  isActive: boolean;
  isBroker: boolean; // "Broker of ..." authority — surety bond, NOT a carrier
  filings: MotusFiling[];
};

export type MotusSnapshot = {
  dotNumber: string;
  legalName: string | null;
  dbaName: string | null;
  outOfService: boolean;
  authorities: MotusAuthority[];
  /** Active CARRIER (non-broker) authority — what "can haul freight" means.
   * A broker-only entity is deliberately false here: mapping a broker's
   * authority onto commonAuthorityStatus would give a non-carrier a full
   * carrier valuation. */
  hasActiveAuthority: boolean;
  hasActiveBrokerAuthority: boolean;
  /** Digit-only MC docket numbers (FF/MX prefixes excluded — they must never
   * end up printed as an MC number), active carrier authorities first. */
  dockets: string[];
  /** In-force filing on a CARRIER authority. Broker filings are surety bonds
   * (BMC-84), not BIPD — counting them would mark an uninsured carrier
   * insured. */
  insuranceActive: boolean;
  insuranceMaxCoverage: number | null; // dollars, from the in-force filing(s)
  earliestInsuranceEffective: string | null; // ISO — eligibility anchor material
  phone: string | null; // formatted (XXX) XXX-XXXX to match the SAFER scrape
  mcs150Date: string | null; // MM/DD/YYYY to match the SAFER scrape convention
  powerUnits: number | null;
  drivers: number | null;
  address: {
    street: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
};

// The API sometimes serializes to-one/to-many relations inconsistently —
// normalize everything list-like through this.
function toArray<T>(x: unknown): T[] {
  if (Array.isArray(x)) return x as T[];
  if (x === null || x === undefined) return [];
  return [x as T];
}

function str(x: unknown): string | null {
  return typeof x === "string" && x.length > 0 ? x : null;
}

function num(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string" && x.trim() !== "") {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isoToMdy(iso: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : null;
}

function formatPhone(raw: string | null): string | null {
  let digits = (raw ?? "").replace(/[^0-9]/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

async function motusFetch(path: string): Promise<unknown | null> {
  const url = `${MOTUS_BASE}${path}`;
  let lastErr: unknown = null;
  // Two attempts only — this API is undocumented and unowned by us; hammering
  // it on failure risks the whole integration getting blocked. Only network
  // failures and 5xx are retried; a 4xx will not change on retry.
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      lastErr = err;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));
        continue;
      }
      break;
    }
    if (res.status === 404) return null;
    if (res.ok) {
      try {
        return await res.json();
      } catch (err) {
        lastErr = err; // truncated/malformed body — surface as an error
        break;
      }
    }
    lastErr = new Error(`Motus ${res.status}`);
    if (res.status >= 500 && attempt === 0) {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));
      continue;
    }
    break;
  }
  throw lastErr instanceof Error ? lastErr : new Error("Motus request failed");
}

function filingActive(f: {
  effectiveDate: string | null;
  cancellationDate: string | null;
  disableDate?: string | null;
}): boolean {
  if (f.disableDate) return false;
  if (!f.effectiveDate) return false;
  const now = Date.now();
  const eff = Date.parse(f.effectiveDate);
  if (!Number.isFinite(eff) || eff > now) return false;
  if (f.cancellationDate) {
    const cancel = Date.parse(f.cancellationDate);
    if (Number.isFinite(cancel) && cancel <= now) return false;
  }
  return true;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- undocumented API; every
   access below goes through the defensive str/num/toArray helpers. */
function parseSnapshot(j: any): MotusSnapshot | null {
  if (!j || typeof j !== "object") return null;

  // Minimum-shape guard: this API is undocumented, so a renamed key or a
  // hollow 200 must degrade to "unknown" (null), never become an
  // authoritative verdict. A response without its own DOT number or without
  // any registration block is not a carrier record we can act on.
  const dotNum = num(j.entityDotNumber?.dotNumber);
  const regs = toArray<any>(j.entityRegistrations);
  if (dotNum === null || regs.length === 0) return null;
  const dotNumber = String(dotNum);

  const names = toArray<any>(j.entityNames);
  const legalName =
    str(names.find((n) => n?.nameType === "Legal" && !n?.disableDate)?.entityName) ??
    str(j.entityName);
  const dbaName = str(
    names.find((n) => n?.nameType === "DBA" && !n?.disableDate)?.entityName,
  );

  const authorities: MotusAuthority[] = [];
  for (const reg of regs) {
    if (reg?.disableDate) continue;
    for (const link of toArray<any>(reg?.entityRegistrationOperatingAuthorities)) {
      if (link?.disableDate) continue;
      const oa = link?.entityOperatingAuthority;
      if (!oa || oa.disableDate) continue;
      const status = str(oa.operatingAuthorityStatus?.operatingAuthorityStatusName);
      const authorityType = str(oa.operatingAuthorityType?.operatingAuthorityType);
      const filings: MotusFiling[] = toArray<any>(oa.insuranceFilings).map((f) => ({
        policyNumber: str(f?.policyNumber),
        effectiveDate: str(f?.effectiveDate),
        cancellationDate: str(f?.cancellationDate),
        maxCovAmount: num(f?.maxCovAmount),
        filingStatusReason: str(f?.filingStatusReason),
        active: filingActive({
          effectiveDate: str(f?.effectiveDate),
          cancellationDate: str(f?.cancellationDate),
          disableDate: str(f?.disableDate),
        }),
      }));
      authorities.push({
        docketNumber: str(oa.docketNumber),
        authorityType,
        status,
        isActive: status === "Active",
        isBroker: /broker/i.test(authorityType ?? ""),
        filings,
      });
    }
  }

  const carrierAuthorities = authorities.filter((a) => !a.isBroker);
  const hasActiveAuthority = carrierAuthorities.some((a) => a.isActive);
  const hasActiveBrokerAuthority = authorities.some(
    (a) => a.isBroker && a.isActive,
  );
  const dockets = [...authorities]
    // Active carrier authorities first, then active broker, then the rest —
    // callers that re-enter QCMobile by docket try these in order.
    .sort(
      (a, b) =>
        Number(b.isActive) - Number(a.isActive) ||
        Number(a.isBroker) - Number(b.isBroker),
    )
    .filter((a) => (a.docketNumber ?? "").toUpperCase().startsWith("MC"))
    .map((a) => (a.docketNumber ?? "").replace(/[^0-9]/g, ""))
    .filter((d) => d.length > 0);

  const allFilings = carrierAuthorities.flatMap((a) => a.filings);
  const activeFilings = allFilings.filter((f) => f.active);
  const insuranceMaxCoverage = activeFilings.reduce<number | null>(
    (max, f) =>
      f.maxCovAmount !== null && (max === null || f.maxCovAmount > max)
        ? f.maxCovAmount
        : max,
    null,
  );
  const earliestInsuranceEffective = allFilings.reduce<string | null>(
    (min, f) =>
      f.effectiveDate && (min === null || f.effectiveDate < min)
        ? f.effectiveDate
        : min,
    null,
  );

  const detail = j.carrierEntityDetail ?? {};
  const loc = toArray<any>(j.locations).find(
    (l) => l?.primaryAddressFlag && !l?.disableDate,
  );
  const phoneRaw = toArray<any>(j.phoneNumbers).find((p) => !p?.disableDate);

  return {
    dotNumber,
    legalName,
    dbaName,
    outOfService: j.outOfService === true,
    authorities,
    hasActiveAuthority,
    hasActiveBrokerAuthority,
    dockets,
    insuranceActive: activeFilings.length > 0,
    insuranceMaxCoverage,
    earliestInsuranceEffective,
    phone: formatPhone(str(phoneRaw?.phoneNumber)),
    mcs150Date: isoToMdy(str(detail.mcs150Date)),
    powerUnits: num(detail.nbrPowerUnit),
    drivers: num(detail.driverTotal),
    address: loc
      ? {
          street: str(loc.addressLine1),
          city: str(loc.city),
          state: str(loc.state),
          zip: str(loc.zipCode),
        }
      : null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Current-truth snapshot for one carrier, or null if Motus has no record
 * (or returns something we cannot safely interpret). */
export async function motusLookupByDot(dot: string): Promise<MotusSnapshot | null> {
  const digits = dot.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const j = await motusFetch(`/carriers/${digits}`);
  return j ? parseSnapshot(j) : null;
}

/** Resolve an MC docket (digits, any length incl. the new 8-digit series) to a
 * DOT number. The Motus API's search endpoints match names/DOTs but NOT
 * dockets (verified live 2026-08-16), so this goes through the Motus AuthHist
 * Socrata dataset instead — grant events carry docket_number + usdot_number
 * for every post-cutover authority. Returns null when nothing matches. */
const MOTUS_AUTHHIST_URL =
  "https://data.transportation.gov/resource/yu5v-wbh6.json";

export async function motusResolveDocketToDot(
  docketDigits: string,
): Promise<string | null> {
  const digits = docketDigits.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = process.env.FMCSA_SOCRATA_TOKEN;
  if (token) headers["X-App-Token"] = token;
  // Latest event first: a transferred/reissued docket has grant events under
  // more than one DOT, and the most recent event names the current holder.
  const url = `${MOTUS_AUTHHIST_URL}?docket_number=MC${digits}&$select=usdot_number,status_change_date&$order=status_change_date%20DESC&$limit=5`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`Motus AuthHist ${res.status}`);
      const rows = (await res.json()) as Array<{ usdot_number?: string | null }>;
      for (const r of toArray<{ usdot_number?: string | null }>(rows)) {
        const dot = (r?.usdot_number ?? "").replace(/[^0-9]/g, "");
        if (dot) return dot;
      }
      return null;
    } catch (err) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));
        continue;
      }
      throw err;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Legacy-shaped synthesis — lets the existing monitor verify engine
// (evaluateCarrier, rateInsuranceHistory) run unchanged on Motus data for
// carriers the frozen legacy datasets have never heard of.
// ---------------------------------------------------------------------------

function thousands(dollars: number | null): string {
  if (dollars === null || dollars <= 0) return "0";
  return String(Math.round(dollars / 1000));
}

export function motusToLegacyRows(m: MotusSnapshot): {
  carrierRows: CarrierRow[];
  insRows: InsHistRow[];
} {
  const carrierRows: CarrierRow[] = m.authorities.map((a) => {
    const isPassenger = /passenger/i.test(a.authorityType ?? "");
    return {
      dot_number: m.dotNumber.padStart(8, "0"),
      docket_number: a.docketNumber,
      // Motus doesn't split common/contract — an Active property authority maps
      // to common_stat 'A', which is what evaluateCarrier keys on.
      common_stat: a.isActive && !a.isBroker ? "A" : "N",
      contract_stat: "N",
      broker_stat: a.isActive && a.isBroker ? "A" : "N",
      property_chk: isPassenger ? "N" : "Y",
      passenger_chk: isPassenger ? "Y" : "N",
      // Insured with an unparseable coverage amount must still read as
      // insured — '0' here means "currently lapsed" and hard-disqualifies.
      bipd_file: m.insuranceActive
        ? thousands(m.insuranceMaxCoverage ?? 750_000)
        : "0",
      legal_name: m.legalName,
      dba_name: m.dbaName,
    };
  });

  // Cancelled filings become InsHist-shaped rows so the continuity/gap rating
  // sees real history; the in-force filing is deliberately NOT emitted (the
  // active policy never lives in InsHist — currentInsured carries it).
  // Broker authorities are excluded outright: their filings are surety bonds,
  // and a bond termination is not a BIPD gap.
  const now = Date.now();
  const insRows: InsHistRow[] = m.authorities
    .filter((a) => !a.isBroker)
    .flatMap((a) =>
      a.filings
        // Only filings whose cancellation has already TAKEN EFFECT. A future
        // cancellation date is an advance termination notice on the policy
        // that is still in force — emitting it as history would double-count
        // the active policy and skew the rating.
        .filter((f) => {
          if (!f.effectiveDate || !f.cancellationDate) return false;
          const cancel = Date.parse(f.cancellationDate);
          return Number.isFinite(cancel) && cancel <= now;
        })
        .map((f) => ({
          dot_number: m.dotNumber.padStart(8, "0"),
          docket_number: a.docketNumber,
          ins_form_code: "91",
          ins_class_code: null,
          mod_col_1: "Cancelled",
          mod_col_3: "BIPD/Primary",
          policy_no: f.policyNumber,
          name_company: null,
          min_cov_amount: thousands(f.maxCovAmount),
          effective_date: isoToMdy(f.effectiveDate),
          cancl_effective_date: isoToMdy(f.cancellationDate),
          // Pass the reason through untouched: the rating engine keys REVOKED
          // (mandatory red) and the NAMECHG/TRANSFER/TERM-REPL continuity
          // bridges on this exact string, and treats unknown methods
          // conservatively — collapsing to 'CANCEL' would erase both signals.
          cancl_method: f.filingStatusReason ?? "CANCEL",
        })),
    );

  return { carrierRows, insRows };
}

export { BIPD_REQUIRED_THOUSANDS };
