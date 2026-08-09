// Reverse carrier lookup: find a carrier from a CONTACT detail — an email
// address or a phone number — instead of an MC/DOT number.
//
// The QCMobile client (lib/fmcsa.ts) can only answer "who is MC 123456?"; it
// has no contact index. The FMCSA Company Census (DATASETS.census) does: the
// MCS-150 filing contact is stored in queryable columns, so an inbound email
// from an address we don't recognise, or a missed call from an unknown number,
// can be resolved back to a DOT and pushed through the normal audit engine.
//
// IMPORTANT UX caveat, and the reason this returns a LIST rather than one
// carrier: the Census contact is the MCS-150 FILING contact, not necessarily
// the owner. It is very often a dispatcher, an insurance agent, or a
// compliance-filing service, so one phone number or one inbox legitimately
// fronts many unrelated carriers. Callers MUST disambiguate with a human
// picker rather than auto-selecting the first row — auto-picking would audit
// (and potentially cold-contact) the wrong company, and running an audit per
// match would multiply live SAFER/QCMobile calls against a daily quota.
//
// Verified data gotchas (live 2026-08-09), enforced below:
//   - `phone` / `cell_phone` are stored as BARE 10-digit strings — no
//     punctuation, no country code. Anything a human types has to be reduced
//     to that shape or the equality test silently misses.
//   - A carrier's number can sit in EITHER column, so phone search must test
//     both.
//   - `email_address` is mixed case and often junk (blank, or values like
//     "MSPROUT" that aren't addresses at all). Match with SoQL upper() on both
//     sides, and never assume the stored value is a real address.
//   - `docket1` IS the MC number when `docket1prefix` = 'MC', so the picker can
//     show MC numbers with no extra QCMobile round trip. Other prefixes exist
//     (FF, MX) and must not be relabelled as MC.
//   - `dot_number` is UNPADDED in Census — keep it that way; callers lpadDot()
//     before joining to InsHist/Carrier.
//   - `add_date` is YYYYMMDD TEXT, so lexical DESC IS newest-first. Newest
//     authorities sort first because those are the acquisition targets.
//
// SoQL INJECTION: the searched value is interpolated into a `$where` string and
// Socrata SODA has no parameter binding, so escaping is our job. Phone is safe
// by construction (digits only after normalisation). Email is NOT, so it has to
// clear a strict address regex AND an explicit reject-list (single quote,
// backslash, control chars) before it is ever interpolated; a value that fails
// returns [] instead of building a query.

import { DATASETS, socrataQuery } from "@/lib/monitor/socrata";
import {
  findLocalByContact,
  type LocalContactMatch,
} from "@/lib/db/contact-search";

/** How a raw search string was interpreted. */
export type ContactKind = "email" | "phone";

/**
 * Where a hit came from. The census only knows the MCS-150 FILING contact, so
 * a search for the address a seller actually typed into our wizard will miss it
 * entirely — see findContactMatches() and lib/db/contact-search.ts.
 */
export type MatchSource = "census" | "lead" | "monitor";

/** One hit, flattened for a disambiguation picker. */
export type ContactMatch = {
  dotNumber: string; // UNPADDED (Census form) — lpadDot() before InsHist joins
  legalName: string | null;
  dbaName: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  cellPhone: string | null;
  email: string | null;
  statusCode: string | null; // 'A' = active
  addDate: string | null; // ISO yyyy-mm-dd (parsed from YYYYMMDD)
  mcNumber: string | null; // docket1, only when docket1prefix === 'MC'
  source: MatchSource;
  /** Our own valuations row id, when the hit came from our records. */
  valuationId: number | null;
  /** The human who filled the form. Inbound leads only — census has no such field. */
  contactName: string | null;
  /** Inbound pipeline status ("new", "contacted", …). Inbound leads only. */
  status: string | null;
};

/** A search string reduced to exactly the form Census stores. */
export type ParsedContact = { kind: ContactKind; value: string };

// The Census fields we pull. Kept next to the row shape so $select and the
// type stay in lockstep (same discipline as discovery.ts).
type ContactCensusRow = {
  dot_number?: string | null;
  legal_name?: string | null;
  dba_name?: string | null;
  phy_city?: string | null;
  phy_state?: string | null;
  phone?: string | null;
  cell_phone?: string | null;
  email_address?: string | null;
  status_code?: string | null;
  docket1prefix?: string | null;
  docket1?: string | null;
  add_date?: string | null;
};

const CONTACT_SELECT = [
  "dot_number",
  "legal_name",
  "dba_name",
  "phy_city",
  "phy_state",
  "phone",
  "cell_phone",
  "email_address",
  "status_code",
  "docket1prefix",
  "docket1",
  "add_date",
].join(", ");

