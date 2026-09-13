import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { isHoneypotFilled } from "@/lib/security/honeypot";
import { contactSchema } from "@/lib/security/schemas";
import { stripCrLf } from "@/lib/security/sanitize";
import { contactAutoreply } from "@/lib/email/autoreply";
import { queueSequence, unsubscribeUrl } from "@/lib/email/queue";
import { saveLead } from "@/lib/db/leads";
import { markPartialConverted } from "@/lib/db/partial-leads";
import { lookupCarrier } from "@/lib/fmcsa";
import { computeValuation, formatRange } from "@/lib/valuation";
import {
  createValuation,
  finalizeValuation,
  updateValuationContact,
} from "@/lib/db/valuations";
import { notifySlackNewLead } from "@/lib/notifications/slack";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { SITE } from "@/lib/site";

const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limit = await rateLimit(`contact:${ip}`, LIMIT, WINDOW_MS);
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

    // Cloudflare Turnstile — bot check. Returns ok with reason
    // "no-secret-configured" while keys aren't set, so existing
    // deployments don't break the moment we ship this code.
    const captcha = await verifyTurnstile(lead.turnstileToken, ip);
    if (!captcha.ok) {
      console.warn("[contact] turnstile failed", captcha);
      return NextResponse.json(
        { error: "Security check didn't pass. Please refresh and try again." },
        { status: 400 },
      );
    }

    const userAgent = req.headers.get("user-agent") ?? "";

    // ── Turn the submission into a VALUATION, not a separate "enquiry" ──────
    // Until 2026-09-13 this route only wrote a `leads` row and sent a "New
    // seller enquiry" email: a second lead pipeline with no /admin surface,
    // which is why paid clicks landing on an article (Sell's How-It-Works
    // sitelink) produced leads nobody could see next to the wizard's. The
    // server now runs the SAME FMCSA lookup the wizard runs and records a real
    // valuation, so the business has one lead type. The `leads` row below is
    // kept as the raw audit trail of what was typed.
    let valuationId: number | null = null;
    let carrierName: string | null = null;
    let range: string | null = null;
    const sessionId = lead.sessionId || `contact-${Date.now()}`;
    const typedAge = Number.parseInt(lead.mcAgeDays ?? "", 10);
    const typedAgeDays = Number.isFinite(typedAge) ? typedAge : null;

    if (lead.mc && lead.mc.trim()) {
      try {
        // The field is labelled MC, but sellers paste DOT numbers into it.
        // Try the labelled kind first, then the other one before giving up.
        const looksDot = /dot/i.test(lead.mc);
        const first = looksDot ? "dot" : "mc";
        const second = looksDot ? "mc" : "dot";
        let lookup = await lookupCarrier(lead.mc, first);
        if (!lookup.ok && lookup.reason === "not_found") {
          lookup = await lookupCarrier(lead.mc, second);
        }

        if (lookup.ok) {
          const { carrier, mcNumbers, telephone, mcs150FormDate, authorityAgeDays } =
            lookup;
          const ageDays = typedAgeDays ?? authorityAgeDays;
          const saved = await createValuation(
            {
              sessionId,
              carrier,
              mcNumbers,
              authorityAgeDays: ageDays,
              telephone,
              mcs150FormDate,
              attribution: lead.attribution ?? null,
              isTest: lead.test === true,
            },
            { ip, userAgent },
          );
          if (saved.ok && saved.id) {
            valuationId = saved.id;
            carrierName = carrier.legalName;
            const hasRelay = lead.hasRelay === "yes";
            const valuation = computeValuation(carrier, {
              hasAmazonRelay: hasRelay,
              authorityAgeDays: ageDays,
            });
            await finalizeValuation(saved.id, sessionId, hasRelay, valuation);
            await updateValuationContact(saved.id, sessionId, {
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
            });
            range = formatRange(valuation);
          }
        } else {
          console.warn("[contact] FMCSA lookup missed", lookup.reason);
        }
      } catch (err) {
        // Never fail the submission on FMCSA/DB trouble — the lead still
        // lands via `leads` + the unmatched notification below.
        console.error("[contact] valuation path failed", err);
      }
    }

    // Persist to Postgres if DATABASE_URL is set; no-op otherwise. We don't
    // fail the user on DB errors — the email still goes out and the team
    // captures the lead via inbox.
    const saveResult = await saveLead(lead, { ip, userAgent });

    // Internal test submission (?test=1): the row is persisted with
    // is_test=true above; bail before any notification + the partial-link
    // so we don't pollute the inbox / Slack / nurture queue. (Telegram
    // lives in Jarvis and isn't suppressed here yet — recognizable by the
    // is_test flag on the row.)
    if (lead.test) {
      return NextResponse.json({ ok: true, test: true });
    }

    // Link the partial-capture row (if any) to this completed submission
    // so reports can attribute conversion lift to partial-save catches.
    if (saveResult.ok && saveResult.id && lead.sessionId) {
      await markPartialConverted(lead.sessionId, saveResult.id);
    }

    // Real-time Slack ping for new leads. Silently no-ops if the
    // webhook URL isn't configured.
    await notifySlackNewLead(lead, {
      id: saveResult.id,
      priority: saveResult.priority,
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[contact] RESEND_API_KEY not set — email step skipped");
      return NextResponse.json({ ok: true });
    }

    const resend = new Resend(apiKey);

    const priorityFlag =
      saveResult.priority === "high"
        ? "🔥 HIGH"
        : saveResult.priority === "medium"
          ? "⚡ MEDIUM"
          : "💬";
    // One lead type. A matched submission reads exactly like the wizard's
    // notification (carrier + range); only a submission we could NOT match to
    // an FMCSA record is called out separately, because that one needs a human
    // to find the company by hand.
    const subject = stripCrLf(
      valuationId
        ? `${priorityFlag} Valuation — ${carrierName} (${range})`
        : `⚠️ Unmatched seller — ${lead.company || lead.name} (${lead.locale.toUpperCase()})`,
    );

    // Attribution summary line for the email, when present.
    const attr = lead.attribution as Record<string, string> | null | undefined;
    const attrLines: string[] = [];
    if (attr) {
      if (attr.attr_utm_source) attrLines.push(`utm_source: ${attr.attr_utm_source}`);
      if (attr.attr_utm_medium) attrLines.push(`utm_medium: ${attr.attr_utm_medium}`);
      if (attr.attr_utm_campaign) attrLines.push(`utm_campaign: ${attr.attr_utm_campaign}`);
      if (attr.attr_utm_term) attrLines.push(`utm_term: ${attr.attr_utm_term}`);
      if (attr.attr_utm_content) attrLines.push(`utm_content: ${attr.attr_utm_content}`);
      if (attr.attr_fbclid) attrLines.push(`fbclid: ${attr.attr_fbclid}`);
      if (attr.attr_gclid) attrLines.push(`gclid: ${attr.attr_gclid}`);
      if (attr.attr_referrer) attrLines.push(`referrer: ${attr.attr_referrer.slice(0, 100)}`);
      if (attr.attr_landing) attrLines.push(`landing: ${attr.attr_landing}`);
    }

    const adminText = [
      valuationId
        ? `New valuation from the ${SITE.name} website (typed into the contact form, FMCSA matched)`
        : `Seller submitted the contact form but NO FMCSA record matched — find this company by hand`,
      ...(valuationId
        ? [
            `Carrier: ${carrierName}`,
            `Range: ${range}`,
            `It is already in the pipeline at https://groupveritor.com/admin`,
          ]
        : []),
      `Priority: ${saveResult.priority ?? "?"}`,
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
      ...(attrLines.length ? ["", "Attribution:", ...attrLines] : []),
      ``,
      `Notes:`,
      lead.notes || "—",
    ].join("\n");

    const adminHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
        <h2 style="margin:0 0 16px; font-size: 20px;">${
          valuationId
            ? `Valuation — ${escape(carrierName ?? "")}`
            : `Unmatched seller — ${escape(lead.company || lead.name)}`
        }</h2>
        ${
          valuationId
            ? `<p style="margin:0 0 16px;font-size:14px;color:#111;">Range <strong>${escape(range ?? "")}</strong> · already in the pipeline at <a href="https://groupveritor.com/admin">/admin</a>.</p>`
            : `<p style="margin:0 0 16px;font-size:14px;color:#a33;">No FMCSA record matched what they typed, so this one is not in the pipeline. Find the company by hand.</p>`
        }
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
        ${
          attrLines.length
            ? `<h3 style="margin:24px 0 8px;font-size:14px;color:#666;">Where this lead came from</h3>
        <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px;">
          ${attrLines
            .map((line) => {
              const at = line.indexOf(": ");
              const k = at === -1 ? line : line.slice(0, at);
              const v = at === -1 ? "" : line.slice(at + 2);
              return `<tr><td style="color:#666;width:160px;">${escape(k)}</td><td style="word-break:break-all;">${escape(v)}</td></tr>`;
            })
            .join("")}
        </table>`
            : `<p style="margin:24px 0 0;font-size:13px;color:#999;">No attribution captured — direct visit, or the tab was opened before tracking loaded.</p>`
        }
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
        { error: "Couldn't send your details. Please try again or email us directly." },
        { status: 500 },
      );
    }

    // Auto-reply to the seller (uses the same branded shell as the
    // follow-up sequence). Awaited so it completes before the
    // serverless function terminates.
    const autoreply = contactAutoreply({
      name: lead.name,
      locale: lead.locale,
      unsubscribeUrl: unsubscribeUrl(lead.email),
    });
    try {
      const { error: autoreplyErr } = await resend.emails.send({
        from: SITE.emailFrom,
        to: lead.email,
        replyTo: SITE.email,
        subject: stripCrLf(autoreply.subject),
        text: autoreply.text,
        html: autoreply.html,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl(lead.email)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      if (autoreplyErr) console.error("[contact] autoreply error", autoreplyErr);
    } catch (err) {
      console.error("[contact] autoreply unexpected", err);
    }

    // Queue the 4-step nurture sequence (D+1, D+4, D+10, D+21). Cancels
    // automatically if the seller unsubscribes. We don't await the
    // failure paths inside queueSequence — best-effort.
    try {
      await queueSequence({
        sequenceId: "seller_nurture",
        recipientEmail: lead.email,
        recipientName: lead.name,
        context: {
          state: lead.state ?? null,
          hasRelay: lead.hasRelay ?? null,
          locale: lead.locale,
        },
      });
    } catch (err) {
      console.error("[contact] queueSequence failed", err);
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
