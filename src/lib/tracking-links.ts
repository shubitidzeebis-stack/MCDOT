// Campaign tagging for every first-party link we send out.
//
// src/lib/attribution.ts captures utm_* (plus the ad-network click IDs) on
// first page-load and stores them in sessionStorage; the contact form and the
// valuation wizard then write them onto the `leads` / `valuations` row. That
// means an UNTAGGED outbound link produces a lead whose source is
// unrecoverable — it arrives looking like direct traffic, in GA4 and in our
// own tables alike. Cold outreach was shipping exactly that: a big CTA button
// to /get-offer with no parameters on it at all (fixed 2026-09-13).
//
// Rules:
//   - never overwrite a parameter the caller already set,
//   - never touch a URL that isn't ours (unsubscribe links are passed around
//     separately and must stay byte-identical — they carry an HMAC),
//   - values are slugged so a persona or sender name can be passed straight in.

export type LinkTags = {
  /** utm_source — the system that sent the click (e.g. "outreach"). */
  source: string;
  /** utm_medium — how it travelled (e.g. "email", "sms"). */
  medium: string;
  /** utm_campaign — which programme (e.g. "fmcsa-monitor"). */
  campaign?: string;
  /** utm_content — which variant (we use the persona). */
  content?: string;
  /** utm_term — which sender identity. */
  term?: string;
};

const FIRST_PARTY_HOST = "groupveritor.com";

// Paths that must never be rewritten. The unsubscribe link carries an HMAC and
// is also served to mail providers via List-Unsubscribe one-click, which POSTs
// the URL verbatim — and an unsubscribe click is not campaign traffic anyway.
const NEVER_TAG = [/^\/api\/unsubscribe\b/, /^\/unsubscribe\b/];

/** Lowercase, strip anything that would need escaping in a query string. */
function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function isFirstParty(u: URL): boolean {
  return u.hostname.replace(/^www\./, "") === FIRST_PARTY_HOST;
}

/**
 * Append campaign tags to one URL. Non-first-party and unparseable URLs are
 * returned untouched, as are parameters the URL already carries.
 */
export function tagUrl(url: string, tags: LinkTags): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  if (!isFirstParty(u)) return url;
  if (NEVER_TAG.some((re) => re.test(u.pathname))) return url;

  const set = (key: string, value?: string): void => {
    if (!value) return;
    const s = slug(value);
    if (s && !u.searchParams.has(key)) u.searchParams.set(key, s);
  };
  set("utm_source", tags.source);
  set("utm_medium", tags.medium);
  set("utm_campaign", tags.campaign);
  set("utm_content", tags.content);
  set("utm_term", tags.term);
  return u.toString();
}

/**
 * Tag every first-party URL that appears inside free text (an LLM-written or
 * templated email body). Trailing sentence punctuation is preserved outside
 * the link so "…visit https://groupveritor.com." still reads correctly.
 */
export function tagUrlsInText(text: string, tags: LinkTags): string {
  return text.replace(/https?:\/\/[^\s<>"')]+/g, (match) => {
    const trailing = /[.,;:!?]+$/.exec(match)?.[0] ?? "";
    const core = trailing ? match.slice(0, -trailing.length) : match;
    return tagUrl(core, tags) + trailing;
  });
}
