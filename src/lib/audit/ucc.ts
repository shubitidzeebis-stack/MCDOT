// audit/ucc.ts — per-state Secretary-of-State UCC handoff helper.
//
// The safety team checks UCC liens MANUALLY at the state SoS. This module does
// NOT scrape or query any SoS — it just hands the team (1) the correct
// debtor-search page for the carrier's state and (2) a ready-to-paste debtor
// name, then lets them paste their findings back in for a coarse rating.
//
// linkType meanings (UccLinkType from monitor/types):
//   'landing' = free public page where the team types the debtor name (most states).
//   'login'   = subscription / account / paid-search wall before you can search
//               (e.g. TX SOSDirect, GA GSCCCA, NJ, MN, NV ORION, KS, MD).
//   'query'   = page genuinely accepts a debtor name via a URL GET param. This is
//               RARE: virtually every SoS UCC search is an SPA or a POST form, so
//               NOTHING here is marked 'query'. We verified this rather than
//               assuming a guessable querystring (a wrong deep link wastes the
//               team's time worse than landing them on the search box).
//
// URLs verified via the official SoS / state UCC portals (June 2026). Where a
// state routes UCC search through a generic info hub or a vendor, the `url`
// points at the closest official name-entry surface and `notes` carries the
// nuance. Anything we could not pin to an official name-entry page is flagged in
// `notes` as "best-effort"; the Google fallback in buildUccHandoff covers any
// state not in the table at all.

import type {
  UccPortal,
  UccHandoff,
  UccRating,
  UccFindings,
  UccLinkType,
} from "@/lib/monitor/types";

