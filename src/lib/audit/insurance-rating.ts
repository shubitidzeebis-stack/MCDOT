// Pure insurance-history rating from FMCSA InsHist rows.
//
// InsHist holds ONLY terminated BIPD policies; the currently-active policy is
// never present. "currentInsured" therefore comes from the caller (the Carrier
// table's bipd_file != '00000'), NOT from these rows.
//
// This module is deterministic and PURE: no module-scope clock. "today" is
// (opts.today ?? new Date()) resolved INSIDE the function. All emitted dates are
// ISO yyyy-mm-dd; all internal date math is on UTC-midnight Date objects.
//
// Verified data rules implemented here are documented inline at each gate.

import type {
  InsHistRow,
  InsuranceGap,
  InsuranceHistoryResult,
  InsuranceInterval,
  InsuranceRating,
} from "@/lib/monitor/types";

// --------------------------------------------------------------------------
// Local helper types (intentionally NOT in the shared contract).
// --------------------------------------------------------------------------

// An interval before merge, carrying the trailing cancl_method so the merge
// pass can decide bridging vs. gap. The public InsuranceInterval has no method.
type RawInterval = {
  start: Date;
  end: Date;
  insurer: string | null;
  policyNo: string | null;
  method: string | null; // normalized cancl_method
};

// A merged block. `method` is the trailing termination method (the method of
// the segment with the latest end) — it governs the boundary to the NEXT block.
type MergedBlock = {
  start: Date;
  end: Date;
  insurer: string | null;
  policyNo: string | null;
  method: string | null;
};

// --------------------------------------------------------------------------
// Constants — verified data rules + documented thresholds.
// --------------------------------------------------------------------------

// BIPD coverage lives only on these filing forms. '35' is a cancellation
// notice (never a coverage start) and is excluded.
const BIPD_FORM_CODES = new Set(["91", "91X"]);

// cancl_method values that PRESERVE continuity (re-file / name change /
// transfer) — these bridge an interval boundary, even past graceDays.
const CONTINUITY_METHODS = new Set(["TERM/REPL", "NAMECHG", "TRANSFER"]);

// Real terminations (an actual lapse) are CANCEL / CANC/CANCL / TERM/CANCL /
// REVOKED. We don't enumerate them as a set: a boundary is treated as a real
// gap whenever the trailing method is NOT continuity-preserving (covers
// unknown/null methods conservatively too). REVOKED is special-cased below.
const REVOKED_METHOD = "REVOKED";

// Upper bound (days) for the single-short-gap amber band. The spec gives ~60d
// as a guideline; chosen and documented here, not a hard external fact. A lone
// real gap above this (but the carrier is currently insured) still reads red.
const AMBER_MAX_GAP_DAYS = 60;

const MS_PER_DAY = 86_400_000;

// --------------------------------------------------------------------------
// parseMdy — MM/DD/YYYY TEXT -> Date at UTC midnight, or null.
// --------------------------------------------------------------------------

/**
 * Parse an FMCSA MM/DD/YYYY date string to a UTC-midnight Date.
 * Returns null for anything not a strict, real MM/DD/YYYY date (round-trip
 * validated so JS date rollover like 02/30/2020 -> Mar 1 is rejected).
 */
export function parseMdy(s: string | null | undefined): Date | null {
  if (s == null) return null;
  const trimmed = String(s).trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!m) return null;

  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);

  if (
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(year)
  ) {
    return null;
  }
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const d = new Date(Date.UTC(year, month - 1, day));
  // Round-trip: reject impossible dates that JS silently rolls forward.
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
}

// --------------------------------------------------------------------------
// Internal helpers.
// --------------------------------------------------------------------------

function toUtcMidnight(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function toIso(d: Date): string {
  // UTC-midnight Date -> yyyy-mm-dd.
  return d.toISOString().slice(0, 10);
}

function dayDiff(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / MS_PER_DAY);
}

function norm(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  return t.length ? t : null;
}

// Is this row BIPD coverage on a coverage-start form?
function isBipdCoverageRow(row: InsHistRow): boolean {
  const form = norm(row.ins_form_code);
  if (!form || !BIPD_FORM_CODES.has(form)) return false;

  const cov = norm(row.mod_col_3);
  if (!cov) return false;
  // Keep BIPD / BIPD/Primary / BIPD/Full*; EXCLUDE BIPD/Excess.
  return (
    cov === "BIPD" || cov === "BIPD/Primary" || cov.startsWith("BIPD/Full")
  );
}

// --------------------------------------------------------------------------
// Primary export.
// --------------------------------------------------------------------------

