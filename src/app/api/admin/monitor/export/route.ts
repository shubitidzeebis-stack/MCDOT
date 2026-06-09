// Read-only roster export for the monitoring agent. CRON_SECRET-gated (same auth
// as the cron). Returns the live aggregates + the add_date age histogram, and —
// with ?rows=1 — every monitor row (live eligibility + all audit signals) so we
// can generate the markdown "database" roster offline.
//
//   GET /api/admin/monitor/export                          → summary only (fast)
//   GET /api/admin/monitor/export?rows=1                   → summary + rows (default 5k)
//   GET /api/admin/monitor/export?rows=1&limit=N&offset=M  → page through the set
//     (page with limit/offset — a 20k+ row JSON would brush Vercel's ~4.5MB
//      response ceiling, so pull pages and stitch client-side)
//
// Auth: Authorization: Bearer <CRON_SECRET>.

import { NextResponse } from "next/server";
import { isAuthorisedCronRequest } from "@/lib/email/queue";
import {
  getEligibilityCounts,
  getInsuranceRatingCounts,
  getMonitorAgeHistogram,
  getMonitorStageCounts,
  getSafetyStatusCounts,
  listMonitorForExport,
} from "@/lib/db/monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isAuthorisedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const withRows = url.searchParams.get("rows") === "1";
  const limit = Math.min(
    10_000,
    Math.max(1, Number(url.searchParams.get("limit")) || 5_000),
  );
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const [age, stage, eligibility, insurance, safety] = await Promise.all([
    getMonitorAgeHistogram(),
    getMonitorStageCounts(),
    getEligibilityCounts(),
    getInsuranceRatingCounts(),
    getSafetyStatusCounts(),
  ]);

  const rows = withRows ? await listMonitorForExport(limit, offset) : [];

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: { age, stage, eligibility, insurance, safety },
    offset,
    rowCount: rows.length,
    rows,
  });
}
