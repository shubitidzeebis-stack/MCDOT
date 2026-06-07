// The monitoring sweep — the heart of the outbound agent. Invoked once per
// cron run, AFTER the transactional email queue, so it never starves it.
//
// Contract: self-bounding and non-throwing. Gated by the `monitorEnabled` Edge
// Config flag (default OFF) and a weekday allowlist (`monitorDays`), so it is
// completely inert in production until explicitly switched on.
//
// Two passes per run, both bounded by a wall-clock budget and resumable via a
// Postgres cursor (so a timed-out run picks up where it left off next time):
//   1. discover — pull new for-hire interstate carriers from Census since the
//      cursor day, upsert as monitor candidates (idempotent).
//   2. verify   — for candidates needing it, pull Carrier + InsHist, run the
//      rating/eligibility/score engine, persist.

import { getConfigValue, getFlag } from "@/lib/flags";
import { isUnsubscribed } from "@/lib/db/email-followups";
import {
  enqueueDraft,
  ensureMonitorTables,
  getCursor,
  listMonitorForDrafting,
  listMonitorForVerification,
  logAgentAction,
  setCursor,
  setMonitorStage,
  updateMonitorVerification,
  upsertMonitorCandidate,
} from "@/lib/db/monitor";
import { discoverCandidates } from "@/lib/monitor/discovery";
import { verifyCandidate } from "@/lib/monitor/verify";
import { generateDraft } from "@/lib/outreach/draft";
import { selectPersona } from "@/lib/outreach/templates";

export type MonitorSweepResult =
  | { ran: false; reason: "disabled" }
  | { ran: false; reason: "not_scheduled_day"; today: number; days: number[] }
  | { ran: true; discovered: number; verified: number; drafted: number; note?: string };

// Per-run safety rails. The wall-clock budget is the real ceiling (it can never
// trip the function maxDuration); the caps just bound work on fast runs.
// Wall-clock budget for the whole sweep. Default is Hobby-safe: Vercel Hobby
// caps function execution near 10s and this sweep runs AFTER the email queue,
// so it stops early and resumes next run via the Postgres cursor (no data loss
// — upserts are idempotent). On Pro, set MONITOR_SWEEP_BUDGET_MS≈45000 to let
// it process real volume per run.
const BUDGET_MS = Number(process.env.MONITOR_SWEEP_BUDGET_MS) || 8_000;
const DISCOVER_CAP = 1500;
const VERIFY_CAP = 80;
const DRAFT_CAP = 25; // LLM calls are slower; the wall-clock budget is the real cap
const BACKFILL_WINDOW_DAYS = 210; // ~7 months — catches carriers nearing 180d

const MS_PER_DAY = 86_400_000;

function yyyymmdd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export async function monitorSweep(): Promise<MonitorSweepResult> {
  if (!(await getFlag("monitorEnabled"))) {
    return { ran: false, reason: "disabled" };
  }

  // Weekday gate — monitorDays is a CSV of UTC weekday numbers (0=Sun..6=Sat).
  // Empty/blank means "every day this cron fires".
  const days = (await getConfigValue("monitorDays"))
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const today = new Date().getUTCDay();
  if (days.length > 0 && !days.includes(today)) {
    return { ran: false, reason: "not_scheduled_day", today, days };
  }

  await ensureMonitorTables();

  const startedAt = Date.now();
  const overBudget = () => Date.now() - startedAt > BUDGET_MS;

  // ---- Pass 1: discover -----------------------------------------------------
  let discovered = 0;
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
      if (overBudget()) break;
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

  // ---- Pass 2: verify -------------------------------------------------------
  let verified = 0;
  try {
    const targets = await listMonitorForVerification(VERIFY_CAP);
    for (const t of targets) {
      if (overBudget()) break;
      try {
        const r = await verifyCandidate({
          dotNumber: t.dot_number,
          addDate: t.add_date,
          powerUnits: t.power_units,
        });
        const stage =
          r.brokerOnly || !r.authorityActive ? "disqualified" : "verified";
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
          insuranceCurrent: r.insurance.currentInsured,
          insuranceRating: r.insurance.rating,
          insuranceGaps: r.insurance.gaps,
          auditScore: r.auditRating,
          acquisitionScore: r.acquisitionScore,
          authorityStatus,
          monitorStage: stage,
        });
        verified++;
      } catch (e) {
        console.error("[monitorSweep] verify failed", t.dot_number, e);
      }
    }
  } catch (err) {
    console.error("[monitorSweep] verify pass failed", err);
  }

  // ---- Pass 3: draft (gated by outreachDraftEnabled) ------------------------
  // Qualified candidates get a persona-tailored draft into the outreach queue
  // (stage='draft' — human approval is still required to send, unless P5
  // auto-send is on). No usable email → routed to the phone work-queue.
  let drafted = 0;
  try {
    if (await getFlag("outreachDraftEnabled")) {
      const targets = await listMonitorForDrafting(DRAFT_CAP);
      for (const t of targets) {
        if (overBudget()) break;
        const email = t.census_email?.trim() || null;
        if (!email) {
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
          await enqueueDraft({
            valuationId: t.id,
            channel: "email",
            recipientEmail: email,
            recipientPhone: t.telephone,
            persona,
            subject: draft.subject,
            bodyText: draft.body,
          });
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

  // Heartbeat for the dashboard activity feed.
  await logAgentAction("sweep_completed", "agent", null, {
    discovered,
    verified,
    drafted,
  });

  return { ran: true, discovered, verified, drafted };
}
