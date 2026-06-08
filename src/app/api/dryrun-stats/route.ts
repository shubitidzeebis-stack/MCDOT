// TEMPORARY read-only stats endpoint — returns monitor audit aggregates incl.
// safety + the final fully-qualified (insurance + safety) contact list.
// Gated by CRON_SECRET. DELETE after use.

import { NextResponse } from "next/server";
import { isAuthorisedCronRequest } from "@/lib/email/queue";
import {
  getEligibilityCounts,
  getInsuranceRatingCounts,
  getMonitorStageCounts,
  getSafetyStatusCounts,
  listMonitorForDrafting,
} from "@/lib/db/monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthorisedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [stage, eligibility, insurance, safety, qualified] = await Promise.all([
    getMonitorStageCounts(),
    getEligibilityCounts(),
    getInsuranceRatingCounts(),
    getSafetyStatusCounts(),
    listMonitorForDrafting(500),
  ]);
  return NextResponse.json({
    stage,
    eligibility,
    insurance,
    safety,
    qualifiedCount: qualified.length,
    qualifiedSample: qualified.slice(0, 12).map((q) => ({
      name: q.legal_name ?? q.dba_name,
      state: (q.phy_address as { state?: string } | null)?.state ?? null,
      days_to_180: q.days_to_180,
    })),
  });
}
