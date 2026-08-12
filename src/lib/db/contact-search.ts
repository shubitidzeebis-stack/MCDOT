import { neon } from "@neondatabase/serverless";

// Reverse contact lookup against OUR OWN records, as a companion to the FMCSA
// census search in lib/monitor/reverse-lookup.ts.
//
// WHY THIS EXISTS: the census only knows the MCS-150 FILING contact. That is a
// form the carrier submitted to FMCSA — very often a dispatcher, an insurance
// agent, or a compliance-filing service. It is emphatically NOT the address a
// seller types into our own valuation wizard, nor the mobile they call from.
// So a census-only search answers "who filed this MCS-150?" when the operator
// is actually asking "who is this person emailing me?".
//
// We hold ~52k monitor prospects and a few hundred inbound leads with contact
// details attached to a DOT. Searching those first answers the real question,
// costs one indexed query instead of a live API call, and — for an inbound lead
// — returns the human's NAME and pipeline status, which the census can never
// supply.
//
// Data gotchas enforced below:
//   - contact_phone is free text a visitor typed ("(706) 567-0279", "+1 706…"),
//     while `telephone` came from the SAFER scrape in the same shape. Both must
//     be reduced to bare digits before comparing, and compared on the LAST 10
//     so a leading US country code doesn't cause a silent miss.
//   - Emails are stored in whatever case they arrived in; compare lower() on
//     both sides.
//   - A monitor row and an inbound row can exist for the SAME dot_number (the
//     unique index is partial, on source='monitor' only), so callers must dedupe.
//   - dot_number is TEXT and may be NULL on an inbound row whose lookup never
//     resolved. A row without a DOT is still worth returning — it identifies the
//     person — but it cannot be audited, so the shape marks that explicitly.

type Sql = ReturnType<typeof neon>;

function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

/** Which of our own tables a hit came from. Drives the badge in the picker. */
export type LocalSource = "lead" | "monitor";

/** One hit from our own records, shaped to merge with a census ContactMatch. */
export type LocalContactMatch = {
  /** UNPADDED digits, or "" when the row never resolved to a DOT. */
  dotNumber: string;
  mcNumber: string | null;
  legalName: string | null;
  dbaName: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  source: LocalSource;
  /** Row id, so the operator can jump straight to the lead. */
  valuationId: number;
  /** Inbound only — the human who filled the form. The census has no such field. */
  contactName: string | null;
  /** Inbound pipeline status ("new", "contacted", …); null for monitor rows. */
  status: string | null;
};

type Row = {
  id: number;
  source: string;
  dot_number: string | null;
  mc_number: string | null;
  legal_name: string | null;
  dba_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  census_email: string | null;
  contact_phone: string | null;
  telephone: string | null;
  status: string | null;
  phy_address: { city?: string | null; state?: string | null } | null;
};

// Cap for the same reason the census search caps: one shared filing address can
// front a large book of carriers, and the picker is for disambiguating a handful,
// not for paging a roster. Kept equal to the census limit so a merged, deduped
// list can never imply more completeness than either source actually has.
const LOCAL_LIMIT = 25;

function cleanStr(v: string | null | undefined): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function mapRow(r: Row): LocalContactMatch {
  const isLead = r.source !== "monitor";
  return {
    dotNumber: String(r.dot_number ?? "").replace(/[^0-9]/g, ""),
    mcNumber: cleanStr(r.mc_number),
    legalName: cleanStr(r.legal_name),
    dbaName: cleanStr(r.dba_name),
    city: cleanStr(r.phy_address?.city ?? null),
    state: cleanStr(r.phy_address?.state ?? null)?.toUpperCase() ?? null,
    phone: cleanStr(r.contact_phone) ?? cleanStr(r.telephone),
    email: cleanStr(r.contact_email) ?? cleanStr(r.census_email),
    source: isLead ? "lead" : "monitor",
    valuationId: r.id,
    contactName: isLead ? cleanStr(r.contact_name) : null,
    status: isLead ? cleanStr(r.status) : null,
  };
}

