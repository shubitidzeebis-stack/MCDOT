import { after } from "next/server";
import { NextResponse } from "next/server";
import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// Meta Conversions API relay — the server half of the deduplicated
// browser+server pair described in lib/meta.
//
// Why this exists at all: the browser pixel is blocked for a large share of
// real traffic (ad blockers, Safari ITP, iOS). Those users still convert;
// without a server-side signal Meta never learns from them and the campaign
// optimizes on a biased sample. This route re-sends every conversion from
// our infrastructure, where nothing can block it.
//
// Dedup contract: the browser sends fbq(..., {eventID}) and we forward the
// SAME id as `event_id` with the SAME `event_name`. Meta keeps whichever
// arrives first and discards the twin. Break either half and conversions
// double-count.
//
// PII contract: raw email/phone arrive here over HTTPS from our own client
// and are SHA-256 hashed before the outbound call. Raw values never leave
// this function.

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN ?? "";
// Only set while validating the integration in Events Manager → Test
// events. Leave unset in production or events land in the test bucket and
// never reach the optimizer.
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE ?? "";
// Graph API versions age out roughly two years after release, so this
// needs periodic bumping. v25.0 shipped Feb 2026. Overridable via env so a
// version bump doesn't need a code deploy.
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v25.0";

// This endpoint is public (the browser calls it), so the event name is
// attacker-controlled input. Without an allowlist anyone could inject
// arbitrary events into the dataset and poison campaign optimization.
const ALLOWED_EVENTS = new Set([
  "Lead",
  "InitiateCheckout",
  "Contact",
  "PageView",
  "ViewContent",
]);

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Meta wants phone numbers as digits only, country code included, no "+"
// and no separators — then hashed. Anything unparseable is dropped rather
// than guessed, since a wrong hash is worse than no hash (it can never
// match and drags the reported match rate down).
function normalizePhoneDigits(input: string): string | null {
  const parsed =
    parsePhoneNumberFromString(input.trim(), "US") ??
    parsePhoneNumberFromString(input.trim());
  if (!parsed || !parsed.isValid()) return null;
  return parsed.format("E.164").replace(/\D/g, "");
}

// Reconstruct the click identifier when the _fbc cookie is missing. The
// pixel normally writes _fbc on the first ad-click landing, but if the
// pixel was blocked (or consent came later) the fbclid is still sitting in
// the URL. Meta's documented format is fb.1.<creation-ms>.<fbclid>.
function deriveFbc(cookieFbc: string | undefined, eventSourceUrl: string): string | undefined {
  if (cookieFbc) return cookieFbc;
  try {
    const fbclid = new URL(eventSourceUrl).searchParams.get("fbclid");
    if (!fbclid) return undefined;
    return `fb.1.${Date.now()}.${fbclid}`;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request) {
  // Silently succeed when unconfigured — the client fires this on every
  // conversion and a 500 here would show up as noise in error tracking on
  // every preview deploy that lacks the token.
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return NextResponse.json({ ok: true, skipped: "unconfigured" });
  }

  const ip = getClientIp(req);
  const rl = await rateLimit(`meta-capi:${ip}`, 60, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let payload: {
    eventName?: string;
    eventId?: string;
    eventSourceUrl?: string;
    customData?: Record<string, unknown>;
    userData?: { email?: string; phone?: string };
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const { eventName, eventId, eventSourceUrl = "", customData = {}, userData = {} } = payload;
  if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
    return NextResponse.json({ ok: false, error: "bad_event" }, { status: 400 });
  }
  if (!eventId) {
    // No shared id means Meta cannot dedup this against the browser ping.
    // Dropping it is strictly better than double-counting the conversion.
    return NextResponse.json({ ok: false, error: "missing_event_id" }, { status: 400 });
  }

  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = new Map(
    cookieHeader
      .split(";")
      .map((c) => c.trim().split("="))
      .filter((p): p is [string, string] => p.length === 2)
      .map(([k, v]) => [k, decodeURIComponent(v)]),
  );

  const user_data: Record<string, string | string[]> = {
    client_ip_address: ip,
    client_user_agent: req.headers.get("user-agent") ?? "",
  };

  const fbp = cookies.get("_fbp");
  if (fbp) user_data.fbp = fbp;
  const fbc = deriveFbc(cookies.get("_fbc"), eventSourceUrl);
  if (fbc) user_data.fbc = fbc;

  if (userData.email) {
    const normalized = userData.email.trim().toLowerCase();
    if (normalized) user_data.em = [await sha256Hex(normalized)];
  }
  if (userData.phone) {
    const digits = normalizePhoneDigits(userData.phone);
    if (digits) user_data.ph = [await sha256Hex(digits)];
  }

  const body = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: eventSourceUrl || undefined,
        action_source: "website",
        user_data,
        custom_data: customData,
      },
    ],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  // Send after the response so a slow Graph API call never delays the
  // client. The browser has already fired its own pixel ping by now; this
  // twin only needs to arrive eventually.
  after(async () => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        // Logged, not thrown — the user-facing conversion already
        // succeeded. Surfaces in `vercel logs --level error --expand`.
        console.error("[meta-capi] rejected", res.status, await res.text());
      }
    } catch (err) {
      console.error("[meta-capi] request failed", err);
    }
  });

  return NextResponse.json({ ok: true });
}
