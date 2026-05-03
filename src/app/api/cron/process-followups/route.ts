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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthorisedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Recovery first so any newly queued partial_recovery rows get
  // processed in the same run (their scheduled_for is now-ish).
  const recovery = await recoverPartials();
  const queue = await processQueue();

  return NextResponse.json({
    ok: true,
    recovery,
    queue,
  });
}
