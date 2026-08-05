// Admin: record the human outcome of an outreach conversation — the dashboard's
// Replied / Interested / Not interested / Do-not-contact buttons. Stored on the
// carrier row; any outcome takes it out of the follow-up pool, and
// do_not_contact additionally suppresses the address forever. Full-admin only.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { unsubscribe } from "@/lib/db/email-followups";
import {
  MONITOR_OUTCOMES,
  getMonitorCompanyDetail,
  logAgentAction,
  setMonitorOutcome,
  type MonitorOutcome,
} from "@/lib/db/monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const raw = (await req.json()) as { id?: unknown; outcome?: unknown };
    const id = raw.id;
    const outcome = raw.outcome;
    const validOutcome =
      outcome === "clear" ||
      (typeof outcome === "string" &&
        (MONITOR_OUTCOMES as readonly string[]).includes(outcome));
    if (!(typeof id === "number" && Number.isInteger(id) && id > 0 && validOutcome)) {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }

    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await setMonitorOutcome(id, outcome as MonitorOutcome | "clear");
    if (outcome === "do_not_contact") {
      const company = await getMonitorCompanyDetail(id);
      const email = company?.census_email?.trim();
      if (email) await unsubscribe(email, "do_not_contact");
    }
    await logAgentAction("outcome_set", `admin:${session.email}`, id, { outcome });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/monitor/outcome] error", err);
    return NextResponse.json({ error: "Action failed." }, { status: 500 });
  }
}
