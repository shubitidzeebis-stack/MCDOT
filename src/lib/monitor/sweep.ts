// The monitoring sweep — the heart of the outbound agent. Invoked once per
// cron run, AFTER the transactional email queue, so it never starves it.
//
// Contract: self-bounding and non-throwing. Gated by the `monitorEnabled` Edge
// Config flag (default OFF) and a weekday allowlist (`monitorDays`), so it is
// completely inert in production until explicitly switched on.
//
// Two run modes:
//   - 'cron'     (default): discover (gated by `discoveryEnabled`) → verify →
//                safety enrich → draft. The normal daily pass.
//   - 'backfill' (manual ?backfill=1): NO discovery, batched verify + safety
//      enrich at higher caps, no draft. Used to work the standing backlog
//      without adding new rows; trigger it repeatedly until drained.
//
// All passes are bounded by a wall-clock budget and resumable via a Postgres
// cursor / queue (a timed-out run picks up where it left off next time; upserts
// + idempotent stage updates make re-processing safe).

import { getConfigValue, getFlag } from "@/lib/flags";
import { isUnsubscribed } from "@/lib/db/email-followups";
import {
  enqueueDraft,
  ensureMonitorTables,
  getCursor,
  getOutreachStageCounts,
  listMonitorForDrafting,
  listMonitorForSafetyEnrich,
  listMonitorForVerification,
  logAgentAction,
  markMonitorNotFound,
  setCursor,
  setMonitorStage,
  updateMonitorSafety,
  updateMonitorVerification,
  upsertMonitorCandidate,
} from "@/lib/db/monitor";
import { discoverCandidates } from "@/lib/monitor/discovery";
import { verifyCandidatesBatch } from "@/lib/monitor/verify";
import { rateSafety } from "@/lib/audit/safety";
import { lookupCarrierBasics } from "@/lib/fmcsa";
import { generateDraft } from "@/lib/outreach/draft";
import { selectPersona } from "@/lib/outreach/templates";

export type MonitorSweepMode = "cron" | "backfill";

export type MonitorSweepResult =
  | { ran: false; reason: "disabled" }
  | { ran: false; reason: "not_scheduled_day"; today: number; days: number[] }
  | {
      ran: true;
      mode: MonitorSweepMode;
      discovered: number;
      verified: number;
      enriched: number;
      drafted: number;
      note?: string;
    };

// Per-run safety rails. The wall-clock budget is the real ceiling (it can never
// trip the function maxDuration); the caps just bound work on fast runs.
// Default tuned for Pro (maxDuration 300). Env var overrides if set.
const BUDGET_MS = Number(process.env.MONITOR_SWEEP_BUDGET_MS) || 200_000;
const DISCOVER_CAP = 1500;
const VERIFY_CAP_CRON = 150;
const VERIFY_CAP_BACKFILL = 1500; // batched fetch → cheap; wall-clock is the real cap
const VERIFY_BATCH = 100; // DOTs per Socrata IN(...) query
const ENRICH_CAP_CRON = 40; // QCMobile safety lookups/run — bounded by 60/min
const ENRICH_CAP_BACKFILL = 300; // ~60/min × 5 min
const DRAFT_CAP = 25; // LLM calls are slower; the wall-clock budget is the real cap
const BACKFILL_WINDOW_DAYS = 210; // ~7 months — catches carriers nearing 180d

const MS_PER_DAY = 86_400_000;

