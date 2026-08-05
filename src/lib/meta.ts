// Meta (Facebook) Pixel helpers — the browser half of a deduplicated
// browser+server measurement pair. Mirrors lib/analytics.ts in shape: thin
// wrappers around `window.fbq` that no-op when the pixel isn't loaded
// (advertising consent declined, env var unset, SSR).
//
// Every conversion is sent TWICE on purpose:
//   1. from the browser via fbq(), which carries the _fbp/_fbc cookies and
//      the real client fingerprint;
//   2. from our server via the Conversions API (/api/meta/capi), which
//      survives ad blockers, ITP cookie expiry, and iOS.
// Both carry the same `eventID`. Meta collapses the pair into one event —
// without a shared ID you get double-counted conversions, so the ID is not
// optional.
//
// Google's event names stay the source of truth in the UI layer; this maps
// them onto Meta's standard events. Standard events (rather than custom
// ones) matter because Aggregated Event Measurement only ranks standard
// events for iOS attribution.

import { isTestMode } from "@/lib/test-mode";

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

// GA4/internal event name → Meta standard event name.
//
// `generate_lead` (contact form) and `valuation_completed` (wizard) both
// map to `Lead` deliberately. Meta's optimizer needs volume in ONE event to
// exit the learning phase; splitting two low-volume lead sources across two
// events would starve both. They stay separable via `content_name`.
const META_EVENT_MAP: Record<string, string> = {
  generate_lead: "Lead",
  valuation_completed: "Lead",
  // Mid-funnel. Useful as the optimization target while Lead volume is
  // still below Meta's ~50/week learning threshold.
  valuation_started: "InitiateCheckout",
  phone_call_click: "Contact",
  whatsapp_click: "Contact",
  email_click: "Contact",
};

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { loaded?: boolean };
    _fbq?: unknown;
  }
}

function fbqAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

// Sticky first-party identifiers for advanced matching, set by
// rememberMetaUserData() as soon as the visitor gives us a valid email or
// phone. Held in module scope (not state) so a conversion firing from an
// unrelated component — e.g. a tel: click caught by the global ClickTracker
// — still carries them. Mirrors how gtag('set', 'user_data') is sticky.
//
// These are sent RAW to our own API route, which hashes them before they
// leave our infrastructure. Hashing server-side (not here) means we can
// normalize phone numbers to E.164 with the same logic the server already
// uses, and it keeps a single hashing implementation.
let stickyUserData: { email?: string; phone?: string } = {};

export function rememberMetaUserData(input: { email?: string; phone?: string }): void {
  if (isTestMode()) return;
  if (input.email) stickyUserData.email = input.email;
  if (input.phone) stickyUserData.phone = input.phone;
}

export function clearMetaUserData(): void {
  stickyUserData = {};
}

// Random per-event ID shared by the browser ping and the server ping.
// crypto.randomUUID() is unavailable on insecure origins and in a few older
// mobile browsers, so fall back rather than throwing inside a conversion
// handler — a missing ID would break dedup, but a thrown error would break
// the conversion entirely.
function newEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

// Fire one conversion to Meta: browser pixel + server CAPI, same event ID.
//
// Called from fireConversion() in lib/analytics, so every existing Google
// conversion call site emits the Meta pair too with no extra wiring.
export function fireMetaConversion(
  internalEventName: string,
  params: Record<string, unknown> = {},
): void {
  // Internal test mode: emit nothing to Meta, same guard as GA4/Ads.
  if (isTestMode()) return;
  const eventName = META_EVENT_MAP[internalEventName];
  if (!eventName) return;
  if (!META_PIXEL_ID) return;

  const eventId = newEventId();
  // `content_name` keeps the two Lead sources separable in reporting even
  // though they share one Meta event name.
  const customData = { ...params, content_name: internalEventName };

  if (fbqAvailable()) {
    window.fbq!("track", eventName, customData, { eventID: eventId });
  }

  // Server-side twin. Fire-and-forget: a CAPI failure must never block or
  // error a user-facing conversion path. keepalive lets it survive the
  // page unloading right after a click (tel:/wa.me links do exactly that).
  try {
    const body = JSON.stringify({
      eventName,
      eventId,
      eventSourceUrl: window.location.href,
      customData,
      userData: stickyUserData,
    });
    fetch("/api/meta/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Swallow — server-side conversion failures are intentionally silent.
    });
  } catch {
    // JSON.stringify or fetch unavailable — nothing useful to do.
  }
}

// PageView, fired on first load by the pixel bootstrap and again on each
// client-side route change (see components/MetaPixel).
export function trackMetaPageView(): void {
  if (isTestMode()) return;
  if (!fbqAvailable()) return;
  window.fbq!("track", "PageView");
}
