// TEMPORARY read-only stats endpoint — returns the monitor audit aggregates so
// we can report real numbers. Gated by CRON_SECRET. DELETE after use.

import { NextResponse } from "next/server";
import { isAuthorisedCronRequest } from "@/lib/email/queue";
import {
  getEligibilityCounts,
  getInsuranceRatingCounts,
  getMonitorStageCounts,
  getOutreachStageCounts,
  listHotProspects,
} from "@/lib/db/monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthorisedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [stage, eligibility, insurance, outreach, hot] = await Promise.all([
    getMonitorStageCounts(),
    getEligibilityCounts(),
    getInsuranceRatingCounts(),
    getOutreachStageCounts(),
    listHotProspects(8),
  ]);
  return NextResponse.json({ stage, eligibility, insurance, outreach, hot });
}