export function rateInsuranceHistory(
  rows: InsHistRow[],
  opts: {
    currentInsured: boolean;
    currentInsurer?: string | null;
    today?: Date;
    graceDays?: number;
  },
): InsuranceHistoryResult {
  const today = toUtcMidnight(opts.today ?? new Date());
  const graceDays =
    typeof opts.graceDays === "number" && opts.graceDays >= 0
      ? opts.graceDays
      : 30;
  const currentInsured = opts.currentInsured;
  const currentInsurer = norm(opts.currentInsurer);

  // ---- 1. Filter to BIPD coverage rows and build raw intervals. ----------
  const raw: RawInterval[] = [];
  let hasRevoked = false;

  for (const row of rows ?? []) {
    if (!isBipdCoverageRow(row)) continue;

    const start = parseMdy(row.effective_date);
    if (!start) continue; // unparseable start -> drop.

    const end = parseMdy(row.cancl_effective_date);
    // Terminated-only table: a row with no parseable cancl date is anomalous;
    // it cannot define a closed interval, so drop it from intervals.
    if (!end) continue;

    // Drop same-day / inverted artifacts (filing noise).
    if (end.getTime() <= start.getTime()) continue;

    const method = norm(row.cancl_method);
    if (method === REVOKED_METHOD) hasRevoked = true;

    raw.push({
      start: toUtcMidnight(start),
      end: toUtcMidnight(end),
      insurer: norm(row.name_company),
      policyNo: norm(row.policy_no),
      method,
    });
  }

  // ---- 2. No BIPD rows at all -> unknown. --------------------------------
  if (raw.length === 0) {
    const reasoning: string[] = [];
    reasoning.push("No BIPD insurance history (form 91/91X) on file.");
    reasoning.push(
      currentInsured
        ? "Carrier currently shows BIPD on file (per authority record), but no terminated-policy history is available to assess continuity."
        : "Carrier is currently uninsured (no BIPD on file) and has no insurance history.",
    );
    return {
      earliestBipdEffective: null,
      intervals: [],
      gaps: [],
      currentInsured,
      lapsedNow: !currentInsured,
      continuous: false,
      longestGapDays: 0,
      currentInsurer,
      rating: "unknown",
      reasoning,
    };
  }

  // ---- 3. Sort by start asc (tie-break by end asc) and merge. ------------
  raw.sort((a, b) => {
    const s = a.start.getTime() - b.start.getTime();
    if (s !== 0) return s;
    return a.end.getTime() - b.end.getTime();
  });

  const earliestStart = raw[0].start;

  const merged: MergedBlock[] = [];
  for (const seg of raw) {
    const prev = merged[merged.length - 1];
    if (!prev) {
      merged.push({ ...seg });
      continue;
    }

    // Bridging rule: merge when the next segment starts within grace of the
    // prior block's end, OR when the prior block's TRAILING method is
    // continuity-preserving (re-file/name change/transfer bridges any gap).
    const withinGrace =
      seg.start.getTime() <= prev.end.getTime() + graceDays * MS_PER_DAY;
    const bridgesByMethod =
      prev.method != null && CONTINUITY_METHODS.has(prev.method);

    if (withinGrace || bridgesByMethod) {
      // Extend the block. The trailing edge (end + governing method +
      // insurer/policy) follows whichever segment ends latest.
      if (seg.end.getTime() >= prev.end.getTime()) {
        prev.end = seg.end;
        prev.method = seg.method;
        prev.insurer = seg.insurer;
        prev.policyNo = seg.policyNo;
      }
      // else: fully contained segment — block edge unchanged.
    } else {
      merged.push({ ...seg });
    }
  }

  // ---- 4. Compute gaps between merged blocks. ----------------------------
  // A gap emits only when the prior block's TRAILING method is a REAL
  // termination AND next.start - prev.end > graceDays. Unknown/null methods
  // are treated as real terminations (conservative: don't silently bridge).
  const historicalGaps: InsuranceGap[] = [];
  for (let i = 1; i < merged.length; i++) {
    const prev = merged[i - 1];
    const next = merged[i];
    const gapDays = dayDiff(next.start, prev.end);
    if (gapDays <= graceDays) continue;

    const trailing = prev.method;
    const isContinuity = trailing != null && CONTINUITY_METHODS.has(trailing);
    if (isContinuity) continue; // continuity-preserving -> not a real gap.

    // Real termination (explicit real method, or unknown/null -> conservative).
    historicalGaps.push({
      from: toIso(prev.end),
      to: toIso(next.start),
      days: gapDays,
      method: trailing,
    });
  }

  // ---- 5. Build public intervals from merged blocks. ---------------------
  const intervals: InsuranceInterval[] = merged.map((b) => ({
    start: toIso(b.start),
    end: toIso(b.end),
    insurer: b.insurer,
    policyNo: b.policyNo,
  }));

  // ---- 6. Apply current status to the latest interval / live tail. -------
  const gaps: InsuranceGap[] = [...historicalGaps];
  let lapsedNow = false;

  const lastBlock = merged[merged.length - 1];
  const lastInterval = intervals[intervals.length - 1];

  if (currentInsured) {
    // The active (unlisted) policy bridges the latest interval to today.
    // No live tail gap. Open the last interval.
    lastInterval.end = null;
  } else {
    // Currently uninsured: there is a live lapse from the last known end
    // through today.
    lapsedNow = true;
    const liveDays = dayDiff(today, lastBlock.end);
    gaps.push({
      from: toIso(lastBlock.end),
      to: toIso(today),
      days: liveDays > 0 ? liveDays : 0,
      method: lastBlock.method,
      live: true,
    });
  }

  // ---- 7. Aggregate metrics. ---------------------------------------------
  const longestGapDays = gaps.reduce((mx, g) => Math.max(mx, g.days), 0);

  // Historical real gaps only (live tail handled via lapsedNow/currentInsured).
  const realHistoricalGaps = historicalGaps;
  const continuous = currentInsured && realHistoricalGaps.length === 0;

  // ---- 8. Rating (ordered; amber is a carve-out from red). ---------------
  // 1) unknown handled above (no BIPD rows).
  // 2) !currentInsured -> red
  // 3) any REVOKED in window -> red (clock-reset signal)
  // 4) >= 2 real historical gaps -> red
  // 5) exactly 1 real historical gap, days > AMBER_MAX_GAP_DAYS -> red
  // 6) exactly 1 real historical gap, days <= AMBER_MAX_GAP_DAYS -> amber
  // 7) else -> green
  let rating: InsuranceRating;
  if (!currentInsured) {
    rating = "red";
  } else if (hasRevoked) {
    rating = "red";
  } else if (realHistoricalGaps.length >= 2) {
    rating = "red";
  } else if (realHistoricalGaps.length === 1) {
    rating =
      realHistoricalGaps[0].days > AMBER_MAX_GAP_DAYS ? "red" : "amber";
  } else {
    rating = "green";
  }

  // ---- 9. Human-readable reasoning for the safety team. ------------------
  const reasoning = buildReasoning({
    intervals,
    realHistoricalGaps,
    earliestStart,
    currentInsured,
    currentInsurer,
    lapsedNow,
    hasRevoked,
    longestGapDays,
    graceDays,
    rating,
    liveGap: gaps.find((g) => g.live === true) ?? null,
  });

  return {
    earliestBipdEffective: toIso(earliestStart),
    intervals,
    gaps,
    currentInsured,
    lapsedNow,
    continuous,
    longestGapDays,
    currentInsurer,
    rating,
    reasoning,
  };
}

