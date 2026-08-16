// Manual trigger for AI call insights — test bench and backfill in one.
//
//   POST { callId, dryRun: true }  → run the extraction, RETURN the result,
//                                    write nothing (safe prod verification).
//   POST { callId }                → the real pipeline: claim, extract, write
//                                    the lead comment + action items. No-op
//                                    with { ok: false } when the call is
//                                    ineligible or already processed.
//
// Full-admin only: transcripts carry seller PII and negotiation detail, same
// boundary as the calls page and recording proxy.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCallForInsights } from "@/lib/db/calls";
import { extractForCall, processCallInsights } from "@/lib/quo/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { callId?: unknown; dryRun?: unknown };
  try {
    body = (await req.json()) as { callId?: unknown; dryRun?: unknown };
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const callId = typeof body.callId === "string" ? body.callId : null;
  if (!callId) {
    return NextResponse.json({ error: "Missing callId." }, { status: 400 });
  }

  try {
    if (body.dryRun === true) {
      const call = await getCallForInsights(callId);
      if (!call) {
        return NextResponse.json({ error: "Call not found." }, { status: 404 });
      }
      if (call.transcript == null) {
        return NextResponse.json({ error: "Call has no transcript." }, { status: 409 });
      }
      const insights = await extractForCall(call);
      return NextResponse.json({ ok: true, dryRun: true, insights });
    }

    const generated = await processCallInsights(callId);
    return NextResponse.json({
      ok: generated,
      ...(generated ? {} : { reason: "ineligible or already processed" }),
    });
  } catch (err) {
    console.error("[admin/calls/insights] failed", callId, err);
    return NextResponse.json({ error: "Insight generation failed." }, { status: 502 });
  }
}
