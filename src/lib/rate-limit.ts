import { neon } from "@neondatabase/serverless";

// Rate limiter. Primary store is Postgres (Neon) so counters are shared
// across every serverless instance — an attacker can't reset a window just
// by landing on a fresh instance. Falls back to a per-instance in-memory
// window when no DB is configured (local dev) or the DB call fails, so the
// request hot path never hard-errors on a limiter hiccup.
//
// Strategy: fixed-window counter. `now` is bucketed into windowMs slots and
// each slot is an atomic INSERT ... ON CONFLICT DO UPDATE +1 — one round
// trip, race-free. Trade-off vs a sliding window: a burst straddling a
// boundary can briefly allow up to ~2x the limit, which is fine for spam /
// brute-force deterrence.

type Sql = ReturnType<typeof neon>;
type Result = { ok: boolean; resetIn: number };

let sqlClient: Sql | null = null;
let tableReady = false;

function getSql(): Sql | null {
  if (sqlClient) return sqlClient;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  sqlClient = neon(url);
  return sqlClient;
}

async function ensureTable(sql: Sql): Promise<void> {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      bucket_key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS rate_limits_expires_idx ON rate_limits (expires_at)`;
  tableReady = true;
}

// ── In-memory fallback: per-instance sliding window ────────────────────
const buckets = new Map<string, number[]>();

function memoryRateLimit(key: string, limit: number, windowMs: number): Result {
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

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<Result> {
  const sql = getSql();
  if (!sql) return memoryRateLimit(key, limit, windowMs);

  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetIn = windowStart + windowMs - now;
  const bucketKey = `${key}:${windowStart}`;
  const expiresAt = new Date(windowStart + windowMs).toISOString();

  try {
    await ensureTable(sql);
    const rows = (await sql`
      INSERT INTO rate_limits (bucket_key, count, expires_at)
      VALUES (${bucketKey}, 1, ${expiresAt})
      ON CONFLICT (bucket_key)
      DO UPDATE SET count = rate_limits.count + 1
      RETURNING count
    `) as Array<{ count: number }>;
    const count = Number(rows[0]?.count ?? 1);

    // Opportunistic cleanup (~1% of calls) so expired buckets don't pile
    // up. Fire-and-forget — a failure here must never affect the caller.
    if (Math.random() < 0.01) {
      void sql`DELETE FROM rate_limits WHERE expires_at < now()`.catch(() => {});
    }

    if (count > limit) return { ok: false, resetIn };
    return { ok: true, resetIn: 0 };
  } catch (err) {
    console.error("[rate-limit] DB error — falling back to in-memory", err);
    return memoryRateLimit(key, limit, windowMs);
  }
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
