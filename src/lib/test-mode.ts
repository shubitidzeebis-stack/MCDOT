// Internal "test mode" — lets us (and family/friends) walk the funnel
// without polluting production conversions or notifications. Activated by
// `?test=1` on any page; cleared by `?test=0`. The flag lives in
// sessionStorage (per-tab, auto-clears on tab close) so a tester's later
// real submission in a fresh tab can't stay silently flagged as test.
//
// When active:
// - the client no-ops all gtag (no GA4 events, no Google Ads conversions,
//   no hashed user_data) — see lib/analytics.
// - forms send `test: true`, so the API writes the row with is_test=true
//   and skips email + Slack + the nurture sequence.
//
// NOTE: Telegram alerts live in the separate Jarvis project and are NOT
// suppressed here yet — test rows stay recognizable by their is_test flag.

const STORAGE_KEY = "veritor.test";

// Persist the flag from the current URL. Call once on load (globally, via
// AttributionCapture). `?test=1` turns it on for the tab; `?test=0` off.
export function initTestModeFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const t = new URLSearchParams(window.location.search).get("test");
    if (t === "1") window.sessionStorage.setItem(STORAGE_KEY, "1");
    else if (t === "0") window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessionStorage can throw in locked-down / private contexts — ignore.
  }
}

// True when this tab is in test mode. Reads the live URL first (so it's
// correct even before initTestModeFromUrl runs — e.g. effect ordering on
// first paint), then falls back to the persisted per-tab flag.
export function isTestMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const t = new URLSearchParams(window.location.search).get("test");
    if (t === "0") return false;
    if (t === "1") return true;
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
