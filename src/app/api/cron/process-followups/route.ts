// Vercel cron — runs daily, sends every follow-up whose scheduled_for
// has passed. See vercel.json for the schedule. Auth: Vercel injects
// `Authorization: Bearer ${CRON_SECRET}` on scheduled runs. Manual hits
// without that header get 401.

import { NextResponse } from "next/server";
import { isAuthorisedCronRequest, processQueue } from "@/lib/email/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthorisedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await processQueue();
  return NextResponse.json({ ok: true, ...result });
}
