import { NextResponse } from "next/server";
import { adminDeleteValuation } from "@/lib/db/valuations";
import { requireAdmin } from "@/lib/auth/require-admin";

// Hard-delete a valuation row. Auth: session cookie OR legacy
// ADMIN_KEY in body. Used for clearing test rows from /admin.

export const dynamic = "force-dynamic";

type Body = { id: number };

function isBody(x: unknown): x is Body {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "number";
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    if (!isBody(raw)) {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }

    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const result = await adminDeleteValuation(raw.id);
    if (!result.ok) {
      return NextResponse.json({ error: "Delete failed." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/valuations/delete] error", err);
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
}
