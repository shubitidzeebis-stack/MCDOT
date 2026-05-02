// In-memory sliding-window rate limiter. Good enough for spam protection
// on a small site; on serverless this resets per-instance, which is fine
// because attackers don't get to pick the instance and reuse is high
// thanks to Fluid Compute. Swap for Upstash/Redis later if abuse grows.

const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; resetIn: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limit) {
    const oldest = hits[0];
    return { ok: false, resetIn: Math.max(0, windowMs - (now - oldest)) };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, resetIn: 0 };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
