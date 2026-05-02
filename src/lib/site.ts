// Central place for company contact + brand details.
// Swap the placeholder values once the real numbers/email/domain are confirmed.
// Phone numbers should be E.164 (digits only, with country code) for tel: + WhatsApp.

export const SITE = {
  name: "Veritor Group",
  legalName: "Veritor Group LLC",
  tagline: "We buy US logistics LLCs.",

  // Contact — REPLACE phone + WhatsApp once you have them.
  phoneDisplay: "+1 (555) 010-2030",
  phoneTel: "+15550102030",
  whatsappTel: "15550102030",
  email: "info@groupveritor.com",
  emailFrom: "Veritor Group <info@groupveritor.com>",

  // Address (US LLC) — REPLACE before launch.
  // Required by CAN-SPAM (in commercial emails) and CCPA (designated method of contact).
  address: {
    line1: "—",
    line2: "—",
    city: "—",
    state: "—",
    zip: "—",
    country: "USA",
  },

  // Social — REPLACE / remove as needed
  instagram: "https://www.instagram.com/groupveritor",
  linkedin: "https://www.linkedin.com/company/groupveritor",

  // Trust numbers (kept conservative/defensible for ad copy)
  trust: {
    acquisitionsCompleted: "40+",
    averageCloseDays: "Under 2 weeks",
    yearsActive: "5+",
  },

  // Legal config — REVIEW WITH ATTORNEY before launch.
  legal: {
    // Hard-coded so the "Last updated" date doesn't change on every deploy.
    // Bump this manually whenever you materially update the privacy or terms.
    lastUpdated: "2026-05-02",
    // Governing state for Terms of Use. Must match the state where the LLC
    // is registered. Update once finalized.
    governingState: "Delaware",
    // Privacy contact — typically the same as `email` but can be a dedicated
    // privacy@ alias if preferred.
    privacyEmail: "info@groupveritor.com",
  },
} as const;

export type Site = typeof SITE;

// Single-line address for use in legal-doc footers, CAN-SPAM blocks, etc.
// Returns "—" if the address is still placeholder, so missing data is loud
// rather than silent.
export function formatAddressOneLine(): string {
  const a = SITE.address;
  if (a.line1 === "—") return "[Business address — to be filled in]";
  return [a.line1, a.line2 !== "—" ? a.line2 : null, `${a.city}, ${a.state} ${a.zip}`]
    .filter(Boolean)
    .join(", ");
}
