// Socrata SODA client for FMCSA bulk open datasets on data.transportation.gov.
//
// This is the DISCOVERY door (the QCMobile client in lib/fmcsa.ts can only look
// up a carrier you already know). All datasets are queried at
//   https://data.transportation.gov/resource/{id}.json?<SoQL params>
// with an optional app token (FMCSA_SOCRATA_TOKEN) sent as an X-App-Token
// HEADER (not a query param) — ~1,000 req/hr with a free token.
//
// IMPORTANT data gotchas (verified live 2026-06-06), enforced by callers:
//   - DOT numbers are zero-padded to 8 digits in InsHist + Carrier, but NOT in
//     Census. Always join via lpadDot(). See lpadDot().
//   - InsHist effective_date / cancl_effective_date are MM/DD/YYYY TEXT — never
//     $order/$where on them in Socrata (lexical != chronological). Pull per
//     docket and sort in JS.
//   - Census add_date is YYYYMMDD text — lexical order IS chronological, safe to
//     range-filter and $order on.

const SOCRATA_BASE = "https://data.transportation.gov/resource";

// Canonical, reachable dataset ids (deprecated federated views like AuthHist
// `wahn-z3rq` and L&I `jeyh-5nsj` return 403 — do not use them).
export const DATASETS = {
  census: "az4n-8mr2", // Company Census — discovery + contact info
  insHist: "6sqe-dvqs", // InsHist (terminated/superseded insurance filings)
  carrier: "6eyk-hxee", // Carrier (current authority status; no date fields)
} as const;

export type SoqlParams = {
  select?: string;
  where?: string;
  order?: string;
  limit?: number;
  offset?: number;
  /** Extra raw SoQL params, e.g. { "$group": "carrier_operation" }. */
  extra?: Record<string, string>;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Left-pad a DOT number to 8 digits for InsHist/Carrier joins. */
export function lpadDot(dot: string | number, len = 8): string {
  const digits = String(dot).replace(/[^0-9]/g, "");
  return digits.padStart(len, "0");
}

/**
 * fetch() with exponential backoff + jitter on 429 / 5xx / network errors,
 * honoring Retry-After. The existing fmcsa.ts fetchJson throws on the first
 * non-200, which would kill a multi-page sweep on the first throttle — this
 * does not. Returns the final Response (which the caller checks for .ok on
 * non-retryable statuses).
 */
export async function fetchWithBackoff(
  url: string,
  init: RequestInit = {},
  opts: { retries?: number; timeoutMs?: number; baseDelayMs?: number } = {},
): Promise<Response> {
  const { retries = 3, timeoutMs = 20_000, baseDelayMs = 600 } = opts;
  let attempt = 0;
  for (;;) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return res;
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < retries) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const delay =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs;
        await sleep(delay);
        attempt++;
        continue;
      }
      return res; // non-retryable — let the caller handle !res.ok
    } catch (err) {
      // AbortError / network failure — retry with backoff, then rethrow.
      if (attempt < retries) {
        await sleep(baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs);
        attempt++;
        continue;
      }
      throw err;
    }
  }
}

function buildUrl(dataset: string, params: SoqlParams): string {
  const qs = new URLSearchParams();
  if (params.select) qs.set("$select", params.select);
  if (params.where) qs.set("$where", params.where);
  if (params.order) qs.set("$order", params.order);
  if (params.limit != null) qs.set("$limit", String(params.limit));
  if (params.offset != null) qs.set("$offset", String(params.offset));
  if (params.extra) for (const [k, v] of Object.entries(params.extra)) qs.set(k, v);
  return `${SOCRATA_BASE}/${dataset}.json?${qs.toString()}`;
}

/** Run one SoQL query against a dataset. Returns [] on a non-OK response. */
export async function socrataQuery<T = Record<string, unknown>>(
  dataset: string,
  params: SoqlParams,
): Promise<T[]> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = process.env.FMCSA_SOCRATA_TOKEN;
  if (token) headers["X-App-Token"] = token;
  const res = await fetchWithBackoff(buildUrl(dataset, params), { headers });
  if (!res.ok) {
    console.error(`[socrata] ${dataset} ${res.status}`);
    return [];
  }
  return (await res.json()) as T[];
}

/**
 * Page through a dataset via keyset/offset until fewer than `pageSize` rows come
 * back or `maxRows` is reached. Caller supplies a stable $order (e.g.
 * "add_date ASC, dot_number ASC") so offset paging is consistent within a run.
 */
export async function socrataPaged<T = Record<string, unknown>>(
  dataset: string,
  params: SoqlParams,
  opts: { pageSize?: number; maxRows?: number } = {},
): Promise<T[]> {
  const { pageSize = 1000, maxRows = 50_000 } = opts;
  const out: T[] = [];
  let offset = params.offset ?? 0;
  for (;;) {
    const page = await socrataQuery<T>(dataset, { ...params, limit: pageSize, offset });
    out.push(...page);
    if (page.length < pageSize || out.length >= maxRows) break;
    offset += pageSize;
  }
  return out;
}
