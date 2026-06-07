// Shared type contract for the outbound monitoring agent. This is the single
// source of truth that every monitor/audit module builds against, so the pieces
// compose cleanly. Keep it dependency-free (types + enums only, no runtime).
//
// Verified data gotchas these types encode (live 2026-06-06):
//  - Census dot_number is UNPADDED; InsHist/Carrier are zero-padded to 8 digits.
//  - InsHist holds only TERMINATED policies; "currently insured" comes from the
//    Carrier table's bipd_file, not InsHist.
//  - InsHist effective_date / cancl_effective_date are MM/DD/YYYY TEXT.
//  - BIPD coverage = mod_col_3 IN ('BIPD','BIPD/Primary') OR LIKE 'BIPD/Full%';
//    intervals only from ins_form_code IN ('91','91X').

// ---------------------------------------------------------------------------
// Census (discovery source) — selected fields, strings as Socrata returns them.
// ---------------------------------------------------------------------------
export type CensusRow = {
  dot_number: string;
  legal_name?: string | null;
  dba_name?: string | null;
  email_address?: string | null;
  phone?: string | null;
  phy_street?: string | null;
  phy_city?: string | null;
  phy_state?: string | null;
  phy_zip?: string | null;
  carrier_mailing_street?: string | null;
  carrier_mailing_city?: string | null;
  carrier_mailing_state?: string | null;
  carrier_mailing_zip?: string | null;
  power_units?: string | null;
  truck_units?: string | null;
  total_drivers?: string | null;
  carrier_operation?: string | null; // 'A' interstate, 'B'/'C' intrastate
  classdef?: string | null; // e.g. "AUTHORIZED FOR HIRE;PRIVATE PROPERTY"
  add_date?: string | null; // YYYYMMDD
  status_code?: string | null; // 'A' active
  mcs150_date?: string | null;
  company_officer_1?: string | null;
  business_org_desc?: string | null;
};

