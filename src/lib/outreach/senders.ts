// Multi-domain sender pool for cold outreach. Each outreach domain gets its
// own persona: a From header, a first-name signature the copy is written in,
// and a per-sender daily cap so a fresh domain can WARM UP (15 → 30 → 60 →
// 120/day) while the aged domain keeps full volume. Configured as a JSON
// string in Edge Config under `outreachSenders`, e.g.:
//
//   [{"from":"luka@acquisitiongroupveritor.com","name":"Luka","cap":120},
//    {"from":"Donald Slone <Donald@veritoracquisitions.com>","name":"Donald","cap":15}]
//
// An empty list means LEGACY MODE: env OUTREACH_EMAIL_FROM sends everything
// under the global `outreachDailyCap`, bodies sign "Luka" — byte-identical to
// the single-domain behavior, so deploying this code changes nothing until the
// config value is set.
//
// The queue stores only the lowercased ADDRESS (stable key); display name and
// cap are resolved from config at send time so a rename or cap bump never
// requires touching queued rows. Pure functions, no I/O.

export type OutreachSender = {
  /** Full From header as configured, e.g. `Donald Slone <donald@x.com>`. */
  from: string;
  /** Lowercased bare address — the stable identity key stored on queue rows. */
  address: string;
  /** First name the email body signs with ("I'm Donald with Veritor Group"). */
  name: string;
  /** Max sends per rolling 24h for THIS sender (warm-up throttle). */
  cap: number;
};

/** `"Donald Slone <Donald@x.com>"` → `"donald@x.com"`; bare addresses pass through. */
export function extractAddress(from: string): string {
  const m = /<([^<>\s]+@[^<>\s]+)>/.exec(from);
  return (m ? m[1] : from).trim().toLowerCase();
}

/** Parse the `outreachSenders` config JSON. Malformed input → [] (legacy mode). */
export function parseSenders(json: string): OutreachSender[] {
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return [];
    const out: OutreachSender[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const from = typeof o.from === "string" ? o.from.trim() : "";
      const name = typeof o.name === "string" ? o.name.trim() : "";
      const cap = Number(o.cap);
      const address = from ? extractAddress(from) : "";
      if (!from || !name || !address.includes("@")) continue;
      if (!Number.isFinite(cap) || cap < 1) continue;
      out.push({ from, address, name, cap: Math.min(500, Math.floor(cap)) });
    }
    return out;
  } catch {
    return [];
  }
}

// Deterministic cap-weighted pick: seq 0..(sumCaps-1) walks the cumulative cap
// ranges, so over any window drafts split proportionally to each sender's
// daily budget (cap 120 vs 15 → ~8:1). Callers pass an incrementing sequence
// (e.g. drafted-so-far counter); no randomness so runs are reproducible.
export function pickSender(
  senders: OutreachSender[],
  seq: number,
): OutreachSender | null {
  if (senders.length === 0) return null;
  const total = senders.reduce((s, x) => s + x.cap, 0);
  let slot = ((seq % total) + total) % total;
  for (const s of senders) {
    if (slot < s.cap) return s;
    slot -= s.cap;
  }
  return senders[senders.length - 1];
}

/** Resolve a queue row's stored address back to its configured sender. */
export function senderByAddress(
  senders: OutreachSender[],
  address: string | null,
): OutreachSender | null {
  if (!address) return null;
  const a = address.trim().toLowerCase();
  return senders.find((s) => s.address === a) ?? null;
}
