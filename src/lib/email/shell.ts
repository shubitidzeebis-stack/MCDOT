// Shared email shell — wraps every transactional + follow-up email in
// the same dark-mode, on-brand layout. The autoreply in autoreply.ts
// and every step in templates.ts call into this single function so
// the visual + signature + CAN-SPAM footer stays in lockstep.
//
// Email-client compatibility notes:
// - Tables for layout. Outlook desktop ignores flexbox/grid completely.
// - Inlined CSS where it matters. The <style> block is for media queries
//   + web font loading; both are tolerated by Apple Mail / iOS / Gmail
//   web. Outlook ignores it gracefully and falls back to the system font.
// - Dark theme is on-brand but slightly raises spam scores. Mitigated
//   with text-heavy content; never image-only.

import { SITE, formatAddressOneLine } from "@/lib/site";

const COLORS = {
  bg: "#0a0a0b",
  cardBg: "#111113",
  footerBg: "#08080a",
  divider: "#1c1c1f",
  accent: "#ff8a1a",
  accentSoft: "#ffb371",
  goldLogo: "#c9a662",
  textPrimary: "#FFFFFF",
  textSecondary: "#B8B8B8",
  textMuted: "#666666",
} as const;

const FONT_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function safe(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] || "there";
}

// Inline style helpers — keeps templates readable without repeating
// long style strings.
export const STYLE = {
  body: `margin:0; padding:0; background-color:${COLORS.bg}; color:${COLORS.textPrimary}; font-family:${FONT_STACK};`,
  paragraph: `margin:0 0 16px; font-size:15px; line-height:1.65; color:${COLORS.textPrimary}; font-family:${FONT_STACK};`,
  paragraphMuted: `margin:0 0 16px; font-size:15px; line-height:1.65; color:${COLORS.textSecondary}; font-family:${FONT_STACK};`,
  list: `margin:0 0 16px; padding-left:20px; font-size:15px; line-height:1.85; color:${COLORS.textPrimary}; font-family:${FONT_STACK};`,
  link: `color:${COLORS.accent}; text-decoration:none;`,
  strong: `color:${COLORS.textPrimary}; font-weight:600;`,
  eyebrow: `display:inline-block; font-size:11px; font-weight:600; letter-spacing:0.32em; text-transform:uppercase; color:${COLORS.accent};`,
} as const;

export const SIGNATURE_TEXT = `The ${SITE.name} team

${SITE.email}
${SITE.phoneDisplay}
${SITE.legalName} — operator-led acquirer of US logistics LLCs`;

export type Cta = {
  label: string;
  href: string;
};

