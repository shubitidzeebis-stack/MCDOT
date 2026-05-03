// Cookie + tracking consent state. Stored client-side in localStorage
// under a single JSON object. Three categories:
//
//   essential    — strictly necessary; always on, can't be turned off
//                  (load balancing, security, form submission, session)
//   analytics    — privacy-respecting analytics (Vercel Analytics)
//                  + future product analytics
//   advertising  — Google Ads conversion tag, Meta Pixel, retargeting
//
// Consent is required before we load anything in the analytics or
// advertising categories. Essential is implicit — by using the site
// you accept it (consistent with EU/CCPA "strictly necessary" carve-out).
//
// IMPORTANT: readConsent() MUST be identity-stable for unchanged state.
// useSyncExternalStore in CookieBanner subscribes to it; if the function
// returns a new object every call, React detects "change," re-renders,
// and we get an infinite loop. Cache the most-recent parsed result
// keyed by the raw localStorage string.

export type ConsentCategory = "essential" | "analytics" | "advertising";

export type ConsentState = {
  essential: true; // always on
  analytics: boolean;
  advertising: boolean;
  // ISO timestamp of when the user last set consent (for our own audit log)
  decidedAt: string | null;
  // Bumped when we materially change the categories — forces re-prompt.
  version: number;
};

export const CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = "veritor.consent";

export const DEFAULT_CONSENT: ConsentState = {
  essential: true,
  analytics: false,
  advertising: false,
  decidedAt: null,
  version: CONSENT_VERSION,
};

// Memoization cache. We key on the raw localStorage string; if the
// raw string hasn't changed since last call, return the same object
// reference so React's useSyncExternalStore stays stable.
let cachedRaw: string | null | undefined; // `undefined` means "never read"
let cachedParsed: ConsentState = DEFAULT_CONSENT;

export function readConsent(): ConsentState {
  if (typeof window === "undefined") return DEFAULT_CONSENT;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return DEFAULT_CONSENT;
  }
  if (raw === cachedRaw) return cachedParsed;
  cachedRaw = raw;
  if (!raw) {
    cachedParsed = DEFAULT_CONSENT;
    return cachedParsed;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (parsed.version !== CONSENT_VERSION) {
      cachedParsed = DEFAULT_CONSENT;
      return cachedParsed;
    }
    cachedParsed = {
      essential: true,
      analytics: !!parsed.analytics,
      advertising: !!parsed.advertising,
      decidedAt: parsed.decidedAt ?? null,
      version: CONSENT_VERSION,
    };
  } catch {
    cachedParsed = DEFAULT_CONSENT;
  }
  return cachedParsed;
}

export function writeConsent(next: Omit<ConsentState, "essential" | "version" | "decidedAt">): ConsentState {
  const final: ConsentState = {
    essential: true,
    analytics: !!next.analytics,
    advertising: !!next.advertising,
    decidedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  if (typeof window !== "undefined") {
    const raw = JSON.stringify(final);
    window.localStorage.setItem(CONSENT_STORAGE_KEY, raw);
    // Update cache eagerly so the next readConsent() — fired by the
    // dispatchEvent handler below — returns the same object reference
    // on first read.
    cachedRaw = raw;
    cachedParsed = final;
    window.dispatchEvent(new CustomEvent("veritor:consent", { detail: final }));
  }
  return final;
}

export function clearConsent() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    cachedRaw = null;
    cachedParsed = DEFAULT_CONSENT;
    window.dispatchEvent(new CustomEvent("veritor:consent", { detail: DEFAULT_CONSENT }));
  }
}

export function hasDecided(c: ConsentState): boolean {
  return c.decidedAt !== null;
}
