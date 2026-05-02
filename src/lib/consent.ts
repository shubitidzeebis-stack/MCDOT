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

export function readConsent(): ConsentState {
  if (typeof window === "undefined") return DEFAULT_CONSENT;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return DEFAULT_CONSENT;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (parsed.version !== CONSENT_VERSION) return DEFAULT_CONSENT;
    return {
      essential: true,
      analytics: !!parsed.analytics,
      advertising: !!parsed.advertising,
      decidedAt: parsed.decidedAt ?? null,
      version: CONSENT_VERSION,
    };
  } catch {
    return DEFAULT_CONSENT;
  }
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
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(final));
    // Broadcast so the rest of the app can react without re-mounting.
    window.dispatchEvent(new CustomEvent("veritor:consent", { detail: final }));
  }
  return final;
}

export function clearConsent() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("veritor:consent", { detail: DEFAULT_CONSENT }));
  }
}

export function hasDecided(c: ConsentState): boolean {
  return c.decidedAt !== null;
}