export function emailShell({
  preheader,
  bodyHtml,
  cta,
  unsubscribeUrl,
}: {
  /** Hidden inbox-preview text (40-90 chars works best). */
  preheader: string;
  /** The per-template body content. Use STYLE.* helpers. */
  bodyHtml: string;
  /** Optional amber call-to-action button rendered after bodyHtml. */
  cta?: Cta;
  /** When present, adds the unsubscribe footer line + RFC 8058 link. */
  unsubscribeUrl?: string;
}): string {
  const ctaHtml = cta
    ? `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
              <tr>
                <td align="center" bgcolor="${COLORS.accent}" style="background-color:${COLORS.accent}; border-radius:9999px;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safe(cta.href)}" style="height:44px; v-text-anchor:middle; width:240px;" arcsize="50%" stroke="f" fillcolor="${COLORS.accent}">
                    <w:anchorlock/>
                    <center style="color:#0a0a0b; font-family:Helvetica,Arial,sans-serif; font-size:14px; font-weight:bold;">${safe(cta.label)}</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-- -->
                  <a href="${safe(cta.href)}" style="display:inline-block; padding:14px 32px; color:#0a0a0b; font-size:14px; font-weight:600; text-decoration:none; border-radius:9999px; font-family:${FONT_STACK};">
                    ${safe(cta.label)}
                  </a>
                  <!--<![endif]-->
                </td>
              </tr>
            </table>`
    : "";

  const unsubscribeHtml = unsubscribeUrl
    ? `
            <p style="margin:8px 0 0; font-size:11px; line-height:1.6; color:${COLORS.textMuted}; font-family:${FONT_STACK};">
              You&rsquo;re receiving this because you contacted us through ${safe(SITE.name.toLowerCase())} at ${safe(SITE.email)}.
              <a href="${safe(unsubscribeUrl)}" style="color:${COLORS.accent}; text-decoration:underline;">Unsubscribe from these follow-ups</a>.
            </p>`
    : "";

  const address = formatAddressOneLine();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://groupveritor.com";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
    <title>${safe(SITE.name)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      @media only screen and (max-width: 480px) {
        .container { width:100% !important; }
        .card-padded { padding:32px 22px !important; }
        .header-padded { padding:28px 22px !important; }
        .footer-padded { padding:22px 22px 28px !important; }
        h1.email-title { font-size:24px !important; }
      }
      body, table, td, p, a, li, h1, h2, h3 {
        font-family: ${FONT_STACK};
      }
      a { color: ${COLORS.accent}; }
      img { border:0; max-width:100%; }
    </style>
  </head>
  <body style="${STYLE.body}">
    <!-- Preheader: hidden from email body, shown in inbox preview. -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">
      ${safe(preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.bg};">
      <tr>
        <td align="center" style="padding:32px 16px;">

          <!-- Card -->
          <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background-color:${COLORS.cardBg}; border:1px solid ${COLORS.divider}; border-radius:16px; overflow:hidden;">

            <!-- Header band — V/ logo -->
            <tr>
              <td class="header-padded" style="padding:36px 40px 28px; border-bottom:1px solid ${COLORS.divider};">
                <a href="${safe(siteUrl)}" style="text-decoration:none; color:${COLORS.textPrimary}; display:inline-block;">
                  <span style="font-size:24px; font-weight:900; letter-spacing:-0.04em; color:${COLORS.textPrimary};">V</span><span style="font-size:24px; font-weight:700; color:${COLORS.goldLogo}; transform:skewX(-20deg); display:inline-block; margin:0 -1px;">/</span><span style="font-size:24px; font-weight:900; letter-spacing:-0.04em; color:${COLORS.textPrimary};">ERITOR</span>
                  <span style="display:inline-block; margin-left:14px; font-size:11px; font-weight:600; letter-spacing:0.32em; color:${COLORS.goldLogo}; text-transform:uppercase; vertical-align:3px;">Group</span>
                </a>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td class="card-padded" style="padding:40px;">
                ${bodyHtml}
                ${ctaHtml}

                <!-- Divider -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:36px 0 24px;">
                  <tr>
                    <td style="border-top:1px solid ${COLORS.divider}; line-height:0; font-size:0;">&nbsp;</td>
                  </tr>
                </table>

                <!-- Signature -->
                <p style="margin:0 0 14px; font-size:14px; font-weight:500; color:${COLORS.textPrimary}; font-family:${FONT_STACK};">
                  The ${safe(SITE.name)} team
                </p>
                <p style="margin:0; font-size:13px; color:${COLORS.textSecondary}; line-height:1.75; font-family:${FONT_STACK};">
                  <a href="mailto:${safe(SITE.email)}" style="color:${COLORS.accent}; text-decoration:none;">${safe(SITE.email)}</a><br />
                  ${safe(SITE.phoneDisplay)}<br />
                  <a href="${safe(siteUrl)}" style="color:${COLORS.accent}; text-decoration:none;">${safe(siteUrl.replace(/^https?:\/\//, ""))}</a><br />
                  <span style="color:${COLORS.textMuted};">${safe(SITE.trust.acquisitionsCompleted)} acquisitions · ${safe(SITE.trust.averageCloseDays)} · operator-led</span>
                </p>
              </td>
            </tr>

            <!-- Footer band — CAN-SPAM compliance -->
            <tr>
              <td class="footer-padded" style="padding:24px 40px 32px; background-color:${COLORS.footerBg}; border-top:1px solid ${COLORS.divider};">
                <p style="margin:0; font-size:11px; line-height:1.6; color:${COLORS.textMuted}; font-family:${FONT_STACK};">
                  ${safe(SITE.legalName)}<br />
                  ${safe(address)}
                </p>
                ${unsubscribeHtml}
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`;
}
