// Admin: clear the outreach auto-pause (set by the bounce/complaint webhook).
// Same auth as the other admin routes — session cookie or legacy ADMIN_KEY.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/auth/sessions";
import { logAgentAction, resumeOutreach } from "@/lib/db/monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let key: string | undefined;
  try {
    const body = (await req.json()) as { key?: string } | null;
    key = body?.key;
  } catch {
    /* no body is fine when authed by cookie */
  }

  const cookieStore = await cookies();
  const session = verifySession(cookieStore.get(ADMIN_COOKIE)?.value);
  let authorized = !!session;
  if (!authorized) {
    const expected = process.env.ADMIN_KEY ?? "";
    authorized = expected.length > 0 && key === expected;
  }
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await resumeOutreach();
  await logAgentAction("outreach_resumed", `admin:${session?.email ?? "legacy-key"}`, null, {});
  return NextResponse.json({ ok: true });
}