// add_date is YYYYMMDD TEXT, so lexical DESC is chronological DESC — newest
// authorities (the acquisition targets) surface at the top of the picker.
const CONTACT_ORDER = "add_date DESC";

// A shared filing contact can front an enormous book of carriers — phone
// 2029182132 was on 1,220 carriers added in 2026 alone (measured live
// 2026-08-09). 25 shows the operator the shape of the list without paging a
// filing service's entire client roster through a live admin request. Callers
// must treat a full page as TRUNCATED, not as the complete set.
const CONTACT_LIMIT = 25;

// Deliberately stricter than the sign-up check used elsewhere in the app
// (`[^\s@]+@[^\s@]+\.[^\s@]+`): that one happily accepts a single quote, which
// is precisely the character that would break out of the SoQL string literal.
const STRICT_EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// RFC 5321 maximum address length — anything longer is not a real address and
// has no business being pasted into a query string.
const MAX_EMAIL_LEN = 254;

// --- local helpers (in-file only) ----------------------------------------

/**
 * Belt-and-braces injection guard. STRICT_EMAIL_RE already cannot match any of
 * these, but the reject-list is asserted separately so a future loosening of
 * the regex can't quietly reopen the hole: `'` closes the SoQL literal, `\` is
 * the escape character, and control chars can smuggle a newline into the URL.
 * Written as a scan rather than a regex to keep control characters out of a
 * pattern literal.
 */