// --------------------------------------------------------------------------
// Reasoning builder (kept separate for readability; pure).
// --------------------------------------------------------------------------

function buildReasoning(ctx: {
  intervals: InsuranceInterval[];
  realHistoricalGaps: InsuranceGap[];
  earliestStart: Date;
  currentInsured: boolean;
  currentInsurer: string | null;
  lapsedNow: boolean;
  hasRevoked: boolean;
  longestGapDays: number;
  graceDays: number;
  rating: InsuranceRating;
  liveGap: InsuranceGap | null;
}): string[] {
  const out: string[] = [];

  const insurerNames = new Set(
    ctx.intervals
      .map((i) => i.insurer)
      .filter((n): n is string => n != null && n.length > 0),
  );
  const insurerCount = insurerNames.size;

  out.push(
    `BIPD insurance history: ${ctx.intervals.length} coverage period${
      ctx.intervals.length === 1 ? "" : "s"
    } across ${insurerCount} insurer${insurerCount === 1 ? "" : "s"} (earliest effective ${toIso(
      ctx.earliestStart,
    )}).`,
  );

  if (ctx.realHistoricalGaps.length === 0) {
    out.push("No historical coverage gaps beyond the grace window.");
  } else {
    for (const g of ctx.realHistoricalGaps) {
      out.push(
        `Coverage gap of ${g.days} days (${g.from} -> ${g.to}${
          g.method ? `, ${g.method}` : ""
        }).`,
      );
    }
    out.push(
      `Longest gap: ${ctx.longestGapDays} days (grace window ${ctx.graceDays} days).`,
    );
  }

  if (ctx.hasRevoked) {
    out.push(
      "REVOKED filing present in window — authority/insurance clock reset; treat with caution.",
    );
  }

  if (ctx.currentInsured) {
    out.push(
      ctx.currentInsurer
        ? `Currently insured (BIPD on file) with ${ctx.currentInsurer}; active policy bridges the latest period to today.`
        : "Currently insured (BIPD on file); active policy bridges the latest period to today.",
    );
  } else if (ctx.liveGap) {
    out.push(
      `Currently UNINSURED — live lapse of ${ctx.liveGap.days} days since ${ctx.liveGap.from}.`,
    );
  } else {
    out.push("Currently UNINSURED (no BIPD on file).");
  }

  out.push(`Rating: ${ctx.rating.toUpperCase()}.`);

  return out;
}
