import { createHmac, timingSafeEqual } from "node:crypto";

// Stateless session tokens — payload is base64url(JSON), signed with
// HMAC-SHA256(secret). No DB lookup per request; the cookie itself
// carries the user identity.
//
// Format:  <payloadBase64Url>.<signatureBase64Url>
//
// Disadvantages vs DB-backed sessions: can't revoke individual
// sessions until they expire. Acceptable trade-off for a 4-person
// admin where session lifetime is 7 days.

export type SessionPayload = {
  uid: number;
  email: string;
  name: string | null;
  exp: number; // Unix seconds
};

export const ADMIN_COOKIE = "veritor_admin";
export const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    // Fallback so dev still works without setting the var. Production
    // MUST set ADMIN_SESSION_SECRET — server logs the warning.
    console.warn(
      "[auth] ADMIN_SESSION_SECRET not set — using insecure fallback. " +
        "Set this env var on Vercel before any real deployment.",
    );
    return "veritor-dev-fallback-do-not-use-in-prod";
  }
  return s;
}

function b64urlEncode(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf, "utf8");
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer | null {
  try {
    let pad = s.length % 4;
    let b = s.replace(/-/g, "+").replace(/_/g, "/");
    if (pad === 2) b += "==";
    else if (pad === 3) b += "=";
    else if (pad === 1) return null;
    return Buffer.from(b, "base64");
  } catch {
    return null;
  }
}

export function signSession(
  payload: Omit<SessionPayload, "exp"> & { exp?: number },
): string {
  const exp = payload.exp ?? Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const full: SessionPayload = { ...payload, exp };
  const json = JSON.stringify(full);
  const payloadB64 = b64urlEncode(json);
  const sig = createHmac("sha256", getSecret()).update(payloadB64).digest();
  return `${payloadB64}.${b64urlEncode(sig)}`;
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  if (!payloadB64 || !sigB64) return null;

  const expected = createHmac("sha256", getSecret()).update(payloadB64).digest();
  const provided = b64urlDecode(sigB64);
  if (!provided || provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  const json = b64urlDecode(payloadB64);
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json.toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Partial<SessionPayload>;
  if (
    typeof p.uid !== "number" ||
    typeof p.email !== "string" ||
    typeof p.exp !== "number"
  ) {
    return null;
  }
  if (p.exp < Math.floor(Date.now() / 1000)) return null;
  return {
    uid: p.uid,
    email: p.email,
    name: p.name ?? null,
    exp: p.exp,
  };
}
