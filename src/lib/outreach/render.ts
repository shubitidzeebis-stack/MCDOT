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
const REASON =
  "You received this because your company holds active interstate operating " +
  "authority on file with the FMCSA and we believe it may be a fit for acquisition.";

export function renderOutreachEmail(input: {
  subject: string;
  bodyText: string;
  unsubscribeUrl: string;
}): { subject: string; text: string; html: string } {
  const { subject, bodyText, unsubscribeUrl } = input;
  const address = formatAddressOneLine();

  const text =
    `${bodyText}\n\n` +
    `—\n${SITE.legalName} · ${address}\n` +
    `${REASON} Not interested? Unsubscribe: ${unsubscribeUrl}`;

  const html =
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#222222;max-width:560px;">` +
    bodyToHtml(bodyText) +
    `<p style="margin:24px 0 0;padding-top:12px;border-top:1px solid #eeeeee;font-size:12px;line-height:1.5;color:#999999;">` +
    `${escapeHtml(SITE.legalName)} · ${escapeHtml(address)}<br/>` +
    `${escapeHtml(REASON)} ` +
    `<a href="${unsubscribeUrl}" style="color:#999999;text-decoration:underline;">Unsubscribe</a> and we'll remove you immediately.` +
    `</p></div>`;

  return { subject, text, html };
}
