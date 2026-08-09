import { SITE } from "@/lib/site";

// Per-user "send as" identity for the admin panel's lead composer.
//
// By default every admin-panel email leaves as SITE.emailFrom (the shared
// info@ inbox). An admin_users row can carry a `send_as` mailbox so a named
// person's lead email arrives from their own address instead — the seller
// sees a human, and replies land in that person's mailbox rather than the
// shared one.
//
// The DOMAIN ALLOWLIST below is not decoration — it is the whole security
// boundary around that feature, for two independent reasons:
//
//   1. Deliverability. Resend will only sign mail for domains verified in
//      the account (SPF/DKIM/DMARC records published). Hand it a From on an
//      unverified domain and the send is either rejected outright or — the
//      worse case — accepted and then silently binned by the recipient's
//      provider for failing DMARC. A follow-up that never lands looks
//      exactly like a lead who went quiet, so the failure is invisible until
//      the deal is already cold.
//   2. Spoofing. `send_as` is data in a DB column. An unvalidated,
//      user-controlled From means anyone who can write that column can send
//      mail as ANY address on earth, through our Resend account, burning our
//      sending reputation and impersonating whoever they like. Pinning it to
//      a fixed list of domains we actually own keeps the blast radius inside
//      the company.
//
// Add a domain here ONLY after it is verified in the Resend dashboard.
// (The cold-outreach personas on the acquisition domains are a different
// pipeline entirely — see lib/outreach/senders.ts. This list governs the
// admin panel only.)
export const SEND_AS_DOMAINS: readonly string[] = ["groupveritor.com"];

/** Human-readable allowlist for error messages shown to a full admin. */
export const SEND_AS_DOMAINS_LABEL = SEND_AS_DOMAINS.join(", ");

// Same shape check the send route applies to recipients. Deliberately loose:
// the allowlist below is what actually constrains the value.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailShaped(address: string): boolean {
  return EMAIL_RE.test(address.trim());
}

/**
 * Normalize a candidate send-as mailbox. Returns the lowercased bare address
 * when it is well-formed AND on a Resend-verified domain, otherwise null.
 *
 * Callers must treat null as a hard "no": reject the write on the admin side,
 * fall back to SITE.emailFrom on the send side. Never "use it anyway".
 */
export function normalizeSendAs(raw: string): string | null {
  const address = raw.trim().toLowerCase();
  if (!isEmailShaped(address)) return null;
  const domain = address.slice(address.lastIndexOf("@") + 1);
  return SEND_AS_DOMAINS.includes(domain) ? address : null;
}

// A display name goes into the From header verbatim. Strip CR/LF (header
// injection) plus the characters that would break the `Name <addr>` phrase
// out of its quoting — an unbalanced `<` or a stray comma turns one header
// into two recipients as far as some MTAs are concerned.
function sanitizeDisplayName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .replace(/[\r\n]+/g, " ")
    .replace(/["<>,;:\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
}

/** The verified send-as address for a user, or null to use the shared inbox. */
export function resolveSendAs(sendAs: string | null | undefined): string | null {
  if (!sendAs) return null;
  return normalizeSendAs(sendAs);
}

/**
 * Full RFC-5322 From header for a send. Falls back to the shared company
 * From whenever the user has no send-as set, or has one that no longer
 * passes the allowlist (e.g. a domain was removed from Resend).
 */
export function resolveFromHeader(
  sendAs: string | null | undefined,
  displayName: string | null | undefined,
): string {
  const address = resolveSendAs(sendAs);
  if (!address) return SITE.emailFrom;
  const name = sanitizeDisplayName(displayName);
  return name ? `${name} <${address}>` : address;
}

/** Bare address a send will originate from — for UI copy, not headers. */
export function resolveFromAddress(sendAs: string | null | undefined): string {
  return resolveSendAs(sendAs) ?? SITE.email;
}
