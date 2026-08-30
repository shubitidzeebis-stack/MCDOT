// Central place for company contact + brand details.
// Swap the placeholder values once the real numbers/email/domain are confirmed.
// Phone numbers should be E.164 (digits only, with country code) for tel: + WhatsApp.

export const SITE = {
  name: "Veritor Group",
  legalName: "Veritor Group LLC",
  tagline: "Sell your US trucking company. Closed in 3–5 business days.",

  // Contact
  phoneDisplay: "+1 (326) 222-5444",
  phoneTel: "+13262225444",
  whatsappTel: "13264670388",
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

  // Trust numbers — every value here must survive a due-diligence call and
  // a public-records check. 2026-08-30: the unverifiable "400+ sales /
  // 5+ years" claims were removed sitewide (the entity's own filings date it
  // to May 2026 — see /verification) and replaced with numbers the
  // production database actually backs. Update companiesSold as deals close.
  trust: {
    // Completed valuations delivered per month (DB: 150-170/mo, Aug 2026).
    valuationsMonthly: "150+",
    averageCloseDays: "3–5 business days",
    // Documented closed sales since June 2026 — matches /admin closed_won.
    companiesSold: "10+",
    // The seller keeps the full accepted price — no fees, no commissions.
    sellerKeeps: "100%",
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

// Fallback Open Graph card, rendered by src/app/opengraph-image.tsx.
// Next resolves `openGraph` by replacement, not by merge: the moment a page
// declares its own `openGraph` block it drops everything the layout set,
// images included. So this is spread into the (en)/(es)/(ru) layouts *and*
// into every page that overrides `openGraph` without shipping its own
// opengraph-image.tsx. Pages that do ship one must NOT set it — an explicit
// `images` key makes Next skip the file-based image.
// `twitter.images` is left alone on purpose: Next auto-fills it from the
// resolved openGraph images when twitter doesn't declare its own.
export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Veritor Group — Sell your trucking company. Closed in 3–5 business days.",
};

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
