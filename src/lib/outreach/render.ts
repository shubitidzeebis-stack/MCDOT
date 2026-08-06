// Cold-outreach email rendering — DELIBERATELY plain and personal, NOT the
// branded dark transactional shell. Cold M&A lands in the inbox and gets
// replies far better as a simple human note, and the branded dark template
// raises spam scores (per its own comment). This is the single source of truth
// for both the live sender (send.ts) and the test route, so what we test is
// exactly what carriers receive.

import { SITE, formatAddressOneLine } from "@/lib/site";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Plain body text -> simple <p> paragraphs, linkifying bare https URLs.
function bodyToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => {
      const safe = escapeHtml(para).replace(/\n/g, "<br/>");
      const linked = safe.replace(
        /(https?:\/\/[^\s<]+)/g,
        (u) =>
          `<a href="${u}" style="color:#1a56db;">${u.replace(/^https?:\/\//, "")}</a>`,
      );
      return `<p style="margin:0 0 16px;">${linked}</p>`;
    })
    .join("");
}

// CAN-SPAM-honest reason line for cold outreach (no false "you contacted us").
// The closing sentence is the §7704(a)(5) advertisement identification.
const REASON =
  "You received this because your company holds active interstate operating " +
  "authority on file with the FMCSA and we believe it may be a fit for acquisition. " +
  "This is a commercial message.";

export type OutreachTemplateStyle = "plain" | "branded";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export function renderOutreachEmail(input: {
  subject: string;
  bodyText: string;
  unsubscribeUrl: string;
  /** "plain" (default) = personal-note shell; "branded" = site-UI newsletter shell. */
  template?: OutreachTemplateStyle;
}): { subject: string; text: string; html: string } {
  const { subject, bodyText, unsubscribeUrl } = input;
  const address = formatAddressOneLine();

  // The text/plain part is identical for both templates — it IS the personal
  // note, and text-only clients should always get the simplest form.
  const text =
    `${bodyText}\n\n` +
    `—\n${SITE.legalName} · ${address}\n` +
    `${REASON} Not interested? Unsubscribe: ${unsubscribeUrl}`;

  if (input.template === "branded") {
    return {
      subject,
      text,
      html: brandedHtml(bodyText, unsubscribeUrl, address),
    };
  }

  const html =
    `<div style="font-family:${FONT};font-size:15px;line-height:1.6;color:#222222;max-width:560px;">` +
    bodyToHtml(bodyText) +
    `<p style="margin:24px 0 0;padding-top:12px;border-top:1px solid #eeeeee;font-size:12px;line-height:1.5;color:#999999;">` +
    `${escapeHtml(SITE.legalName)} · ${escapeHtml(address)}<br/>` +
    `${escapeHtml(REASON)} ` +
    `<a href="${unsubscribeUrl}" style="color:#999999;text-decoration:underline;">Unsubscribe</a> and we'll remove you immediately.` +
    `</p></div>`;

  return { subject, text, html };
}

// Site-UI newsletter shell, approved by Lukas 2026-08-07 from the emailed
// preview: dark #0a0a0b header with the logo, white body card with the same
// copy, orange #ff8a1a CTA button to /get-offer, dark footer with site/phone
// links + the CAN-SPAM block. Table-based + inline styles only (email-client
// constraint); the logo is an absolute URL served by the site itself.
function brandedHtml(
  bodyText: string,
  unsubscribeUrl: string,
  address: string,
): string {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((para) => {
      const safe = escapeHtml(para).replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:#222222;">${safe}</p>`;
    })
    .join("");

  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f3;">` +
    `<tr><td align="center" style="padding:24px 12px;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;">` +
    // Header — dark bar with the wordmark, linked to the site.
    `<tr><td style="background:#0a0a0b;padding:20px 32px;border-radius:12px 12px 0 0;">` +
    `<a href="https://groupveritor.com" style="text-decoration:none;">` +
    `<img src="https://groupveritor.com/brand/logo-on-dark.png" alt="${escapeHtml(SITE.name)}" height="30" style="height:30px;display:block;border:0;"/>` +
    `</a></td></tr>` +
    // Body card — the note itself, then the CTA button.
    `<tr><td style="background:#ffffff;padding:32px 32px 24px;">` +
    paragraphs +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">` +
    `<tr><td style="background:#ff8a1a;border-radius:8px;">` +
    `<a href="https://groupveritor.com/get-offer" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:#0a0a0b;text-decoration:none;">See what your company is worth</a>` +
    `</td></tr></table>` +
    `</td></tr>` +
    // Footer — dark, site + phone links, CAN-SPAM block, unsubscribe.
    `<tr><td style="background:#0a0a0b;padding:24px 32px;border-radius:0 0 12px 12px;font-family:${FONT};font-size:12px;line-height:1.7;color:#8a8a8e;">` +
    `<span style="color:#ffffff;font-weight:600;">${escapeHtml(SITE.legalName)}</span> · ${escapeHtml(address)}<br/>` +
    `<a href="https://groupveritor.com" style="color:#ffb371;text-decoration:none;">groupveritor.com</a>` +
    `&nbsp;·&nbsp;<a href="tel:${SITE.phoneTel}" style="color:#ffb371;text-decoration:none;">${escapeHtml(SITE.phoneDisplay)}</a><br/><br/>` +
    `${escapeHtml(REASON)} ` +
    `<a href="${unsubscribeUrl}" style="color:#8a8a8e;text-decoration:underline;">Unsubscribe</a> and we'll remove you immediately.` +
    `</td></tr>` +
    `</table></td></tr></table>`
  );
}
