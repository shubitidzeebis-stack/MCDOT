import { NextResponse } from "next/server";
import {
  adminUpdateValuation,
  VALUATION_STATUSES,
  type ValuationStatus,
} from "@/lib/db/valuations";

// Admin mutation endpoint. Auth: ADMIN_KEY in body. Mirrors the model
// used elsewhere in /admin where the key travels in URL params; here
// it travels in the JSON body since this is a POST.
//
// Update either status, notes_internal, or both. Other fields are
// FMCSA-derived and shouldn't be hand-edited.

export const dynamic = "force-dynamic";

type Body = {
  key: string;
  id: number;
  status?: ValuationStatus;
  notesInternal?: string;
};

function isBody(x: unknown): x is Body {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.key !== "string" || typeof o.id !== "number") return false;
  if (
    o.status !== undefined &&
    !VALUATION_STATUSES.includes(o.status as ValuationStatus)
  ) {
    return false;
  }
  if (o.notesInternal !== undefined && typeof o.notesInternal !== "string") {
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  try {
    const expected = process.env.ADMIN_KEY ?? "";
    const raw = await req.json();
    if (!isBody(raw)) {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }
    if (expected.length === 0 || raw.key !== expected) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const result = await adminUpdateValuation(raw.id, {
      status: raw.status,
      notesInternal: raw.notesInternal,
    });
    if (!result.ok) {
      return NextResponse.json({ error: "Update failed." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/valuations/update] error", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
