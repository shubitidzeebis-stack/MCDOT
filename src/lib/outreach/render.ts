// Cold-outreach email rendering — DELIBERATELY plain and personal, NOT the
// branded dark transactional shell. Cold M&A lands in the inbox and gets
// replies far better as a simple human note, and the branded dark template
// raises spam scores (per its own comment). This is the single source of truth
// for both the live sender (send.ts) and the test route, so what we test is
// exactly what carriers receive.

import { SITE, formatAddressOneLine } from "@/lib/site";
import { tagUrl, tagUrlsInText, type LinkTags } from "@/lib/tracking-links";

// Default campaign tags for cold outreach. Every first-party link in the mail
// carries these so a carrier who clicks through and converts is attributable
// instead of landing in "direct" (see src/lib/tracking-links.ts).
const DEFAULT_TAGS: LinkTags = {
  source: "outreach",
  medium: "email",
  campaign: "fmcsa-monitor",
};

// Absolute origin for the links inside the mail. Email clients can't resolve
// relative URLs, and this must match the host tracking-links.ts treats as
// first-party.
const SITE_ORIGIN = "https://groupveritor.com";

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
  /**
   * Per-send campaign tags (persona in `content`, sender identity in `term`).
   * Omitted keys fall back to DEFAULT_TAGS; the unsubscribe link is never
   * tagged because it carries an HMAC and must travel byte-identical.
   */
  tracking?: Partial<LinkTags>;
}): { subject: string; text: string; html: string } {
  const { subject, unsubscribeUrl } = input;
  const address = formatAddressOneLine();
  const tags: LinkTags = { ...DEFAULT_TAGS, ...(input.tracking ?? {}) };
  // Tag every first-party link the copy itself contains, before either part is
  // built, so the text and HTML halves stay identical to each other.
  const bodyText = tagUrlsInText(input.bodyText, tags);

  // Two answer pages, tagged. Search Console showed recipients googling the
  // company name plus "can you transfer an llc" / "is my insurance active"
  // before replying, and clicking nothing (56 impressions, 0 clicks, Sep 12–14).
  // Putting the answers in the mail removes the detour through Google.
  const transferUrl = tagUrl(`${SITE_ORIGIN}/llc-transfer`, tags);
  const insuranceUrl = tagUrl(`${SITE_ORIGIN}/insurance-status`, tags);
  const answersText =
    `Two things people usually ask first:\n` +
    `How the LLC transfer works: ${transferUrl}\n` +
    `Is my insurance active: ${insuranceUrl}`;

  // The text/plain part is identical for both templates — it IS the personal
  // note, and text-only clients should always get the simplest form.
  const text =
    `${bodyText}\n\n` +
    `${answersText}\n\n` +
    `—\n${SITE.legalName} · ${address}\n` +
    `${REASON} Not interested? Unsubscribe: ${unsubscribeUrl}`;

  const answersHtml =
    `<p style="margin:16px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:#666666;">` +
    `Two things people usually ask first: ` +
    `<a href="${transferUrl}" style="color:#1a56db;">how the LLC transfer works</a> · ` +
    `<a href="${insuranceUrl}" style="color:#1a56db;">is my insurance active</a>` +
    `</p>`;

  if (input.template === "branded") {
    return {
      subject,
      text,
      html: brandedHtml(bodyText, unsubscribeUrl, address, tags, answersHtml),
    };
  }

  const html =
    `<div style="font-family:${FONT};font-size:15px;line-height:1.6;color:#222222;max-width:560px;">` +
    bodyToHtml(bodyText) +
    answersHtml +
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
  tags: LinkTags,
  answersHtml: string,
): string {
  // The three fixed links in the shell. The CTA button is the one carriers
  // actually click, and it shipped untagged from 2026-08-07 to 2026-09-13 —
  // every click it sent looked like direct traffic on arrival.
  const homeUrl = tagUrl(SITE_ORIGIN, tags);
  const ctaUrl = tagUrl(`${SITE_ORIGIN}/get-offer`, tags);
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
    `<a href="${homeUrl}" style="text-decoration:none;">` +
    `<img src="https://groupveritor.com/brand/logo-on-dark.png" alt="${escapeHtml(SITE.name)}" height="30" style="height:30px;display:block;border:0;"/>` +
    `</a></td></tr>` +
    // Body card — the note itself, then the CTA button.
    `<tr><td style="background:#ffffff;padding:32px 32px 24px;">` +
    paragraphs +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">` +
    `<tr><td style="background:#ff8a1a;border-radius:8px;">` +
    `<a href="${ctaUrl}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:#0a0a0b;text-decoration:none;">See what your company is worth</a>` +
    `</td></tr></table>` +
    answersHtml +
    `</td></tr>` +
    // Footer — dark, site + phone links, CAN-SPAM block, unsubscribe.
    `<tr><td style="background:#0a0a0b;padding:24px 32px;border-radius:0 0 12px 12px;font-family:${FONT};font-size:12px;line-height:1.7;color:#8a8a8e;">` +
    `<span style="color:#ffffff;font-weight:600;">${escapeHtml(SITE.legalName)}</span> · ${escapeHtml(address)}<br/>` +
    `<a href="${homeUrl}" style="color:#ffb371;text-decoration:none;">groupveritor.com</a>` +
    `&nbsp;·&nbsp;<a href="tel:${SITE.phoneTel}" style="color:#ffb371;text-decoration:none;">${escapeHtml(SITE.phoneDisplay)}</a><br/><br/>` +
    `${escapeHtml(REASON)} ` +
    `<a href="${unsubscribeUrl}" style="color:#8a8a8e;text-decoration:underline;">Unsubscribe</a> and we'll remove you immediately.` +
    `</td></tr>` +
    `</table></td></tr></table>`
  );
}
