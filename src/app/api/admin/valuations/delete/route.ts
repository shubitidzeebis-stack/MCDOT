import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminDeleteValuation } from "@/lib/db/valuations";
import { ADMIN_COOKIE, verifySession } from "@/lib/auth/sessions";

// Hard-delete a valuation row. Auth: session cookie OR legacy
// ADMIN_KEY in body. Used for clearing test rows from /admin.

export const dynamic = "force-dynamic";

type Body = { id: number; key?: string };

function isBody(x: unknown): x is Body {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "number" && (o.key === undefined || typeof o.key === "string");
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