export type Address = {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

// Normalized discovery output, ready to upsert as a monitor candidate.
export type MonitorCandidate = {
  dotNumber: string; // UNPADDED (Census form) — LPAD before InsHist/Carrier joins
  legalName: string | null;
  dbaName: string | null;
  email: string | null; // Census email_address (may be a filing-service addr)
  phone: string | null;
  state: string | null; // phy_state — drives the SoS UCC deep link
  phyAddress: Address;
  mailingAddress: Address;
  powerUnits: number | null;
  truckUnits: number | null;
  totalDrivers: number | null;
  classdef: string | null;
  addDate: string | null; // ISO yyyy-mm-dd (parsed from YYYYMMDD)
  censusRaw: CensusRow;
};

// ---------------------------------------------------------------------------
// InsHist (historical insurance) — selected fields.
// ---------------------------------------------------------------------------
export type InsHistRow = {
  dot_number?: string | null; // zero-padded to 8
  docket_number?: string | null;
  ins_form_code?: string | null; // '91' | '91X' (BIPD coverage) | '35' (cancel notice) | ...
  ins_class_code?: string | null;
  mod_col_1?: string | null; // status, e.g. "Cancelled" | "Replaced"
  mod_col_3?: string | null; // coverage type, e.g. "BIPD/Primary" | "CARGO"
  policy_no?: string | null;
  name_company?: string | null; // insurer
  min_cov_amount?: string | null;
  effective_date?: string | null; // MM/DD/YYYY
  cancl_effective_date?: string | null; // MM/DD/YYYY
  cancl_method?: string | null; // CANCEL | CANC/CANCL | TERM/CANCL | REVOKED | TERM/REPL | NAMECHG | TRANSFER
};

// Carrier "All With History" — current authority status (no date fields).
export type CarrierRow = {
  dot_number?: string | null; // zero-padded to 8
  docket_number?: string | null;
  common_stat?: string | null; // 'A' | 'I' | 'N'
  contract_stat?: string | null;
  broker_stat?: string | null;
  common_app_pend?: string | null;
  common_rev_pend?: string | null;
  property_chk?: string | null; // 'Y'
  passenger_chk?: string | null;
  hhg_chk?: string | null;
  private_auth_chk?: string | null;
  bipd_file?: string | null; // '00000' = uninsured; non-zero = insured on file
  legal_name?: string | null;
  dba_name?: string | null;
};

// ---------------------------------------------------------------------------
// Insurance rating (audit/insurance-rating.ts)
// ---------------------------------------------------------------------------
export type InsuranceRating = "green" | "amber" | "red" | "unknown";

export type InsuranceInterval = {
  start: string; // ISO yyyy-mm-dd
  end: string | null; // ISO; null only when the segment is the open/active one
  insurer: string | null;
  policyNo: string | null;
};

export type InsuranceGap = {
  from: string; // ISO
  to: string; // ISO
  days: number;
  method: string | null; // cancl_method that opened the gap
  live?: boolean; // true if the gap runs to "today" (currently uninsured)
};

export type InsuranceHistoryResult = {
  // Earliest BIPD effective date among terminated policies. May be null for
  // brand-new carriers whose first (still-active) policy isn't in InsHist yet.
  earliestBipdEffective: string | null; // ISO
  intervals: InsuranceInterval[];
  gaps: InsuranceGap[];
  currentInsured: boolean; // passed in from Carrier.bipd_file (NOT InsHist)
  lapsedNow: boolean; // currentInsured === false
  continuous: boolean; // no gap > grace AND not lapsedNow
  longestGapDays: number;
  currentInsurer: string | null;
  rating: InsuranceRating;
  reasoning: string[];
};

// ---------------------------------------------------------------------------
// Eligibility (monitor/eligibility.ts) — the 180-day Amazon Relay clock.
// ---------------------------------------------------------------------------
export type EligibilityState =
  | "too_new" // < 150 days since anchor
  | "approaching" // 150–179d — pre-warm outreach window opens, sort closest-first
  | "eligible_now" // >= 180d (<=365 prime)
  | "aged_out" // > 365d
  | "awaiting_authority" // no anchor yet (no BIPD, brand new)
  | "authority_inactive" // Carrier authority not active / broker-only
  | "continuity_broken"; // insurance not continuous — tracked, not promotable

export type AnchorSource = "bipd" | "add_date" | "none";

export type EligibilityResult = {
  state: EligibilityState;
  anchorDate: string | null; // ISO date the clock runs from
  anchorSource: AnchorSource;
  daysSinceAnchor: number | null;
  daysTo180: number | null; // positive = not yet eligible (hottest when small)
  eligibleAt: string | null; // ISO = anchor + 180d
};

// ---------------------------------------------------------------------------
// UCC (audit/ucc.ts) — human handoff to the safety team.
// ---------------------------------------------------------------------------
export type UccRating = "green" | "amber" | "red" | "unknown";

export type UccLinkType = "landing" | "login" | "query";

export type UccPortal = { url: string; linkType: UccLinkType; notes: string };

export type UccHandoff = {
  searchUrl: string; // correct state SoS UCC search page (or Google fallback)
  linkType: UccLinkType;
  notes: string;
  clipboardName: string; // ready-to-paste debtor name (state-specific compaction)
};

export type UccFindings = {
  liensFound: boolean;
  lienCount?: number | null;
  securedParties?: string[] | null;
  collateral?: string | null;
  notes?: string | null;
};

// ---------------------------------------------------------------------------
// Combined audit score (audit/score.ts) — "rate both".
// ---------------------------------------------------------------------------
export type AuditRating = "green" | "amber" | "red";

export type AuditScoreResult = {
  audit: AuditRating; // worst-of insurance ⊕ ucc, current-lapse forces red
  blockers: string[]; // e.g. ["currently uninsured"]
  acquisitionScore: number | null; // 0–100 overall attractiveness (null pre-rating)
};