function yyyymmdd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export async function monitorSweep(
  opts: { mode?: MonitorSweepMode } = {},
): Promise<MonitorSweepResult> {
  const mode: MonitorSweepMode = opts.mode ?? "cron";
  const isBackfill = mode === "backfill";

  if (!(await getFlag("monitorEnabled"))) {
    return { ran: false, reason: "disabled" };
  }

  // Weekday gate — monitorDays is a CSV of UTC weekday numbers (0=Sun..6=Sat).
  // Empty/blank means "every day this cron fires". Backfill is manual → ignores
  // the weekday gate.
  if (!isBackfill) {
    const days = (await getConfigValue("monitorDays"))
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0) // drop empty tokens so blank/"" => [] => every day
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    const today = new Date().getUTCDay();
    if (days.length > 0 && !days.includes(today)) {
      return { ran: false, reason: "not_scheduled_day", today, days };
    }
  }

  await ensureMonitorTables();

  const startedAt = Date.now();
  const overBudget = () => Date.now() - startedAt > BUDGET_MS;
  // Per-pass budget reservation so a heavy pass can't starve a later one.
  const over = (frac: number) => Date.now() - startedAt > BUDGET_MS * frac;

  const VERIFY_CAP = isBackfill ? VERIFY_CAP_BACKFILL : VERIFY_CAP_CRON;
  const ENRICH_CAP = isBackfill ? ENRICH_CAP_BACKFILL : ENRICH_CAP_CRON;
  const ENRICH_FRAC = isBackfill ? 0.97 : 0.9;

  // ---- Pass 1: discover (cron only, gated by discoveryEnabled) --------------
  let discovered = 0;
  const discoverOn = !isBackfill && (await getFlag("discoveryEnabled"));
  if (discoverOn) {
    try {
      const cursor = await getCursor("discover");
      const sinceDay = cursor?.last_processed_day
        ? cursor.last_processed_day.replace(/-/g, "")
        : yyyymmdd(new Date(Date.now() - BACKFILL_WINDOW_DAYS * MS_PER_DAY));

      const candidates = await discoverCandidates({
        sinceDay,
        maxRows: DISCOVER_CAP,
      });

      let maxAddDate = cursor?.last_processed_day ?? null;
      for (const c of candidates) {
        if (over(0.25)) break;
        const id = await upsertMonitorCandidate(c);
        if (id != null) discovered++;
        if (c.addDate && (!maxAddDate || c.addDate > maxAddDate)) {
          maxAddDate = c.addDate;
        }
      }
      await setCursor("discover", maxAddDate, {
        discovered,
        at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[monitorSweep] discover pass failed", err);
    }
  }

  // ---- Pass 2: verify (batched) ---------------------------------------------
  // Fetch Carrier + InsHist for a whole chunk of DOTs in two Socrata queries
  // (verifyCandidatesBatch), then persist each verdict. A carrier missing from
  // the FMCSA authority table is tagged not-found (retried later), NOT
  // disqualified — disqualifying on absent data would permanently drop real
  // carriers. broker-only / inactive authority ARE disqualified, with a reason.
  let verified = 0;
  try {
    const targets = await listMonitorForVerification(VERIFY_CAP);
    for (let i = 0; i < targets.length; i += VERIFY_BATCH) {
      if (over(0.6)) break;
      const chunk = targets.slice(i, i + VERIFY_BATCH);
      let results;
      try {
        results = await verifyCandidatesBatch(
          chunk.map((t) => ({
            dotNumber: t.dot_number,
            addDate: t.add_date,
            powerUnits: t.power_units,
          })),
        );
      } catch (e) {
        // Socrata error for the whole chunk — stop this pass, retry next run.
        console.error("[monitorSweep] batch verify failed", e);
        break;
      }
      for (let j = 0; j < chunk.length; j++) {
        const t = chunk[j];
        const r = results[j];
        try {
          if (!r.carrierFound) {
            await markMonitorNotFound(t.id);
            continue;
          }
          let stage = "verified";
          let disqualifyReason: string | null = null;
          if (r.brokerOnly) {
            stage = "disqualified";
            disqualifyReason = "broker_only";
          } else if (!r.authorityActive) {
            stage = "disqualified";
            disqualifyReason = "authority_inactive";
          }
          const authorityStatus = r.brokerOnly
            ? "broker_only"
            : r.authorityActive
              ? "active"
              : "inactive";
          await updateMonitorVerification(t.id, {
            bipdAnchorDate: r.insurance.earliestBipdEffective,
            eligibleAt: r.eligibility.eligibleAt,
            daysTo180: r.eligibility.daysTo180,
            eligibilityState: r.eligibility.state,
            insuranceCurrent: r.currentInsured,
            insuranceRating: r.insurance.rating,
            insuranceGaps: r.insurance.gaps,
            auditScore: r.auditRating,
            acquisitionScore: r.acquisitionScore,
            authorityStatus,
            monitorStage: stage,
            disqualifyReason,
          });
          verified++;
        } catch (e) {
          console.error("[monitorSweep] verify persist failed", t.dot_number, e);
        }
      }
    }
  } catch (err) {
    console.error("[monitorSweep] verify pass failed", err);
  }

  // ---- Pass 2.5: safety enrich ----------------------------------------------
  // For in-window verified carriers, pull FMCSA SMS basics (QCMobile) and apply
  // the OOS / crash / safety-rating gate. >30% OOS or Unsatisfactory => fail
  // (disqualified); Conditional / high-crash => review; else pass. A DOT not yet
  // in QCMobile (brand-new) passes clean. Lookup ERRORS leave it unchecked to
  // retry next run (never disqualify on a transient API failure).
  let enriched = 0;
  let enrichNote = "";
  try {
    const targets = await listMonitorForSafetyEnrich(ENRICH_CAP);
    const tCount = targets.length;
    const enrichStartMs = Date.now() - startedAt;
    let firstErr = "";
    for (const t of targets) {
      if (over(ENRICH_FRAC)) break;
      if (!t.dot_number) continue;
      try {
        const c = await lookupCarrierBasics(t.dot_number);
        if (!c) {
          // Not in QCMobile yet — new carrier, no violations on record.
          await updateMonitorSafety(t.id, {
            driverOosRate: null,
            vehicleOosRate: null,
            crashTotal: null,
            safetyRating: null,
            status: "pass",
            penalty: 0,
            reasons: ["no FMCSA safety record yet (new carrier)"],
          });
          enriched++;
          continue;
        }
        const r = rateSafety({
          driverInsp: c.driverInsp,
          driverOosRate: c.driverOosRate,
          vehicleInsp: c.vehicleInsp,
          vehicleOosRate: c.vehicleOosRate,
          crashTotal: c.crashTotal,
          safetyRating: c.safetyRating,
        });
        await updateMonitorSafety(t.id, {
          driverOosRate: c.driverOosRate,
          vehicleOosRate: c.vehicleOosRate,
          crashTotal: c.crashTotal,
          safetyRating: c.safetyRating,
          status: r.status,
          penalty: r.penalty,
          reasons: r.reasons,
        });
        enriched++;
      } catch (e) {
        // Transient FMCSA error — leave safety_checked_at NULL, retry next run.
        if (!firstErr)
          firstErr = (e instanceof Error ? e.message : String(e)).slice(0, 140);
        console.error("[monitorSweep] safety enrich failed", t.dot_number, e);
      }
    }
    enrichNote = `mode=${mode} targets=${tCount} startMs=${enrichStartMs} enriched=${enriched} err=${firstErr}`;
  } catch (err) {
    enrichNote = `enrich-threw: ${(err instanceof Error ? err.message : String(err)).slice(0, 140)}`;
    console.error("[monitorSweep] enrich pass failed", err);
  }

  // ---- Pass 3: draft (cron only, gated by outreachDraftEnabled) -------------
  // Qualified candidates get a persona-tailored draft into the outreach queue
  // (stage='draft' — human approval is still required to send, unless P5
  // auto-send is on). No usable email → routed to the phone work-queue.
  let drafted = 0;
  try {
    if (!isBackfill && (await getFlag("outreachDraftEnabled"))) {
      // Just-in-time drafting: keep at most ~2 days of sends queued so the
      // personalized timing lines ("~N days from the 180-day mark") are always
      // fresh when the email actually goes out. The queue refills hourly.
      const dailyCap = Math.min(
        500,
        Math.max(1, Number(await getConfigValue("outreachDailyCap")) || 20),
      );
      const stages = await getOutreachStageCounts();
      const pending = (stages["draft"] ?? 0) + (stages["approved"] ?? 0);
      const room = dailyCap * 2 - pending;
      const targets =
        room > 0 ? await listMonitorForDrafting(Math.min(DRAFT_CAP, room)) : [];
      for (const t of targets) {
        if (overBudget()) break;
        const email = t.census_email?.trim() || null;
        // Census email fields carry junk ("N/A", "NONE", bare names) — only a
        // plausibly-deliverable address goes the email route; rest go to phone.
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          await setMonitorStage(t.id, "outreach_phone", "phone");
          continue;
        }
        if (await isUnsubscribed(email)) {
          await setMonitorStage(t.id, "suppressed");
          continue;
        }
        try {
          const persona = selectPersona({ powerUnits: t.power_units });
          const state =
            (t.phy_address as { state?: string | null } | null)?.state ?? null;
          const draft = await generateDraft(
            {
              legalName: t.legal_name,
              dbaName: t.dba_name,
              state,
              mcNumber: t.mc_number,
              dotNumber: t.dot_number,
              powerUnits: t.power_units,
              daysTo180: t.days_to_180,
              eligibilityState: t.eligibility_state,
              offerLow: null,
              offerHigh: null,
            },
            { personaKey: persona },
          );
          const queuedId = await enqueueDraft({
            valuationId: t.id,
            channel: "email",
            recipientEmail: email,
            recipientPhone: t.telephone,
            persona,
            subject: draft.subject,
            bodyText: draft.body,
          });
          if (queuedId == null) {
            // An in-flight (approved/sending/sent) queue row already exists for
            // this carrier — do NOT regress its stage or touch that row.
            console.error("[monitorSweep] draft skipped, in-flight row exists", t.dot_number);
            continue;
          }
          await setMonitorStage(t.id, "drafted", "email");
          drafted += 1;
        } catch (e) {
          console.error("[monitorSweep] draft failed", t.dot_number, e);
        }
      }
    }
  } catch (err) {
    console.error("[monitorSweep] draft pass failed", err);
  }

  // Heartbeat for the dashboard activity feed — only when work happened, so
  // hourly no-op runs don't flood the feed.
  if (discovered + verified + enriched + drafted > 0) {
    await logAgentAction("sweep_completed", "agent", null, {
      mode,
      discovered,
      verified,
      enriched,
      drafted,
    });
  }

  return { ran: true, mode, discovered, verified, enriched, drafted, note: enrichNote };
}