/**
 * The seller's name for a Bill of Sale, resolved from our OWN inbound leads.
 *
 * WHY THIS EXISTS: FMCSA publishes no officer, owner or contact NAME — a
 * carrier record carries legalName and dbaName and nothing human. So the
 * MC/DOT lookup in the Bill of Sale generator can fill every company field
 * and still leave Seller blank. The name we want was typed into our own
 * valuation wizard by the person selling the authority.
 *
 * Restricted to non-monitor rows on purpose. Monitor rows are cold FMCSA
 * census prospects whose contact is the MCS-150 FILER — very often a
 * dispatcher, insurance agent or filing service (see the note at the top of
 * this file). Printing one of those as "Seller" on a document that transfers
 * a company would be wrong in a way that is expensive to discover later.
 * They currently hold no contact_name at all, so this is belt-and-braces.
 *
 * Matches on digits only: dot_number/mc_number are stored bare ("1050600")
 * while the form and FMCSA hand around "MC-1050600".
 *
 * Returns null (never throws) when no DB is configured, so the FMCSA half of
 * the lookup still works in local dev without DATABASE_URL.
 */
export async function findSellerNameByCarrier(
  dotNumber: string | null,
  mcNumbers: string[] = [],
): Promise<{ name: string; valuationId: number } | null> {
  const sql = getSql();
  if (!sql) return null;

  const dot = String(dotNumber ?? "").replace(/[^0-9]/g, "");
  // Joined into one text param rather than bound as an array: the http driver
  // is unambiguous about text, and string_to_array keeps the comparison in SQL.
  const mcs = mcNumbers
    .map((m) => String(m).replace(/[^0-9]/g, ""))
    .filter(Boolean)
    .join(",");
  if (!dot && !mcs) return null;

  const rows = (await sql`
    SELECT id, contact_name
      FROM valuations
     WHERE source <> 'monitor'
       AND is_test IS NOT TRUE
       AND nullif(btrim(contact_name), '') IS NOT NULL
       AND (
             (${dot} <> '' AND regexp_replace(coalesce(dot_number, ''), '\\D', '', 'g') = ${dot})
          OR (${mcs} <> '' AND regexp_replace(coalesce(mc_number, ''), '\\D', '', 'g')
                               = ANY(string_to_array(${mcs}, ',')))
           )
     ORDER BY created_at DESC
     LIMIT 1
  `) as Array<{ id: number; contact_name: string }>;

  const hit = rows[0];
  if (!hit) return null;
  const name = cleanStr(hit.contact_name);
  return name ? { name, valuationId: hit.id } : null;
}

/**
 * Find our own records whose contact details match.
 *
 * `value` must ALREADY be normalized by parseContact() — an UPPERCASED address
 * for "email", or bare 10 digits for "phone". Passing raw user input would
 * silently miss.
 *
 * Inbound leads sort first: a human already in the pipeline is a more useful
 * answer than a cold prospect, and there are only a few hundred of them against
 * ~52k monitor rows.
 *
 * Returns [] (never throws) when no DB is configured, so the census search still
 * works in a local dev environment without DATABASE_URL.
 */
export async function findLocalByContact(
  kind: "email" | "phone",
  value: string,
): Promise<LocalContactMatch[]> {
  const sql = getSql();
  if (!sql) return [];

  // Parameterized throughout — unlike SoQL, node-postgres binds these, so the
  // injection dance the census search has to do is unnecessary here.
  const rows =
    kind === "email"
      ? ((await sql`
          SELECT id, source, dot_number, mc_number, legal_name, dba_name,
                 contact_name, contact_email, census_email, contact_phone,
                 telephone, status, phy_address
            FROM valuations
           WHERE lower(contact_email) = lower(${value})
              OR lower(census_email)  = lower(${value})
           ORDER BY (source = 'monitor'), created_at DESC
           LIMIT ${LOCAL_LIMIT}
        `) as Row[])
      : // Compare the LAST 10 digits of a digits-only projection so "+1 (706)
        // 567-0279", "706-567-0279" and "17065670279" all match the same carrier.
        ((await sql`
          SELECT id, source, dot_number, mc_number, legal_name, dba_name,
                 contact_name, contact_email, census_email, contact_phone,
                 telephone, status, phy_address
            FROM valuations
           WHERE right(regexp_replace(coalesce(contact_phone, ''), '\\D', '', 'g'), 10) = ${value}
              OR right(regexp_replace(coalesce(telephone, ''),     '\\D', '', 'g'), 10) = ${value}
           ORDER BY (source = 'monitor'), created_at DESC
           LIMIT ${LOCAL_LIMIT}
        `) as Row[]);

  return rows.map(mapRow);
}
