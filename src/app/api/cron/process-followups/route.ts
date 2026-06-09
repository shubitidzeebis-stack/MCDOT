// Vercel cron — runs once a day. Two steps:
//
//   1. recoverPartials() — find partial form-fills (emailed but not
//      submitted) from the last 24h and queue partial_recovery emails.
//   2. processQueue() — send every email whose scheduled_for has passed,
//      including partial_recovery rows just queued.
//
// Schedule lives in vercel.json. Auth: Vercel injects
// `Authorization: Bearer ${CRON_SECRET}` on scheduled runs. Manual hits
// without that header get 401.

import { NextResponse } from "next/server";
import {
  isAuthorisedCronRequest,
  processQueue,
  recoverPartials,
} from "@/lib/email/queue";
import { monitorSweep } from "@/lib/monitor/sweep";
import { reopenStaleDisqualified, requalifyVerified } from "@/lib/db/monitor";
import { processOutreachQueue } from "@/lib/outreach/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Give the monitor sweep real headroom on Pro (max 300s). The sweep self-bounds
// to MONITOR_SWEEP_BUDGET_MS; this is the hard function ceiling above it.
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isAuthorisedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Manual backlog drain (?backfill=1): run ONLY the monitor sweep in backfill
  // mode (no discovery; batched verify + safety enrich at higher caps; no
  // draft). Skips the email queue so the whole wall-clock budget goes to the
  // backlog. Trigger repeatedly until verified/enriched stop advancing.
  const url = new URL(req.url);

  // One-time recovery (?reopen-disqualified=1): re-open carriers disqualified
  // under the old not-found-=-disqualified logic so the fixed verify can
  // re-classify them. Run once after deploy, before the backfill.
  if (url.searchParams.get("reopen-disqualified") === "1") {
    const reopened = await reopenStaleDisqualified();
    return NextResponse.json({ ok: true, reopened });
  }

  // One-time requalification (?requalify=1): age every verified row past the
  // re-verify staleness gate so the next backfill re-rates the WHOLE verified
  // set under the current engine (run after an engine rules change).
  if (url.searchParams.get("requalify") === "1") {
    const requalified = await requalifyVerified();
    return NextResponse.json({ ok: true, requalified });
  }

  if (url.searchParams.get("backfill") === "1") {
    let monitor: unknown;
    try {
      monitor = await monitorSweep({ mode: "backfill" });
    } catch (err) {
      console.error("[cron] backfill monitorSweep failed", err);
      monitor = { ran: false, reason: "error" };
    }
    return NextResponse.json({ ok: true, backfill: true, monitor });
  }

  // Recovery first so any newly queued partial_recovery rows get
  // processed in the same run (their scheduled_for is now-ish). Each step is
  // wrapped so a transactional-email failure can never block the agent passes.
  let recovery: unknown;
  try {
    recovery = await recoverPartials();
  } catch (err) {
    console.error("[cron] recoverPartials failed", err);
    recovery = { error: true };
  }
  let queue: unknown;
  try {
    queue = await processQueue();
  } catch (err) {
    console.error("[cron] processQueue failed", err);
    queue = { error: true };
  }

  // Outbound monitoring agent — runs AFTER the transactional queue so it can
  // never starve it. Flag-gated (default OFF) and weekday-gated internally;
  // wrapped so a sweep failure never breaks the email cron.
  let monitor: unknown;
  try {
    monitor = await monitorSweep();
  } catch (err) {
    console.error("[cron] monitorSweep failed", err);
    monitor = { ran: false, reason: "error" };
  }

  // Cold-outreach sender — inert until the outreach domain/key are provisioned;
  // sends only human-approved drafts (plus P5 auto-send allowlist). Wrapped so
  // it can never break the cron.
  let outreach: unknown;
  try {
    outreach = await processOutreachQueue();
  } catch (err) {
    console.error("[cron] processOutreachQueue failed", err);
    outreach = { error: true };
  }

  return NextResponse.json({
    ok: true,
    recovery,
    queue,
    monitor,
    outreach,
  });
}
