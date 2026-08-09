import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/auth/require-admin";
import { stripCrLf } from "@/lib/security/sanitize";
import { emailShell } from "@/lib/email/shell";
import { unsubscribeUrl } from "@/lib/email/queue";
import { resolveFromHeader } from "@/lib/email/send-as";
import { logSentEmail } from "@/lib/db/email-history";
import { getValuationContactEmail } from "@/lib/db/valuations";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { SITE } from "@/lib/site";

// Compose-and-send endpoint for the admin panel. Sends a transactional
// email via Resend to a specified seller address. Reply-to is the logged-in
// user's own email so seller replies land in the right person's inbox.
//
// From: the sender's own verified mailbox when their account has one
// configured (`send_as`), otherwise the shared company From. The domain
// allowlist that decides which is which lives in lib/email/send-as.ts —
// read the comment there before touching it; an unvalidated From is both a
// silent-delivery-failure bug and a spoofing hole.
//
// Auth: session cookie required. No legacy ?key= fallback (this is a
// write that generates outbound mail — we want a real authenticated
// user attached for audit purposes). BOTH roles may send:
//   - "admin" composes freely, to any recipient.
//   - "agent" is leashed to the lead: see the valuationId check below.

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
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const isFullAdmin = session.role === "admin";

    const ip = getClientIp(req);
    const rl = await rateLimit(`admin-email:${session.email}:${ip}`, LIMIT, WINDOW_MS);
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

    const recipientEmail = raw.to.trim().toLowerCase();

    // Agent-role guardrail: an agent may only email an address ALREADY on a
    // lead row, and must name the lead. Without this leash an agent login is
    // an open relay on a domain we own — arbitrary recipient, arbitrary
    // subject and body, signed with our DKIM key and charged to our sending
    // reputation. One compromised or disgruntled agent account would be
    // enough to get the domain blocklisted. Full admins keep the free-form
    // composer; they already own the domain and the reputation risk.
    if (!isFullAdmin) {
      const valuationId = raw.valuationId;
      if (typeof valuationId !== "number" || !Number.isInteger(valuationId)) {
        return NextResponse.json(
          { error: "Pick a lead to reply to." },
          { status: 400 },
        );
      }
      // Compared against the DB copy, not anything the client sent. Missing
      // row / missing address / no DB all resolve to null and fail closed.
      const onFile = await getValuationContactEmail(valuationId);
      if (!onFile || onFile.trim().toLowerCase() !== recipientEmail) {
        return NextResponse.json(
          { error: "You can only email the address on file for this lead." },
          { status: 403 },
        );
      }
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

    // Falls back to SITE.emailFrom whenever the user has no send-as set, or
    // has one whose domain isn't Resend-verified. Never sends a From we
    // haven't vetted — see lib/email/send-as.ts.
    const from = resolveFromHeader(session.sendAs, session.name);

    const result = await resend.emails.send({
      from,
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

    // Log to admin_email_log so we have history per valuation. Best-
    // effort — don't fail the user-facing send if logging fails.
    try {
      await logSentEmail({
        valuationId: typeof raw.valuationId === "number" ? raw.valuationId : null,
        sentByUserId: session.uid,
        sentByEmail: session.email,
        sentByName: session.name,
        toEmail: recipientEmail,
        subject,
        body: raw.body,
        resendId: result.data?.id ?? null,
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, id: result.data?.id ?? null });
  } catch (err) {
    console.error("[admin/email/send] error", err);
    return NextResponse.json({ error: "Send failed." }, { status: 500 });
  }
}
