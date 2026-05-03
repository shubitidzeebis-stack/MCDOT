// One-click unsubscribe. Both GET (link in email) and POST
// (RFC 8058 List-Unsubscribe-Post) are supported. We verify the HMAC
// token before honouring the request — without it, anyone could
// unsubscribe arbitrary addresses.

import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/db/email-followups";
import { verifyUnsubscribeToken } from "@/lib/email/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").toLowerCase();
  const token = url.searchParams.get("token") ?? "";

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.redirect(new URL("/unsubscribe?status=invalid", url));
  }

  await unsubscribe(email, "user-clicked-unsubscribe");
  return NextResponse.redirect(new URL("/unsubscribe?status=ok", url));
}

export async function GET(req: Request) {
  return handle(req);
}

// Mail clients honoring RFC 8058 will POST to the link with no body.
export async function POST(req: Request) {
  return handle(req);
}
