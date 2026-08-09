// Admin call log: read the feed, and mark a missed call as dealt with.
//
// Full-admin only. Donnie's agent-role account must not see call recordings or
// transcripts — the client hides the nav link, and this route is the actual
// boundary that enforces it.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  listCalls,
  listMissedUnrecovered,
  markCallHandled,
} from "@/lib/db/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const [calls, missed] = await Promise.all([
    listCalls(),
    listMissedUnrecovered(),
  ]);
  return NextResponse.json({ ok: true, calls, missed });
}

type Body = { id: string; handled: boolean };

function isBody(x: unknown): x is Body {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && o.id.length > 0 && typeof o.handled === "boolean";
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!isBody(raw)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  try {
    await markCallHandled(raw.id, session.email ?? session.name ?? "admin", raw.handled);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/calls] update failed", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