// ---------------------------------------------------------------------------
// State UCC portal table. key = 2-letter UPPERCASE state code.
// ---------------------------------------------------------------------------
export const STATE_UCC_PORTALS: Record<string, UccPortal> = {
  // ----- Top trucking states (verified first / highest priority) -----------
  TX: {
    url: "https://www.sos.state.tx.us/ucc/index.shtml",
    linkType: "login",
    notes:
      "Texas SOS Portal / SOSDirect. UCC debtor search requires an SOS Portal account (paid per-search). Start at the UCC hub, then Search and Orders. Paper filings ended 2025-08-29; search is online-only.",
  },
  CA: {
    url: "https://bizfileonline.sos.ca.gov/search/ucc",
    linkType: "landing",
    notes:
      "California bizfile Online UCC search — free public. Search by Debtor name (min 3 chars); use Advanced Search 'starts with' for org names.",
  },
  FL: {
    url: "https://www.floridaucc.com/uccweb/search.aspx",
    linkType: "landing",
    notes:
      "Florida Secured Transaction Registry (FloridaUCC, the DoS vendor) — free. Defaults to 'Compact Name' search logic; an 'Actual Name' option also exists. clipboardName is FL-compacted (see notes when applied).",
  },
  IL: {
    url: "https://apps.ilsos.gov/uccsearch/",
    linkType: "landing",
    notes:
      "Illinois SoS UCC search — free public index (UCC + Federal Tax Lien). Search by organization name; images require a UCC-11 request.",
  },
  GA: {
    url: "https://search.gsccca.org/UCC_Search/",
    linkType: "login",
    notes:
      "Georgia GSCCCA (Superior Court Clerks' Cooperative Authority) — statewide UCC index. Full search is subscription/login; some limited free name browsing exists.",
  },
  OH: {
    url: "https://ucc.ohiosos.gov/search",
    linkType: "landing",
    notes:
      "Ohio SoS UCC Filing Portal — free search of filings (incl. images) by debtor name, secured party, or financing-statement number.",
  },
  PA: {
    url: "https://file.dos.pa.gov/search/ucc",
    linkType: "landing",
    notes:
      "Pennsylvania DoS (Bureau of Corporations) UCC search — free, uncertified. Use the EXACT full debtor name; do not abbreviate. Certified UCC11 is a paid order.",
  },
  NJ: {
    url: "https://www.njportal.com/ucc/",
    linkType: "login",
    notes:
      "New Jersey DORES UCC application. Treated as login: it is an account/app-based portal (PMS account for frequent users). Non-certified search is free; certified search is $30.",
  },
  NC: {
    url: "https://www.sosnc.gov/online_services/search/by_title/_uniform_commercial_code",
    linkType: "landing",
    notes:
      "North Carolina SoS UCC search — free. Standard RA9 = exact match, drops noise words (Corp/Inc/LLC). Use Non-standard logic ('starting with'/'all words') for variations. No scripted/automated searches.",
  },
  TN: {
    url: "https://tncab.tnsos.gov/ucc-debtor-search",
    linkType: "landing",
    notes:
      "Tennessee SoS UCC Debtor Search — free. Search by Organization Name or by debtor surname/first name; document-number search also available.",
  },
  IN: {
    url: "https://bsd.sos.in.gov/PublicUCCSearch",
    linkType: "landing",
    notes:
      "Indiana INBiz public UCC search — free name/keyword search. Filing images cost $20. Include name variations to catch all filings.",
  },
  MI: {
    url: "https://ucc.michigan.gov/ucc-search",
    linkType: "landing",
    notes:
      "Michigan UCC Customer Portal 'Debtor name quick search' — free online view (LARA). Choose 'All' (incl. lapsed for 1yr) vs 'Unlapsed'. UCC-11 search reports are paid.",
  },
  AZ: {
    url: "https://apps.azsos.gov/apps/ucc/search/",
    linkType: "landing",
    notes:
      "Arizona SoS UCC search — free. Search by debtor name, secured party, or 12-digit filing number. Results watermarked 'uncertified'.",
  },
  NY: {
    url: "https://appext20.dos.ny.gov/pls/ucc_public/web_search_help.debtor_help",
    linkType: "landing",
    notes:
      "New York DoS UCC Public Inquiry System — free debtor/secured-party search (Article 9 + Federal Tax Liens). Link is the official debtor-search help/entry; pick the 'begins with' or 'word' search and enter the exact legal name.",
  },
  WA: {
    url: "https://fortress.wa.gov/dol/ucc/",
    linkType: "landing",
    notes:
      "Washington DOL UCC online search — free to view results. Use 'Browse Names' for nonstandard/variation lookups; copies/UCC-11 are paid.",
  },
  NV: {
    url: "https://esos.nv.gov/HelpFiles/UCCSearch.html",
    linkType: "login",
    notes:
      "Nevada SoS UCC search now runs on the ORION platform (projectorion.nv.gov) and requires a login (same credentials as the old SilverFlume). UCC-11 search-and-copy is an account-gated request; link is the SoS UCC search help page.",
  },
  MO: {
    url: "https://www.sos.mo.gov/ucc",
    linkType: "login",
    notes:
      "Missouri SoS UCC — viewing the UCC-1 database is free, but the online File/Search system requires a (free) corporate e-account to run a debtor search. Treated as login due to the account wall; paper copies are paid.",
  },
  WI: {
    url: "https://wims.dfi.wi.gov/uccsearch",
    linkType: "landing",
    notes:
      "Wisconsin DFI free UCC search — accessible without logging in from the home page. Pick Individual vs Organization, search by debtor name or filing number. Certified UCC-11 is paid.",
  },
  MN: {
    url: "https://mblsportal.sos.mn.gov/Secured/SearchUCC",
    linkType: "login",
    notes:
      "Minnesota SoS Business & Liens Online (MBLS). Debtor-name look-ups require an account and a purchased subscription (per-lookup). Standard/certified search reports are paid.",
  },
  VA: {
    url: "https://cis.scc.virginia.gov/UCCOnlineSearch/UCCSearch",
    linkType: "landing",
    notes:
      "Virginia SCC Clerk's Information System (CIS) UCC search — free. Search by Debtor Name with Starts With / Exact / Contains; covers filings since 2003-10-01.",
  },

  // ----- Remaining states + DC (best-effort; many verified to a direct app) -
  AL: {
    url: "https://www.sos.alabama.gov/government-records/ucc-records",
    linkType: "landing",
    notes:
      "Alabama SoS UCC records hub. Best-effort: official UCC page; follow the online search link to the debtor name-entry form.",
  },
  AK: {
    url: "https://dnr.alaska.gov/ssd/recoff/ucc",
    linkType: "landing",
    notes:
      "Alaska files UCC at the DNR Recorder's Office (UCC Central File), not a 'Secretary of State'. Free public name search; use the debtor's exact legal name. Note: the central index excludes district-level filings.",
  },
  AR: {
    url: "https://portal.arkansas.gov/service/ar-ucc-search/",
    linkType: "landing",
    notes:
      "Arkansas SoS UCC search via the state portal. Best-effort: this is the official service entry; it routes to the SoS UCC name-search.",
  },
  CO: {
    url: "https://www.coloradosos.gov/ucc/pages/search/standardSearch.xhtml",
    linkType: "landing",
    notes:
      "Colorado SoS UCC Standard Search — free (search reports, copies, and certified records are free in CO). Use Advanced Search for secured-party/doc-number.",
  },
  CT: {
    url: "https://portal.ct.gov/SOTS/Business-Services/BSD",
    linkType: "landing",
    notes:
      "Connecticut SoS Business Services hub. Best-effort: navigate to the CONCORD/UCC search; verify the direct UCC name-search URL before relying on a deep link.",
  },
  DE: {
    url: "https://corp.delaware.gov/uccsearch/",
    linkType: "login",
    notes:
      "Delaware Division of Corporations UCC search. Best-effort/login: DE UCC searches are typically fee-based (per-search) and may require account/ordering rather than a free name-entry page.",
  },
  HI: {
    url: "https://portal.ehawaii.gov/home/online-services/uniform-commercial-code-recording-system/",
    linkType: "login",
    notes:
      "Hawaii UCC Recording System via eHawaii portal. Best-effort/login: full search/copies are typically account/fee-gated through the eHawaii services portal.",
  },
  ID: {
    url: "https://sos.idaho.gov/uniform-commercial-code/",
    linkType: "landing",
    notes:
      "Idaho SoS UCC hub. Best-effort: follow the online UCC search link to the debtor name-entry form.",
  },
  IA: {
    url: "https://sos.iowa.gov/search/UCCsearch.html",
    linkType: "landing",
    notes:
      "Iowa SoS UCC search — free public debtor search. Best-effort: confirm the current Fast Track UCC search URL if redirected.",
  },
  KS: {
    url: "https://sos.ks.gov/general-services/ucc-filing-information.html",
    linkType: "login",
    notes:
      "Kansas SoS UCC. Login/paid: online UCC-11 debtor search costs ~$10 and requires a subscription/account to file and search online.",
  },
  KY: {
    url: "https://web.sos.ky.gov/ftucc/search.aspx",
    linkType: "landing",
    notes:
      "Kentucky SoS FastTrack UCC search — free, 24/7. Standard (full-name) and Non-standard (% wildcard) searches. Free results are uncertified.",
  },
  LA: {
    url: "https://www.sos.la.gov/BusinessServices/UniformCommercialCode/Pages/default.aspx",
    linkType: "login",
    notes:
      "Louisiana SoS UCC. Best-effort/login: LA UCC searches are commonly fee/account-based; start at the UCC hub and follow to the online search/order.",
  },
  ME: {
    url: "https://www.maine.gov/sos/cec/ucc/index.html",
    linkType: "landing",
    notes:
      "Maine SoS UCC hub (Corporations, Elections & Commissions). Best-effort: follow the online UCC search link to the debtor name-entry form.",
  },
  MD: {
    url: "https://egov.maryland.gov/SDAT/UCCFiling/UCCMainPage.aspx",
    linkType: "login",
    notes:
      "Maryland SDAT UCC. Best-effort/login: Maryland UCC search/copies are typically fee-based through the egov SDAT UCC system.",
  },
  MA: {
    url: "https://www.sec.state.ma.us/cor/corpweb/corucc/uccmain.htm",
    linkType: "landing",
    notes:
      "Massachusetts Secretary of the Commonwealth UCC search. Best-effort: official corpweb UCC entry; search by debtor name.",
  },
  MS: {
    url: "https://www.sos.ms.gov/business-services/ucc-search",
    linkType: "landing",
    notes:
      "Mississippi SoS UCC search. Best-effort: official UCC search page; routes to the debtor name-search portal.",
  },
  MT: {
    url: "https://biz.sosmt.gov/search/ucc",
    linkType: "login",
    notes:
      "Montana SoS UCC search (biz.sosmt.gov/search/ucc) — search debtor names and view filing chains, but downloading debtor search certificates/images is Subscription (flat monthly) or Non-Subscription (per-certificate) paid. Treated as login due to the pay/account wall for results.",
  },
  NE: {
    url: "https://sos.nebraska.gov/business-services/uccefs-search-and-filing-center",
    linkType: "landing",
    notes:
      "Nebraska SoS UCC EFS Search & Filing Center. Best-effort: follow to the online debtor name-search.",
  },
  NH: {
    url: "https://sos.nh.gov/corporation-ucc-securities/ucc/uniform-commercial-code-ucc/",
    linkType: "landing",
    notes:
      "New Hampshire SoS UCC hub. Best-effort: follow the online UCC search link to the debtor name-entry form.",
  },
  NM: {
    url: "https://www.sos.state.nm.us/commercial-services/ucc-filings/ucc-searches/",
    linkType: "landing",
    notes:
      "New Mexico SoS UCC searches page. Best-effort: follow to the online debtor name-search.",
  },
  ND: {
    url: "https://cis.sos.nd.gov/UCCPublicSearch",
    linkType: "landing",
    notes:
      "North Dakota Central Indexing System (NDCIS) Public Search — no login needed for uncertified results; search by debtor name or filing number. (The FirstStop/NDLogin path is for certified search.)",
  },
  OK: {
    url: "https://www.okcc.online/",
    linkType: "landing",
    notes:
      "Oklahoma central UCC filing is at the OKLAHOMA COUNTY CLERK (statewide central filing office), not the SoS. OKCC.online UCC search is free. Note: Oklahoma is the unusual county-clerk-central state.",
  },
  OR: {
    url: "https://secure.sos.state.or.us/ucc/searchHome.action",
    linkType: "landing",
    notes:
      "Oregon SoS UCC search — free. Use the Expanded UCC Information Search first to confirm the exact debtor name, then run the standard search.",
  },
  RI: {
    url: "https://business.sos.ri.gov/corpweb/uccsearch/uccsearch.aspx",
    linkType: "landing",
    notes:
      "Rhode Island SoS UCC Public Search (corpweb) — free debtor name search.",
  },
  SC: {
    url: "https://sos.sc.gov/online-filings/uniform-commercial-code/ucc-file-and-search-online",
    linkType: "landing",
    notes:
      "South Carolina SoS UCC Electronic Filing, Search & Retrieval. Best-effort: follow to the online debtor search; certified results are a paid request.",
  },
  SD: {
    url: "https://sosenterprise.sd.gov/ucc/",
    linkType: "login",
    notes:
      "South Dakota SoS UCC (sosenterprise.sd.gov/ucc/). Login/subscription: online searches are by subscription or ordered through the SoS office. Provide one exact full debtor name; choose all-records (incl. lapsed) vs unlapsed.",
  },
  UT: {
    url: "https://corporations.utah.gov/searches/",
    linkType: "landing",
    notes:
      "Utah Division of Corporations (Dept. of Commerce — UT has no Secretary of State) UCC/CFS search — free. Use Standard search for debtor name; choose 'File or Search UCC or CFS'.",
  },
  VT: {
    url: "https://sos.vermont.gov/corporations/ucc-lien-services/",
    linkType: "landing",
    notes:
      "Vermont SoS UCC / Lien Services hub. Best-effort: follow the online UCC search link to the debtor name-entry form.",
  },
  WV: {
    url: "https://apps.wv.gov/SOS/UCC/",
    linkType: "landing",
    notes:
      "West Virginia SoS UCC online search (apps.wv.gov). Best-effort: official UCC app; search by debtor name.",
  },
  WY: {
    url: "https://ucc.wyo.gov/",
    linkType: "landing",
    notes:
      "Wyoming SoS UCC E-System (ucc.wyo.gov) — online official search is free; search by debtor name or filing ID. A Login exists for e-filing, but searching is public. Real-estate-related liens are filed at the county clerk.",
  },
  DC: {
    url: "https://washington.dc.publicsearch.us/",
    linkType: "login",
    notes:
      "District of Columbia files UCCs at the RECORDER OF DEEDS (not a SoS). Public search (washington.dc.publicsearch.us) requires a registered account/subscriber login; viewing is free, downloads are paid. Best-effort.",
  },
};

