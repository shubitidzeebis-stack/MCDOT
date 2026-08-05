// Admin: manually trip the outreach send breaker — the dashboard's
// "Stop sending" button. Symmetric with ../resume; sending halts instantly and
// stays halted until explicitly resumed. Same auth as the other admin routes.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logAgentAction, setOutreachPaused } from "@/lib/db/monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  // Outreach controls are full-admin only.
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await setOutreachPaused(`manual stop by ${session.email}`);
  await logAgentAction("outreach_paused", `admin:${session.email}`, null, {});
  return NextResponse.json({ ok: true });
}
