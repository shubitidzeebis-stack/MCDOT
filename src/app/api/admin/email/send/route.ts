import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Resend } from "resend";
import { ADMIN_COOKIE, verifySession } from "@/lib/auth/sessions";
import { stripCrLf } from "@/lib/security/sanitize";
import { emailShell } from "@/lib/email/shell";
import { unsubscribeUrl } from "@/lib/email/queue";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { SITE } from "@/lib/site";

// Compose-and-send endpoint for the admin panel. Sends a transactional
// email via Resend from info@groupveritor.com to a specified seller
// address. Reply-to defaults to the logged-in admin's email so seller
// replies land in the right person's inbox.
//
// Auth: session cookie required. No legacy ?key= fallback (this is a
// write that generates outbound mail — we want a real authenticated
// user attached for audit purposes).

export const dynamic = "force-dynamic";

const LIMIT = 30;
const WINDOW_MS = 60 * 60 * 1000;

type Body = {
  to: string;
  subject: string;
  body: string;
  /** Optional — if known, helps audit which valuation this is about. */
  valuationId?: number;
};

function isBody(x: unknown): x is Body {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.to === "string" &&
    o.to.trim().length > 0 &&
    typeof o.subject === "string" &&
    o.subject.trim().length > 0 &&
    typeof o.body === "string" &&
    o.body.trim().length > 0
  );
}

function isEmailValid(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(ADMIN_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rl = rateLimit(`admin-email:${session.email}:${ip}`, LIMIT, WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Send limit hit. Try again later." },
        { status: 429 },
      );
    }

    const raw = await req.json();
    if (!isBody(raw)) {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }
    if (!isEmailValid(raw.to)) {
      return NextResponse.json(
        { error: "Recipient email is not valid." },
        { status: 400 },
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Email is not configured (RESEND_API_KEY missing)." },
        { status: 500 },
      );
    }

    const resend = new Resend(apiKey);
    const subject = stripCrLf(raw.subject);
    const recipientEmail = raw.to.trim().toLowerCase();

    // Render the body as paragraphs in a styled HTML shell. Plain-text
    // version stays as-is in the `text` field below for clients that
    // prefer text/plain.
    const escaped = raw.body
      .split(/\n{2,}/)
      .map(
        (para) =>
          `<p style="margin:0 0 18px; line-height:1.65; font-size:15px; color:#e6e7e9;">${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`,
      )
      .join("");
    const sigName = session.name ?? "Veritor Group";
    const bodyHtml = `${escaped}<p style="margin:32px 0 0; line-height:1.65; font-size:15px; color:#cdd0d4;">— ${escapeHtml(sigName)}<br/><span style="color:#9da0a4">${escapeHtml(SITE.name)}</span></p>`;
    const html = emailShell({
      preheader: subject.slice(0, 80),
      bodyHtml,
      unsubscribeUrl: unsubscribeUrl(recipientEmail),
    });

    const result = await resend.emails.send({
      from: SITE.emailFrom,
      to: recipientEmail,
      replyTo: session.email,
      subject,
      text: raw.body,
      html,
    });

    if (result.error) {
      console.error("[admin/email/send] resend error", result.error);
      return NextResponse.json(
        { error: "Send failed. Check Resend dashboard." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, id: result.data?.id ?? null });
  } catch (err) {
    console.error("[admin/email/send] error", err);
    return NextResponse.json({ error: "Send failed." }, { status: 500 });
  }
}
