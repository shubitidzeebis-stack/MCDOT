import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/auth/sessions";
import {
  approveOutreach,
  discardOutreach,
  logAgentAction,
  updateDraftContent,
} from "@/lib/db/monitor";
import { processOutreachQueue } from "@/lib/outreach/send";

// Admin actions on an outreach draft: save (edit), approve (sends next cron),
// send_now (approve + flush the queue now), discard. Auth: session cookie or
// legacy ADMIN_KEY in body — same as the other admin routes.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// send_now flushes the outreach queue (multiple Resend sends) inline — give it
// headroom beyond the platform default so it can't time out mid-send.
export const maxDuration = 60;

type Action = "save" | "approve" | "send_now" | "discard";
const ACTIONS: Action[] = ["save", "approve", "send_now", "discard"];

type Body = {
  key?: string;
  id: number;
  action: Action;
  subject?: string;
  body?: string;
};

function isBody(x: unknown): x is Body {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "number") return false;
  if (!ACTIONS.includes(o.action as Action)) return false;
  return true;
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    if (!isBody(raw)) {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(ADMIN_COOKIE)?.value);
    let authorized = !!session;
    if (!authorized) {
      const expected = process.env.ADMIN_KEY ?? "";
      authorized = expected.length > 0 && raw.key === expected;
    }
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const who = session?.email ?? "legacy-key";

    // Persist any edits first (save / approve / send_now may carry them).
    if (
      typeof raw.subject === "string" &&
      typeof raw.body === "string" &&
      raw.action !== "discard"
    ) {
      await updateDraftContent(raw.id, raw.subject, raw.body);
    }

    if (raw.action === "save") {
      return NextResponse.json({ ok: true });
    }
    if (raw.action === "discard") {
      await discardOutreach(raw.id);
      await logAgentAction("outreach_discarded", `admin:${who}`, null, { outreachId: raw.id });
      return NextResponse.json({ ok: true });
    }

    // approve / send_now both approve the row.
    await approveOutreach(raw.id, who);
    await logAgentAction("outreach_approved", `admin:${who}`, null, { outreachId: raw.id });

    if (raw.action === "send_now") {
      const result = await processOutreachQueue();
      return NextResponse.json({ ok: true, result });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/outreach/action] error", err);
    return NextResponse.json({ error: "Action failed." }, { status: 500 });
  }
}
