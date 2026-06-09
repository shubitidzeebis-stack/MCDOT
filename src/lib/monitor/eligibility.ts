// monitor/eligibility.ts — the 180-day Amazon Relay clock.
//
// Amazon Relay requires a carrier to have held active common/contract
// (property, non-broker) authority with continuous BIPD insurance for 180
// days before it can onboard. This module turns the audit signals into a
// single eligibility verdict + a "days to 180" countdown the admin can sort
// outreach by (hottest = smallest positive daysTo180).
//
// Anchor resolution (the date the clock runs from):
//   1. input.anchorDate  → earliest BIPD effective date (best). source from
//                          input.anchorSource (default 'bipd').
//   2. input.addDate     → coarse DOT-registration fallback, pushed forward by
//                          ADD_DATE_ANCHOR_LAG_DAYS so it can't overstate age.
//                          source 'add_date'.
//   3. neither           → no anchor; source 'none'.
//
// State thresholds (classified ONLY when anchor present, authority active and
// insurance continuous — gating states below take precedence):
//   daysSinceAnchor  < 150        → 'too_new'
//   daysSinceAnchor  150 .. 179   → 'approaching'   (pre-warm outreach window)
//   daysSinceAnchor  180 .. 365   → 'eligible_now'  (180+ qualifies; <=365 prime)
//   daysSinceAnchor  > 365        → 'aged_out'
//
// Gating states (override the day-count classification):
//   no anchor                     → 'awaiting_authority'  (everything null)
//   !authorityActive              → 'authority_inactive'  (timing still filled)
//   currentlyUninsured === true   → 'continuity_broken'
//   (NOTE: `continuous` is accepted but deliberately NOT a gate — per the
//   locked product rule, a HISTORICAL gap only lowers the score; only a
//   CURRENT lapse hard-gates. Do not "fix" this by gating on continuous.)
//
// daysTo180   = 180 - daysSinceAnchor   (negative once eligible).
// eligibleAt  = anchor + 180 days       (ISO yyyy-mm-dd).
//
// PURE & DETERMINISTIC: `today` is read from the argument or computed once
// INSIDE the function — never at module scope.

import type {
  AnchorSource,
  EligibilityResult,
  EligibilityState,
} from "@/lib/monitor/types";

const MS_PER_DAY = 86_400_000;
const ELIGIBLE_DAYS = 180;
const APPROACHING_FROM = 150;
const PRIME_MAX_DAYS = 365;

// When we fall back to the Census add_date proxy (no BIPD effective date on
// file — the common case for new carriers with no terminated policies), the
// TRUE authority-active / insurance-effective date lags DOT registration by
// ~3–6 weeks. add_date therefore OVERSTATES age and would label a carrier
// eligible weeks too early. We push the anchor forward by a conservative lag so
// a label can never overstate eligibility (false positives on timing are worse
// than contacting a few weeks late, and a human approves every send anyway).
const ADD_DATE_ANCHOR_LAG_DAYS = 30;

// Parse an ISO yyyy-mm-dd date into a UTC Date at midnight. Returns null for
// missing/malformed input so callers fall through the anchor chain cleanly.
function parseIsoDateUtc(value: string | null | undefined): Date | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const ms = Date.UTC(year, month - 1, day);
  const date = new Date(ms);
  // Reject overflow (e.g. 2026-02-31 rolling into March).
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

// Format a UTC Date back to ISO yyyy-mm-dd.
function toIsoDateUtc(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Midnight-UTC epoch ms for an arbitrary Date, so the day delta is unaffected
// by the wall-clock time of `today`.
function utcDayStartMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function computeEligibility(input: {
  anchorDate: string | null; // ISO yyyy-mm-dd — earliest BIPD effective date if known
  anchorSource: AnchorSource; // 'bipd' | 'add_date' | 'none'
  addDate: string | null; // ISO yyyy-mm-dd — coarse fallback proxy (DOT reg date)
  authorityActive: boolean; // Carrier common/contract active, property, NOT broker-only
  continuous: boolean; // insurance continuous (from insurance rating)
  currentlyUninsured?: boolean;
  today?: Date;
}): EligibilityResult {
  const today = input.today ?? new Date();

  // 1. Resolve the anchor + its source.
  let anchor: Date | null = null;
  let anchorIso: string | null = null;
  let anchorSource: AnchorSource = "none";

  const fromAnchor = parseIsoDateUtc(input.anchorDate);
  if (fromAnchor) {
    anchor = fromAnchor;
    anchorIso = toIsoDateUtc(fromAnchor);
    // Honor the caller's declared source, but never trust 'none' alongside a
    // real date; default to 'bipd'.
    anchorSource =
      input.anchorSource && input.anchorSource !== "none"
        ? input.anchorSource
        : "bipd";
  } else {
    const fromAdd = parseIsoDateUtc(input.addDate);
    if (fromAdd) {
      // Conservative lag: treat the clock as starting LATER than DOT
      // registration so add_date-anchored carriers are never labelled eligible
      // too early (see ADD_DATE_ANCHOR_LAG_DAYS).
      const lagged = new Date(
        fromAdd.getTime() + ADD_DATE_ANCHOR_LAG_DAYS * MS_PER_DAY,
      );
      anchor = lagged;
      anchorIso = toIsoDateUtc(lagged);
      anchorSource = "add_date";
    }
  }

  // 2. No anchor at all — awaiting authority, everything null.
  if (anchor === null) {
    return {
      state: "awaiting_authority",
      anchorDate: null,
      anchorSource: "none",
      daysSinceAnchor: null,
      daysTo180: null,
      eligibleAt: null,
    };
  }

  // 3. Timing math (always computed once we have an anchor).
  const daysSinceAnchor = Math.floor(
    (utcDayStartMs(today) - anchor.getTime()) / MS_PER_DAY,
  );
  const daysTo180 = ELIGIBLE_DAYS - daysSinceAnchor;
  const eligibleAt = toIsoDateUtc(
    new Date(anchor.getTime() + ELIGIBLE_DAYS * MS_PER_DAY),
  );

  // 4. Determine state. Gating conditions take precedence over the day-count
  // classification, but timing fields stay populated so the admin sees it.
  // Per the product rule, only a CURRENT insurance lapse hard-gates eligibility.
  // A historical gap (insurance.continuous === false but currently insured) must
  // NOT drop the carrier — it only lowers the score and is surfaced to the team.
  let state: EligibilityState;
  if (!input.authorityActive) {
    state = "authority_inactive";
  } else if (input.currentlyUninsured === true) {
    state = "continuity_broken";
  } else if (daysSinceAnchor < APPROACHING_FROM) {
    state = "too_new";
  } else if (daysSinceAnchor < ELIGIBLE_DAYS) {
    state = "approaching";
  } else if (daysSinceAnchor <= PRIME_MAX_DAYS) {
    state = "eligible_now";
  } else {
    state = "aged_out";
  }

  return {
    state,
    anchorDate: anchorIso,
    anchorSource,
    daysSinceAnchor,
    daysTo180,
    eligibleAt,
  };
}
