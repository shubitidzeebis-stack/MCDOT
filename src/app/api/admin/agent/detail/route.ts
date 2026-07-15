// Drill-down data for the interactive agent dashboard. Admin-only (session
// cookie, or the legacy ADMIN_KEY as ?key= for key-based dashboard access).
//
//   ?view=company&id=<valuationId>   → full audit detail + latest email
//   ?view=email&id=<outreachId>      → one email (full body) + its company
//   ?view=list&kind=hot|phone|disqualified|review → card drill-down rows
//   ?view=drafts                     → pending drafts (full text)
//   ?view=sent&limit=N               → sent emails log (more rows than the card)

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getLatestOutreachForValuation,
  getMonitorCompanyDetail,
  getOutreachEmailById,
  listMonitorDetailRows,
  listOutreachDrafts,
  listOutreachSentRows,
  type MonitorListKind,
} from "@/lib/db/monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const LIST_KINDS = new Set(["hot", "phone", "disqualified", "review"]);

export async function GET(req: Request) {
  const url = new URL(req.url);

  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const view = url.searchParams.get("view") ?? "";
  const id = Number(url.searchParams.get("id"));
  const limit = Math.min(
    500,
    Math.max(1, Number(url.searchParams.get("limit")) || 200),
  );

  try {
    if (view === "company" && Number.isInteger(id) && id > 0) {
      const [company, email] = await Promise.all([
        getMonitorCompanyDetail(id),
        getLatestOutreachForValuation(id),
      ]);
      if (!company) {
        return NextResponse.json({ error: "Not found." }, { status: 404 });
      }
      return NextResponse.json({ company, email });
    }

    if (view === "email" && Number.isInteger(id) && id > 0) {
      const email = await getOutreachEmailById(id);
      if (!email) {
        return NextResponse.json({ error: "Not found." }, { status: 404 });
      }
      const company = await getMonitorCompanyDetail(email.valuation_id);
      return NextResponse.json({ company, email });
    }

    if (view === "list") {
      const kind = url.searchParams.get("kind") ?? "";
      if (!LIST_KINDS.has(kind)) {
        return NextResponse.json({ error: "Bad kind." }, { status: 400 });
      }
      const rows = await listMonitorDetailRows(kind as MonitorListKind, limit);
      return NextResponse.json({ rows });
    }

    if (view === "drafts") {
      const rows = await listOutreachDrafts(limit);
      return NextResponse.json({ rows });
    }

    if (view === "sent") {
      const rows = await listOutreachSentRows(limit);
      return NextResponse.json({ rows });
    }

    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  } catch (err) {
    console.error("[admin/agent/detail] error", err);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
}
