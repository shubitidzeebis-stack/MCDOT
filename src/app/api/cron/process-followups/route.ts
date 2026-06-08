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

  // Recovery first so any newly queued partial_recovery rows get
  // processed in the same run (their scheduled_for is now-ish).
  const recovery = await recoverPartials();
  const queue = await processQueue();

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
