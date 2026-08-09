// Authenticated audio proxy for call recordings and voicemails.
//
// Two reasons this exists rather than putting Quo's URL in an <audio src>:
//
//  1. SECURITY. Recordings contain seller PII and live negotiation detail. A
//     Quo media URL in the DOM is a link anyone who sees the page can copy and
//     replay later, outside any session check. Streaming through here means
//     every byte passes requireAdmin() first.
//  2. CSP. next.config.ts ships a strict Content-Security-Policy. Audio from
//     an external host would need media-src widened; same-origin needs
//     nothing, so the player just works.
//
// SSRF NOTE: this deliberately takes a CALL ID, never a URL. The URL is looked
// up from our own table. Accepting a caller-supplied URL would turn an admin
// session into a server-side request forgery primitive against anything the
// Vercel function can reach.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ensureCallsSchema } from "@/lib/db/calls";
import { fetchRecording } from "@/lib/quo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  const kind = req.nextUrl.searchParams.get("kind") === "voicemail"
    ? "voicemail"
    : "recording";
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let mediaUrl: string | null = null;
  try {
    await ensureCallsSchema();
    const sql = neon(dbUrl);
    const rows = (await sql`
      SELECT recording_url, voicemail_url FROM quo_calls WHERE id = ${id}
    `) as Array<{ recording_url: string | null; voicemail_url: string | null }>;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    mediaUrl = kind === "voicemail" ? rows[0].voicemail_url : rows[0].recording_url;
  } catch (err) {
    console.error("[admin/calls/recording] lookup failed", err);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }

  if (!mediaUrl) {
    return NextResponse.json({ error: "No audio for this call." }, { status: 404 });
  }

  try {
    // Forward Range so <audio> can seek (206 passthrough). Without this every
    // scrub restarts the download and duration display is browser-dependent.
    const range = req.headers.get("range");
    const upstream = await fetchRecording(mediaUrl, range);
    if (!upstream.ok || !upstream.body) {
      console.error("[admin/calls/recording] upstream", upstream.status);
      return NextResponse.json({ error: "Audio unavailable." }, { status: 502 });
    }
    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
      // Private: this must never be cached by a CDN or shared proxy.
      "Cache-Control": "private, max-age=0, no-store",
      "Content-Disposition": "inline",
    });
    for (const h of ["content-length", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    console.error("[admin/calls/recording] stream failed", err);
    return NextResponse.json({ error: "Audio unavailable." }, { status: 502 });
  }
}
