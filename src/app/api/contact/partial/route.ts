// /api/contact/partial — fires from the contact form on field-blur to
// capture the user's progress before they hit Submit. Idempotent upsert
// keyed by sessionId, so the same session can post many partial saves
// and we always keep the most-recent non-empty value per field.
//
// Spam protection:
//  - Honeypot field still applies — bots filling the hidden field are
//    silently no-op'd.
//  - Rate limit: 30 partial saves per IP per minute. Real users blur
//    fields a few times; bots blast.
//  - We accept the request even if the email is malformed — partial
//    capture by definition includes pre-validated state. Final
//    /api/contact still validates strictly before promoting to a lead.

import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { isHoneypotFilled } from "@/lib/security/honeypot";
import { savePartial } from "@/lib/db/partial-leads";

const LIMIT = 30;
const WINDOW_MS = 60 * 1000;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limit = await rateLimit(`partial:${ip}`, LIMIT, WINDOW_MS);
    if (!limit.ok) {
      // Quietly succeed — don't tip off scrapers that we throttle.
      return NextResponse.json({ ok: true });
    }

    const raw = await req.json();
    if (isHoneypotFilled(raw)) {
      return NextResponse.json({ ok: true });
    }

    const sessionId = String(raw.sessionId ?? "").slice(0, 64);
    if (!sessionId) {
      return NextResponse.json({ error: "missing sessionId" }, { status: 400 });
    }

    // Trim every field to a sane max length so a malicious client can't
    // wedge megabytes of free-text into the table.
    const cap = (s: unknown, max = 500) =>
      typeof s === "string" ? s.slice(0, max) : undefined;

    await savePartial(
      {
        sessionId,
        name: cap(raw.name, 200),
        email: cap(raw.email, 200),
        phone: cap(raw.phone, 60),
        company: cap(raw.company, 300),
        mc: cap(raw.mc, 60),
        hasRelay: cap(raw.hasRelay, 10),
        mcAgeDays: cap(raw.mcAgeDays, 10),
        insurance: cap(raw.insurance, 20),
        state: cap(raw.state, 60),
        notes: cap(raw.notes, 4000),
        locale: cap(raw.locale, 10),
        page: cap(raw.page, 200),
      },
      {
        ip,
        userAgent: req.headers.get("user-agent") ?? "",
      },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact/partial] unexpected", err);
    // Don't surface errors to the client — partial save is best-effort.
    return NextResponse.json({ ok: true });
  }
}
