// Analytics helpers — thin wrappers around `window.gtag` that no-op when
// gtag isn't loaded (consent declined, env var unset, SSR). Centralizes
// the gtag-shaped boilerplate so component code stays readable.
//
// Google Ads conversion IDs come from env. Each conversion action in
// Google Ads has its own "send_to" string like "AW-1234567890/abcDEF".
// We map them by semantic event name so swapping IDs only touches Vercel
// env vars, not code.

import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import { isTestMode } from "@/lib/test-mode";
import { fireMetaConversion, rememberMetaUserData } from "@/lib/meta";

export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "";

// Per-event Google Ads conversion `send_to` IDs. Each one is in the form
// `AW-XXXXXXXXXX/abcDEF`. Leave unset to skip firing that conversion.
export const GOOGLE_ADS_CONVERSIONS: Record<string, string> = {
  generate_lead: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LEAD ?? "",
  valuation_started: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_VALUATION_STARTED ?? "",
  valuation_completed: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_VALUATION ?? "",
  phone_call_click: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_CALL ?? "",
  whatsapp_click: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_WHATSAPP ?? "",
};

function gtagAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  // Internal test mode: emit nothing to GA4 / Google Ads. fireConversion
  // routes both its GA4 event and its conversion ping through here, so this
  // single guard suppresses every conversion (including phone/whatsapp
  // clicks via the global ClickTracker).
  if (isTestMode()) return;
  if (!gtagAvailable()) return;
  window.gtag!("event", name, params);
}

// Fire the GA4 event, the matching Google Ads conversion (if a send_to ID
// is configured for this event name), AND the Meta browser+server pair.
// One call from the UI, every destination covered — so new conversion call
// sites can't silently miss a platform.
//
// Each destination guards itself (consent, env vars, test mode), so this
// stays a plain unconditional fan-out.
export function fireConversion(eventName: string, params: Record<string, unknown> = {}): void {
  trackEvent(eventName, params);
  const sendTo = GOOGLE_ADS_CONVERSIONS[eventName];
  if (sendTo) {
    trackEvent("conversion", { ...params, send_to: sendTo });
  }
  fireMetaConversion(eventName, params);
}

async function sha256Hex(s: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext || !window.crypto?.subtle) return null;
  const bytes = new TextEncoder().encode(s);
  const buf = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Normalize a US-or-international phone to E.164 ("+13264670388") using
// libphonenumber-js. Returns null if not parseable.
function normalizePhoneE164(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed =
    parsePhoneNumberFromString(trimmed, "US") ??
    parsePhoneNumberFromString(trimmed);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.format("E.164");
}

// Set hashed email + phone on gtag for Google Ads enhanced conversions.
// Per Google's docs: lowercase + trim email, E.164 phone, then SHA-256.
// Google does Gmail dot-stripping etc. server-side; we don't.
// MUST be awaited BEFORE firing the conversion event so the user_data is
// attached to it.
export async function setEnhancedUserData(input: {
  email?: string;
  phone?: string;
}): Promise<void> {
  // Internal test mode: never hash/send a tester's PII to Google.
  if (isTestMode()) return;
  // Stash the raw values for Meta advanced matching before the gtag guard
  // below — Meta's pair is hashed server-side and must still be populated
  // on pages where gtag never loaded (analytics consent declined but
  // advertising accepted).
  rememberMetaUserData(input);
  if (!gtagAvailable()) return;
  const data: Record<string, string> = {};
  if (input.email) {
    const h = await sha256Hex(input.email.trim().toLowerCase());
    if (h) data.sha256_email_address = h;
  }
  if (input.phone) {
    const e164 = normalizePhoneE164(input.phone);
    if (e164) {
      const h = await sha256Hex(e164);
      if (h) data.sha256_phone_number = h;
    }
  }
  if (Object.keys(data).length > 0) {
    window.gtag!("set", "user_data", data);
  }
}
