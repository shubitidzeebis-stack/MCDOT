// Hidden form field bots tend to fill in. Real users never see/touch it.
// Keep the field name innocuous-looking and indexable as `website`.
export const HONEYPOT_FIELD = "website";

export function isHoneypotFilled(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null) return false;
  const value = (raw as Record<string, unknown>)[HONEYPOT_FIELD];
  return typeof value === "string" && value.trim().length > 0;
}
