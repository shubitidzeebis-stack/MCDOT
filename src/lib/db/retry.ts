// Retry helper for transient Neon failures.
//
// Neon auto-suspends an idle compute. Waking it occasionally fails in the
// control plane rather than in Postgres — the query never reaches the
// database, so repeating it is safe. Neon marks exactly those errors with
// "neon:retryable": true in the response body:
//
//   NeonDbError: Server error (HTTP status 500): {"message":"Control plane
//   request failed", ... ,"neon:retryable":true}
//
// One of these took down /admin on 2026-08-10 (digest 3321014895): the
// admin auth guard runs a DB lookup on every request, so a single blip
// rendered the global error boundary instead of the dashboard.
//
// Deliberately NOT swallowed: if every attempt fails the error is rethrown.
// Callers in the auth path must fail closed — treating a DB outage as
// "lookup returned nothing" would hand out access the DB never confirmed.

// The driver surfaces this flag only inside the message string; the parsed
// `code`/`severity` fields come back undefined for control-plane errors.
const RETRYABLE_FLAG = /"neon:retryable"\s*:\s*true/;

// Connection-level failures that also happen before the query is applied.
const TRANSPORT_FAILURE = /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up/i;

export function isRetryableDbError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return RETRYABLE_FLAG.test(err.message) || TRANSPORT_FAILURE.test(err.message);
}

/**
 * Runs `work`, repeating it only for errors Neon flagged as retryable.
 * Anything else (bad SQL, constraint violation, auth failure) throws on the
 * first attempt so real bugs stay loud.
 */
export async function withDbRetry<T>(
  work: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work();
    } catch (err) {
      if (attempt >= attempts || !isRetryableDbError(err)) throw err;
      // 150ms then 300ms — a waking Neon compute is usually serving by the
      // second attempt, and the worst case adds under half a second to a
      // request that would otherwise have failed outright.
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }
  }
}
