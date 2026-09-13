// Capture UTM + referrer parameters on first page-load and persist them
// in sessionStorage. The contact form reads from there at submit time
// so every lead row carries source + campaign attribution back to the
// ad that drove it.
//
// Captures the FIRST-touch attribution within a session — if the user
// arrives via organic search, then later clicks an ad, we keep the
// organic-search source. Most ad platforms credit clicks anyway via
// pixels; this is the canonical first-source for our own analytics.

const STORAGE_KEY = "veritor.attribution";

export const ATTRIBUTION_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  // Click-IDs from the major ad networks. Useful for server-side
  // conversion APIs (Meta CAPI, Google Ads enhanced conversions).
  "fbclid", // Meta / Facebook
  "gclid", // Google Ads
  "gbraid", // Google Ads (no-cookie iOS)
  "wbraid", // Google Ads (no-cookie iOS)
  "msclkid", // Microsoft Ads
  "ttclid", // TikTok
  "twclid", // X/Twitter
] as const;

export type AttributionRecord = {
  capturedAt: string;
  referrer: string;
  landing: string;
  // Each ATTRIBUTION_PARAM keyed to its captured value.
  params: Partial<Record<(typeof ATTRIBUTION_PARAMS)[number], string>>;
};

export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  // Only capture once per session — first touch wins.
  if (window.sessionStorage.getItem(STORAGE_KEY)) return;

  const url = new URL(window.location.href);
  const params: AttributionRecord["params"] = {};
  for (const key of ATTRIBUTION_PARAMS) {
    const value = url.searchParams.get(key);
    if (value) params[key] = value.slice(0, 200);
  }

  // Even without query params, capture referrer so we can attribute
  // organic / direct / email clicks.
  const record: AttributionRecord = {
    capturedAt: new Date().toISOString(),
    referrer: document.referrer.slice(0, 500),
    landing: url.pathname + url.search.slice(0, 500),
    params,
  };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // sessionStorage full or disabled — ignore.
  }
}

export function readAttribution(): AttributionRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AttributionRecord;
  } catch {
    return null;
  }
}

// Compact form for sending to the server. Only the attribute keys
// that have values get serialized.
/**
 * Render a stored attribution blob as ordered "label: value" lines for the
 * team notification emails. Pure and server-safe — the wizard and the contact
 * form both use it so both notifications answer "where did this come from?"
 * the same way (added 2026-09-13; before that the source was captured but
 * never shown, so every enquiry looked sourceless in the inbox).
 */
export function attributionLines(
  attr: Record<string, string> | null | undefined,
): string[] {
  if (!attr) return [];
  const order: Array<[string, string]> = [
    ["attr_utm_source", "utm_source"],
    ["attr_utm_medium", "utm_medium"],
    ["attr_utm_campaign", "utm_campaign"],
    ["attr_utm_term", "utm_term"],
    ["attr_utm_content", "utm_content"],
    ["attr_gclid", "gclid"],
    ["attr_gbraid", "gbraid"],
    ["attr_wbraid", "wbraid"],
    ["attr_fbclid", "fbclid"],
    ["attr_msclkid", "msclkid"],
    ["attr_referrer", "referrer"],
    ["attr_landing", "landing"],
  ];
  const out: string[] = [];
  for (const [key, label] of order) {
    const v = attr[key];
    if (v) out.push(`${label}: ${String(v).slice(0, 200)}`);
  }
  return out;
}

export function attributionPayload(): Record<string, string> | null {
  const r = readAttribution();
  if (!r) return null;
  const out: Record<string, string> = {
    attr_referrer: r.referrer,
    attr_landing: r.landing,
    attr_captured_at: r.capturedAt,
    ...Object.fromEntries(
      Object.entries(r.params).map(([k, v]) => [`attr_${k}`, v as string]),
    ),
  };
  return out;
}
