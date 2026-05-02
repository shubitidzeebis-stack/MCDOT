// Cloudflare Turnstile — invisible-by-default CAPTCHA. Free, no quota,
// Privacy Shield-compliant. The widget on the form returns a token; we
// verify it server-side against Cloudflare's API before accepting any
// form submission.
//
// If the environment isn't configured (TURNSTILE_SECRET_KEY missing),
// we log and pass — that way the form keeps working even before keys
// are provisioned. In production with keys set, every submission must
// have a valid token.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const TURNSTILE_PUBLIC_KEY_ENV = "NEXT_PUBLIC_TURNSTILE_SITE_KEY";
export const TURNSTILE_SECRET_KEY_ENV = "TURNSTILE_SECRET_KEY";

export type TurnstileVerifyResult =
  | { ok: true; reason: "verified" }
  | { ok: true; reason: "no-secret-configured" }
  | { ok: false; reason: "missing-token" }
  | { ok: false; reason: "invalid-token"; codes?: string[] }
  | { ok: false; reason: "verify-failed" };

export async function verifyTurnstile(
  token: string | undefined,
  ip: string,
): Promise<TurnstileVerifyResult> {
  const secret = process.env[TURNSTILE_SECRET_KEY_ENV];
  if (!secret) {
    // Not yet provisioned — let the form work. In production this
    // should NEVER be the steady state.
    return { ok: true, reason: "no-secret-configured" };
  }
  if (!token || typeof token !== "string") {
    return { ok: false, reason: "missing-token" };
  }
  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      remoteip: ip,
    });
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    if (data.success) return { ok: true, reason: "verified" };
    return { ok: false, reason: "invalid-token", codes: data["error-codes"] };
  } catch (err) {
    console.error("[turnstile] verify failed", err);
    return { ok: false, reason: "verify-failed" };
  }
}
