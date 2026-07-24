// Admin: clear the outreach auto-pause (set by the bounce/complaint webhook).
// Same auth as the other admin routes — session cookie or legacy ADMIN_KEY.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logAgentAction, resumeOutreach } from "@/lib/db/monitor";

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

  await resumeOutreach();
  await logAgentAction("outreach_resumed", `admin:${session.email}`, null, {});
  return NextResponse.json({ ok: true });
}
