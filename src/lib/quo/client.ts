// Thin server-side client for the Quo (formerly OpenPhone) REST API.
//
// QUO_API_KEY is server-only and must NEVER be exposed to the browser — it can
// read every recording and send SMS as the business. That is why the admin
// page streams audio through our own authenticated proxy instead of handing
// the browser a Quo URL: the key stays on the server and, as a bonus, the
// audio is same-origin so the strict CSP in next.config.ts needs no
// media-src widening.
//
// The base URL is overridable because the product was renamed mid-2026 and the
// api.openphone.com host is the one their signing header still refers to. If
// they retire it, set QUO_API_BASE rather than editing code.

const DEFAULT_BASE = "https://api.openphone.com/v1";

function apiKey(): string | null {
  return process.env.QUO_API_KEY || null;
}

function base(): string {
  return process.env.QUO_API_BASE || DEFAULT_BASE;
}

export function quoConfigured(): boolean {
  return Boolean(apiKey());
}

export async function quoFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const key = apiKey();
  if (!key) throw new Error("QUO_API_KEY is not set");
  return fetch(`${base()}${path}`, {
    ...init,
    headers: {
      Authorization: key,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
}

/**
 * Fetch a recording for proxying to an authenticated admin.
 *
 * Recording URLs delivered on the webhook are usually pre-signed and need no
 * credentials, but we send the key anyway when the host is Quo's own — a
 * harmless extra header on a pre-signed URL, and the difference between
 * working and 403 if they ever switch to bearer-auth media.
 */
export async function fetchRecording(url: string): Promise<Response> {
  const key = apiKey();
  const isQuoHost = /(^|\.)(openphone|quo)\.com$/i.test(new URL(url).hostname);
  return fetch(url, {
    headers: key && isQuoHost ? { Authorization: key } : {},
    signal: AbortSignal.timeout(30_000),
  });
}

/** Send an SMS from the business line. Phase 2 — needs 10DLC approval first. */
export async function sendMessage(params: {
  from: string;
  to: string;
  content: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await quoFetch("/messages", {
      method: "POST",
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        content: params.content,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Quo ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "failed" };
  }
}
