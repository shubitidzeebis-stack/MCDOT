// Central place for company contact + brand details.
// Swap the placeholder values once the real numbers/email/domain are confirmed.
// Phone numbers should be E.164 (digits only, with country code) for tel: + WhatsApp.

export const SITE = {
  name: "Veritor Group",
  legalName: "Veritor Group LLC",
  tagline: "We buy US logistics LLCs.",

  // Contact
  phoneDisplay: "+1 (213) 789-6878",
  phoneTel: "+12137896878",
  whatsappTel: "12137896878",
  email: "info@groupveritor.com",
  emailFrom: "Veritor Group <info@groupveritor.com>",

  // Registered business address — used by CAN-SPAM (in commercial emails)
  // and CCPA (designated method of contact). Also feeds the LocalBusiness
  // schema so the site appears in Google's local results.
  address: {
    line1: "1918 Brownell Rd",
    line2: "—",
    city: "Dayton",
    state: "OH",
    zip: "45403",
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
    lastUpdated: "2026-05-03",
    // ^ bump this whenever you materially change SITE.address or
    //   anything in /privacy or /terms — the date is shown to users
    //   under "Effective date" on those pages.
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
// Returns a placeholder string if the address is still empty, so missing
// data is loud rather than silent. Cast to string because SITE is `as const`
// — TS narrows literal types and refuses === comparisons against "—" once
// the address is filled in.
export function formatAddressOneLine(): string {
  const a = SITE.address as {
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  if (a.line1 === "—") return "[Business address — to be filled in]";
  return [a.line1, a.line2 !== "—" ? a.line2 : null, `${a.city}, ${a.state} ${a.zip}`]
    .filter(Boolean)
    .join(", ");
}
