import { neon } from "@neondatabase/serverless";

// Saved-buyer directory for the Bill of Sale generator.
//
// WHY THIS EXISTS: the same handful of buyers come back deal after deal, and
// their name/address were being retyped by hand into every Bill of Sale — a
// typo in either field lands on a signed transfer document. A stored
// directory makes the buyer a one-click pick, exactly like the MC/DOT lookup
// bar does for the company fields.
//
// WHY IT IS DELIBERATELY THIN: only `name` and `address` are ever printed on
// the Bill of Sale, so those are the only fields the generator reads. email /
// phone / notes exist purely as the owner's own contact scratchpad and are
// never rendered into a PDF. No government-ID data is stored here — no
// driver's licence number, no date of birth, no ID images — because none of
// it is needed to produce the document, and holding identity documents we
// don't need turns a convenience table into a breach liability.
//
// ACCESS: this table is full-admin only. Who the buyers are is the single
// most commercially sensitive fact in this business — the API layer enforces
// `session.role === "admin"` on every verb (see
// src/app/api/admin/buyers/route.ts).

type Sql = ReturnType<typeof neon>;

let initialized = false;

function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export type Buyer = {
  id: number;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BuyerInput = {
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

// Seeded on first table creation only (guarded on an empty table, mirroring
// admin-users.ts). Name + address only — that is the entire set of buyer
// data the Bill of Sale prints, so it is the entire set we keep. Do NOT
// extend this seed with ID/licence/DOB fields.
const SEED_BUYERS: ReadonlyArray<{ name: string; address: string }> = [
  {
    name: "Ulan Amangeldi Uulu",
    address: "1417 Sturgeon Bay Ct, Schaumburg, IL 60173",
  },
];

async function ensureTable(sql: Sql): Promise<void> {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS bos_buyers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      email TEXT,
      phone TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS bos_buyers_name_idx ON bos_buyers (name)`;
  initialized = true;

  // Auto-seed only while the table is empty, so a buyer the owner later
  // deletes never silently reappears on the next cold start.
  const count = (await sql`SELECT COUNT(*) AS c FROM bos_buyers`) as Array<{
    c: string;
  }>;
  if (Number(count[0]?.c ?? 0) === 0) {
    for (const b of SEED_BUYERS) {
      await sql`
        INSERT INTO bos_buyers (name, address)
        VALUES (${b.name}, ${b.address})
      `;
    }
    console.log(`[bos-buyers] seeded ${SEED_BUYERS.length} default buyer(s)`);
  }
}

// Empty / whitespace-only optional input is stored as NULL rather than "" so
// the UI can rely on a single "missing" representation.
function nullIfBlank(value: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validate(input: BuyerInput): { ok: true } | { ok: false; reason: string } {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length === 0) return { ok: false, reason: "Buyer name is required." };
  if (name.length > 200) return { ok: false, reason: "Buyer name is too long." };
  const address = nullIfBlank(input.address);
  if (address && address.length > 500) {
    return { ok: false, reason: "Buyer address is too long." };
  }
  return { ok: true };
}

export async function listBuyers(): Promise<Buyer[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureTable(sql);
  const rows = (await sql`
    SELECT id, name, address, email, phone, notes,
           created_at::text AS created_at,
           updated_at::text AS updated_at
      FROM bos_buyers
     ORDER BY name ASC
  `) as Buyer[];
  return rows;
}

export async function createBuyer(
  input: BuyerInput,
): Promise<{ ok: boolean; reason?: string; buyer?: Buyer }> {
  const valid = validate(input);
  if (!valid.ok) return { ok: false, reason: valid.reason };
  const sql = getSql();
  if (!sql) return { ok: false, reason: "DB unavailable" };
  await ensureTable(sql);
  try {
    const rows = (await sql`
      INSERT INTO bos_buyers (name, address, email, phone, notes)
      VALUES (
        ${input.name.trim()},
        ${nullIfBlank(input.address)},
        ${nullIfBlank(input.email)},
        ${nullIfBlank(input.phone)},
        ${nullIfBlank(input.notes)}
      )
      RETURNING id, name, address, email, phone, notes,
                created_at::text AS created_at,
                updated_at::text AS updated_at
    `) as Buyer[];
    const buyer = rows[0];
    if (!buyer) return { ok: false, reason: "Could not save buyer." };
    return { ok: true, buyer };
  } catch (err) {
    console.error("[bos-buyers.createBuyer] error", err);
    return { ok: false, reason: "Could not save buyer." };
  }
}

// Full-record update: the edit UI always submits every field, so there is no
// partial-patch path and therefore no need to build SQL dynamically.
export async function updateBuyer(
  id: number,
  input: BuyerInput,
): Promise<{ ok: boolean; reason?: string; buyer?: Buyer }> {
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, reason: "Bad buyer id." };
  }
  const valid = validate(input);
  if (!valid.ok) return { ok: false, reason: valid.reason };
  const sql = getSql();
  if (!sql) return { ok: false, reason: "DB unavailable" };
  await ensureTable(sql);
  try {
    const rows = (await sql`
      UPDATE bos_buyers
         SET name = ${input.name.trim()},
             address = ${nullIfBlank(input.address)},
             email = ${nullIfBlank(input.email)},
             phone = ${nullIfBlank(input.phone)},
             notes = ${nullIfBlank(input.notes)},
             updated_at = now()
       WHERE id = ${id}
      RETURNING id, name, address, email, phone, notes,
                created_at::text AS created_at,
                updated_at::text AS updated_at
    `) as Buyer[];
    const buyer = rows[0];
    if (!buyer) return { ok: false, reason: "Buyer not found." };
    return { ok: true, buyer };
  } catch (err) {
    console.error("[bos-buyers.updateBuyer] error", err);
    return { ok: false, reason: "Could not update buyer." };
  }
}

export async function deleteBuyer(
  id: number,
): Promise<{ ok: boolean; reason?: string }> {
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, reason: "Bad buyer id." };
  }
  const sql = getSql();
  if (!sql) return { ok: false, reason: "DB unavailable" };
  await ensureTable(sql);
  try {
    const rows = (await sql`
      DELETE FROM bos_buyers WHERE id = ${id} RETURNING id
    `) as Array<{ id: number }>;
    if (!rows[0]) return { ok: false, reason: "Buyer not found." };
    return { ok: true };
  } catch (err) {
    console.error("[bos-buyers.deleteBuyer] error", err);
    return { ok: false, reason: "Could not remove buyer." };
  }
}
