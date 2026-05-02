import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { isHoneypotFilled } from "@/lib/security/honeypot";
import { contactSchema } from "@/lib/security/schemas";
import { stripCrLf } from "@/lib/security/sanitize";
import { contactAutoreply } from "@/lib/email/autoreply";
import { saveLead } from "@/lib/db/leads";
import { SITE } from "@/lib/site";

const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(`contact:${ip}`, LIMIT, WINDOW_MS);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many submissions from this network. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": Math.ceil(limit.resetIn / 1000).toString() },
        },
      );
    }

    const raw = await req.json();

    if (isHoneypotFilled(raw)) {
      // Silent success — don't tip off bots that we caught them.
      return NextResponse.json({ ok: true });
    }

    const parsed = contactSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please check the form and try again." },
        { status: 400 },
      );
    }

    const lead = parsed.data;

    // Persist to Postgres if DATABASE_URL is set; no-op otherwise. We don't
    // fail the user on DB errors — the email still goes out and the team
    // captures the lead via inbox.
    await saveLead(lead, {
      ip,
      userAgent: req.headers.get("user-agent") ?? "",
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[contact] RESEND_API_KEY not set — email step skipped");
      return NextResponse.json({ ok: true });
    }

    const resend = new Resend(apiKey);

    const subject = stripCrLf(
      `New seller enquiry — ${lead.company || lead.name} (${lead.locale.toUpperCase()})`,
    );

    const adminText = [
      `New seller enquiry from the ${SITE.name} website`,
      ``,
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      `Phone: ${lead.phone}`,
      `Company / LLC: ${lead.company || "—"}`,
      `MC #: ${lead.mc || "—"}`,
      `Has Amazon Relay: ${lead.hasRelay || "—"}`,
      `MC age (days): ${lead.mcAgeDays || "—"}`,
      `Insurance: ${lead.insurance || "—"}`,
      `State: ${lead.state || "—"}`,
      `Locale: ${lead.locale}`,
      ``,
      `Notes:`,
      lead.notes || "—",
    ].join("\n");

    const adminHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
        <h2 style="margin:0 0 16px; font-size: 20px;">New seller enquiry — ${escape(lead.company || lead.name)}</h2>
        <table cellpadding="6" style="border-collapse: collapse; width: 100%; font-size: 14px;">
          <tr><td style="color:#666;width:160px;">Name</td><td><strong>${escape(lead.name)}</strong></td></tr>
          <tr><td style="color:#666;">Email</td><td><a href="mailto:${escape(lead.email)}">${escape(lead.email)}</a></td></tr>
          <tr><td style="color:#666;">Phone</td><td><a href="tel:${escape(lead.phone)}">${escape(lead.phone)}</a></td></tr>
          <tr><td style="color:#666;">Company / LLC</td><td>${escape(lead.company || "—")}</td></tr>
          <tr><td style="color:#666;">MC #</td><td>${escape(lead.mc || "—")}</td></tr>
          <tr><td style="color:#666;">Amazon Relay</td><td>${escape(lead.hasRelay || "—")}</td></tr>
          <tr><td style="color:#666;">MC age (days)</td><td>${escape(lead.mcAgeDays || "—")}</td></tr>
          <tr><td style="color:#666;">Insurance</td><td>${escape(lead.insurance || "—")}</td></tr>
          <tr><td style="color:#666;">State</td><td>${escape(lead.state || "—")}</td></tr>
          <tr><td style="color:#666;">Locale</td><td>${escape(lead.locale)}</td></tr>
        </table>
        ${lead.notes ? `<div style="margin-top: 20px; padding: 16px; background: #f6f6f6; border-radius: 8px; white-space: pre-wrap; font-size: 14px; line-height: 1.55;">${escape(lead.notes)}</div>` : ""}
      </div>
    `;

    // Notify the team.
    const { error } = await resend.emails.send({
      from: SITE.emailFrom,
      to: SITE.email,
      replyTo: lead.email,
      subject,
      text: adminText,
      html: adminHtml,
    });

    if (error) {
      console.error("[contact] Resend error", error);
      return NextResponse.json(
        { error: "Couldn't send enquiry. Please try again or email us directly." },
        { status: 500 },
      );
    }

    // Auto-reply to the seller. Awaited so it completes before the
    // serverless function terminates.
    const autoreply = contactAutoreply({ name: lead.name, locale: lead.locale });
    try {
      const { error: autoreplyErr } = await resend.emails.send({
        from: SITE.emailFrom,
        to: lead.email,
        replyTo: SITE.email,
        subject: stripCrLf(autoreply.subject),
        text: autoreply.text,
        html: autoreply.html,
      });
      if (autoreplyErr) console.error("[contact] autoreply error", autoreplyErr);
    } catch (err) {
      console.error("[contact] autoreply unexpected", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] unexpected", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

function escape(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
