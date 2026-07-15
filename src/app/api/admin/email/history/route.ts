import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listEmailsForValuation } from "@/lib/db/email-history";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(req.url);
  const idParam = url.searchParams.get("valuationId");
  const id = idParam ? Number(idParam) : NaN;
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const entries = await listEmailsForValuation(id);
  return NextResponse.json({ ok: true, entries });
}