function hasSoqlUnsafeChars(value: string): boolean {
  for (const ch of value) {
    if (ch === "'" || ch === "\\") return true;
    const code = ch.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/** Trim a Socrata string field; null when absent/empty. */
function cleanStr(v: string | null | undefined): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

/** Parse Census add_date (YYYYMMDD text) to ISO yyyy-mm-dd; null if invalid. */
function parseAddDate(v: string | null | undefined): string | null {
  if (v == null) return null;
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(String(v).trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${mo}-${d}`;
}

// --- normalization --------------------------------------------------------

/**
 * Reduce anything a human might type — "(614) 857-9300", "+1 614-857-9300",
 * "16148579300" — to the bare 10-digit form Census stores. Returns null unless
 * exactly 10 digits survive: a partial number would match nothing, and a
 * longer one isn't a US carrier line.
 */
export function normalizePhone(value: string): string | null {
  let digits = value.replace(/[^0-9]/g, "");
  // Drop the US country code; Census keeps the 10-digit NANP number only.
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

/**
 * Decide whether a raw search string is an email or a phone number and reduce
 * it to the exact form Census stores. An "@" anywhere means email (no phone
 * number contains one); everything else is treated as a phone number.
 *
 * Returns null when the value cannot be used SAFELY — either it isn't a
 * 10-digit US number, or it isn't an address that is safe to interpolate into
 * SoQL. Callers should surface "that isn't a usable email/phone", which is a
 * different message from "no carrier found".
 */
export function parseContact(raw: string): ParsedContact | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  if (trimmed.includes("@")) {
    if (trimmed.length > MAX_EMAIL_LEN) return null;
    // Both checks, in this order — see the SoQL INJECTION note up top.
    if (hasSoqlUnsafeChars(trimmed)) return null;
    if (!STRICT_EMAIL_RE.test(trimmed)) return null;
    // Census email_address is mixed case; we compare upper() on both sides.
    return { kind: "email", value: trimmed.toUpperCase() };
  }

  const phone = normalizePhone(trimmed);
  return phone ? { kind: "phone", value: phone } : null;
}

// --- mapping --------------------------------------------------------------

/** Normalize one raw Census row into a picker-ready ContactMatch. */
function mapContactRow(row: ContactCensusRow): ContactMatch {
  // docket1 is the MC number itself, but ONLY when the prefix says MC. FF
  // (freight forwarder) and MX (Mexican carrier) dockets live in the same
  // column and must not be relabelled.
  const prefix = cleanStr(row.docket1prefix)?.toUpperCase() ?? null;
  const docket = cleanStr(row.docket1);

  return {
    // UNPADDED, digits-only DOT (Census form) — matches discovery.ts.
    dotNumber: String(row.dot_number ?? "").replace(/[^0-9]/g, ""),
    legalName: cleanStr(row.legal_name),
    dbaName: cleanStr(row.dba_name),
    city: cleanStr(row.phy_city),
    state: cleanStr(row.phy_state)?.toUpperCase() ?? null,
    phone: cleanStr(row.phone),
    cellPhone: cleanStr(row.cell_phone),
    email: cleanStr(row.email_address),
    statusCode: cleanStr(row.status_code)?.toUpperCase() ?? null,
    addDate: parseAddDate(row.add_date),
    mcNumber: prefix === "MC" && docket ? docket : null,
    source: "census",
    valuationId: null,
    contactName: null,
    status: null,
  };
}

// --- lookup ---------------------------------------------------------------

/**
 * Find every Census carrier whose MCS-150 filing contact matches `value`.
 *
 * Returns [] for an unusable input (bad address, not a 10-digit number) as well
 * as for a genuine no-hit; use parseContact() first if you need to tell those
 * two apart. THROWS on a Socrata failure, inheriting socrataQuery's contract —
 * an empty array from an outage is indistinguishable from "no such carrier",
 * and callers must not report the former as the latter.
 *
 * No status filter: an operator looking up a number that just called them wants
 * the answer even if that authority is revoked or inactive.
 */
export async function findCarriersByContact(value: string): Promise<ContactMatch[]> {
  const parsed = parseContact(value);
  if (!parsed) return [];

  // Safe to interpolate: `value` is either digits-only (phone) or has cleared
  // the strict-address + reject-list gate in parseContact (email).
  const where =
    parsed.kind === "email"
      ? `upper(email_address)='${parsed.value}'`
      : `(phone='${parsed.value}' OR cell_phone='${parsed.value}')`;

  const rows = await socrataQuery<ContactCensusRow>(DATASETS.census, {
    select: CONTACT_SELECT,
    where,
    order: CONTACT_ORDER,
    limit: CONTACT_LIMIT,
  });

  // A row with a blank dot_number is unusable downstream (the audit engine keys
  // off DOT), so drop it rather than render a dead picker entry.
  return rows.map(mapContactRow).filter((m) => m.dotNumber.length > 0);
}

// --- merged lookup ---------------------------------------------------------

/** Widen one of our own rows into the shared picker shape. */
function fromLocal(m: LocalContactMatch): ContactMatch {
  return {
    dotNumber: m.dotNumber,
    legalName: m.legalName,
    dbaName: m.dbaName,
    city: m.city,
    state: m.state,
    phone: m.phone,
    cellPhone: null, // we don't store a separate cell column
    email: m.email,
    statusCode: null, // FMCSA authority status isn't on our row; the audit shows it
    addDate: null,
    mcNumber: m.mcNumber,
    source: m.source,
    valuationId: m.valuationId,
    contactName: m.contactName,
    status: m.status,
  };
}

/**
 * The lookup the audit tool actually calls: search OUR RECORDS and the FMCSA
 * census together, then merge.
 *
 * WHY BOTH. The census only indexes the MCS-150 filing contact, so searching
 * the address a seller typed into our own wizard, or the mobile they rang from,
 * returns nothing — the single most confusing possible result, because the
 * person plainly exists. Our own tables hold ~52k monitor prospects and the
 * inbound leads, keyed to the same DOTs, and for a lead they also carry the
 * human's NAME and pipeline status. Searching ours first answers the question
 * the operator is actually asking.
 *
 * Our rows WIN on a DOT collision: a monitor row carries everything the census
 * row would have plus our audit state, and a lead row additionally names the
 * person. Census-only hits are appended — those are carriers we have never
 * seen, which is exactly when the census earns its keep.
 *
 * A local row with no DOT is still returned. It cannot be audited, but "this is
 * lead #55857, Wilbur McConnell, status contacted" is the useful answer, and
 * suppressing it would recreate the very blind spot this function exists to fix.
 *
 * Never throws on a census outage — a Socrata failure degrades to local-only
 * results rather than losing the whole search, and `censusFailed` tells the
 * caller so it can say the list may be incomplete.
 */
export async function findContactMatches(raw: string): Promise<{
  matches: ContactMatch[];
  censusFailed: boolean;
}> {
  const parsed = parseContact(raw);
  if (!parsed) return { matches: [], censusFailed: false };

  const [local, census] = await Promise.all([
    findLocalByContact(parsed.kind, parsed.value).catch((err) => {
      // Our own DB failing is not a reason to lose a working census result.
      console.error("[reverse-lookup] local contact search failed", err);
      return [] as LocalContactMatch[];
    }),
    findCarriersByContact(raw).then(
      (rows) => ({ ok: true as const, rows }),
      (err) => {
        console.error("[reverse-lookup] census contact search failed", err);
        return { ok: false as const, rows: [] as ContactMatch[] };
      },
    ),
  ]);

  const merged = local.map(fromLocal);
  const seen = new Set(merged.map((m) => m.dotNumber).filter((d) => d.length > 0));
  for (const c of census.rows) {
    if (seen.has(c.dotNumber)) continue;
    seen.add(c.dotNumber);
    merged.push(c);
  }

  return { matches: merged, censusFailed: !census.ok };
}
