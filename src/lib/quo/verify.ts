// Signature verification for Quo (formerly OpenPhone) webhooks.
//
// This endpoint is PUBLIC — it has to be, Quo's servers call it — so the
// signature is the only thing standing between a stranger and write access to
// quo_calls. Treat a verification failure as hostile, not as a bug.
//
// Header shape (Quo docs):
//   openphone-signature: hmac;1;1639710054089;mw1K4fvh5m9XzsGon4C5N3KvL0bkmPZSAy...
//                        ^scheme ^ver ^timestamp(ms) ^base64 signature
//
// Signed payload is `${timestamp}.${rawBody}` — the RAW body bytes exactly as
// received. This is the one thing that will silently break everything: if the
// caller does `await req.json()` and re-stringifies, key order and whitespace
// shift and every signature fails. The route reads req.text() first and
// verifies before parsing, and must keep doing so.
//
// The signing key is base64 and must be decoded to BINARY before use as the
// HMAC key — using the base64 string itself produces a wrong-but-plausible
// digest that fails only at runtime, against live traffic.

import crypto from "node:crypto";

/** Reject anything older than this to blunt replay attacks. */
const MAX_SKEW_MS = 5 * 60 * 1000;

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "no_secret" | "malformed" | "stale" | "mismatch" };

export function verifyQuoSignature(
  header: string | null,
  rawBody: string,
  secret: string | undefined,
  nowMs: number = Date.now(),
): VerifyResult {
  if (!secret) return { ok: false, reason: "no_secret" };
  if (!header) return { ok: false, reason: "malformed" };

  // scheme;version;timestamp;signature
  const parts = header.split(";");
  if (parts.length !== 4) return { ok: false, reason: "malformed" };
  const [scheme, , timestamp, signature] = parts;
  if (scheme !== "hmac" || !timestamp || !signature) {
    return { ok: false, reason: "malformed" };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "malformed" };
  if (Math.abs(nowMs - ts) > MAX_SKEW_MS) return { ok: false, reason: "stale" };

  let expected: string;
  try {
    const keyBytes = Buffer.from(secret, "base64");
    expected = crypto
      .createHmac("sha256", keyBytes)
      .update(`${timestamp}.${rawBody}`)
      .digest("base64");
  } catch {
    return { ok: false, reason: "malformed" };
  }

  // timingSafeEqual throws on length mismatch, so guard first. Comparing
  // lengths up front leaks only the length, which is fixed for SHA-256.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return { ok: false, reason: "mismatch" };
  if (!crypto.timingSafeEqual(a, b)) return { ok: false, reason: "mismatch" };

  return { ok: true };
}
