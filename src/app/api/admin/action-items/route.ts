// Check off / reopen a call-extracted to-do (see lib/db/action-items.ts).
// Both roles may complete items — Donnie closes his own follow-ups — and the
// actor is recorded from the session, never from the body.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { markActionItemDone } from "@/lib/db/action-items";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { id?: unknown; done?: unknown };
  try {
    body = (await req.json()) as { id?: unknown; done?: unknown };
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (typeof body.id !== "number" || typeof body.done !== "boolean") {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  await markActionItemDone(body.id, session.name ?? session.email ?? "admin", body.done);
  return NextResponse.json({ ok: true });
}