// ---------------------------------------------------------------------------
// Local helpers (in-file only).
// ---------------------------------------------------------------------------

// Normalize a raw state value to a 2-letter UPPERCASE code, or null.
function normalizeState(state: string | null): string | null {
  if (!state) return null;
  const code = state.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

// FloridaUCC name compaction PER THE TASK SPEC (note: this is intentionally the
// spec's prescriptive token map, which EXPANDS abbreviations — it is NOT the
// real FloridaUCC "compact name" logic, which strips suffixes. We implement the
// spec exactly). Whole-token replacement only, so we never corrupt substrings
// (e.g. naive replace would turn CORPORATION -> CORPORATIONORATION).
const FL_TOKEN_MAP: Record<string, string> = {
  CO: "COMPANY",
  CORP: "CORPORATION",
  INC: "INCORPORATED",
  LTD: "LIMITED",
};

function compactNameFL(name: string): string {
  return name
    .toUpperCase()
    // strip punctuation first so "Inc." -> "INC" -> INCORPORATED cleanly.
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((token) => FL_TOKEN_MAP[token] ?? token)
    .join(" ")
    .trim();
}

// Blanket-lien collateral signals → treat small-count liens as red.
const BLANKET_COLLATERAL = [
  "all assets",
  "all personal property",
  "all of the debtor",
  "all of debtor",
  "all property",
  "all goods",
  "blanket",
];

function looksLikeBlanket(collateral: string | null | undefined): boolean {
  if (!collateral) return false;
  const c = collateral.toLowerCase();
  return BLANKET_COLLATERAL.some((kw) => c.includes(kw));
}

// ---------------------------------------------------------------------------
// buildUccHandoff — pick the right page + ready-to-paste debtor name.
// ---------------------------------------------------------------------------
export function buildUccHandoff(input: {
  legalName: string | null;
  dbaName?: string | null;
  state: string | null;
}): UccHandoff {
  const { legalName, dbaName, state } = input;
  const code = normalizeState(state);

  // Debtor name to paste: legalName, else dbaName, else empty.
  const baseName = (legalName ?? dbaName ?? "").trim();

  let searchUrl: string;
  let linkType: UccLinkType;
  let notes: string;

  const portal = code ? STATE_UCC_PORTALS[code] : undefined;

  if (portal) {
    searchUrl = portal.url;
    linkType = portal.linkType;
    notes = portal.notes;
  } else {
    // Google fallback (spec-exact expression). state is lowercased back into the
    // site: filter; quotes wrap the legal name. linkType is 'landing'.
    const lower = (state ?? "").toLowerCase();
    searchUrl =
      "https://www.google.com/search?q=" +
      encodeURIComponent(
        `site:sos.${lower}.gov UCC search "${legalName ?? ""}"`,
      );
    linkType = "landing";
    notes = code
      ? `No verified SoS UCC portal on file for ${code}. FALLBACK: this is a Google site: search of the state's SoS domain — confirm you land on the official UCC debtor-search page before searching.`
      : "No state provided (or unrecognized state code). FALLBACK: generic Google site: search — the team must locate and confirm the correct state's official UCC debtor-search page manually.";
  }

  // clipboardName: FL-style compaction ONLY for Florida; document when applied.
  let clipboardName = baseName;
  if (code === "FL" && baseName.length > 0) {
    const compacted = compactNameFL(baseName);
    if (compacted !== baseName) {
      clipboardName = compacted;
      notes +=
        " | clipboardName was FL-compacted per spec (uppercased, punctuation stripped, tokens CO/CORP/INC/LTD expanded to COMPANY/CORPORATION/INCORPORATED/LIMITED). If the FloridaUCC search returns nothing, also try the raw/Actual-Name form.";
    } else {
      clipboardName = compacted; // still uppercased/cleaned even if no token swap
    }
  }

  return { searchUrl, linkType, notes, clipboardName };
}

// ---------------------------------------------------------------------------
// deriveUccRating — coarse, documented, team-overridable.
// ---------------------------------------------------------------------------
//  - null findings                              -> 'unknown'
//  - no liens                                   -> 'green'
//  - liens, count > 2                            -> 'red'   (many liens)
//  - liens, count <= 2 (or unknown) + blanket    -> 'red'   (blanket collateral)
//  - liens, count <= 2 (or unknown), equipment   -> 'amber' (normal equip/vehicle financing)
//  - liens, count <= 2 (or unknown), collateral
//    unknown                                    -> 'amber' (default; flagged for review)
// The safety team can always override.
export function deriveUccRating(findings: UccFindings | null): UccRating {
  if (findings === null) return "unknown";
  if (!findings.liensFound) return "green";

  const count = findings.lienCount;

  // Many liens => red regardless of collateral.
  if (typeof count === "number" && count > 2) return "red";

  // Few or unknown count: blanket collateral pushes to red.
  if (looksLikeBlanket(findings.collateral)) return "red";

  // Otherwise (incl. count <= 2, undefined/null count, or unknown collateral):
  // default to amber. Most single small liens are equipment/vehicle financing;
  // unknown-collateral small-count is intentionally amber, not red, so it gets a
  // human look rather than an auto-reject. Team overrides as needed.
  return "amber";
}
