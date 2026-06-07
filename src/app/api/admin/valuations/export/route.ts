import { neon } from "@neondatabase/serverless";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/auth/sessions";
import { ensureValuationsSchema } from "@/lib/db/valuations";

// CSV export of all valuations. Auth precedence:
//   1. Session cookie (preferred)
//   2. ?key=ADMIN_KEY in querystring (legacy)
// Streams the CSV with the right Content-Type so a browser GET triggers
// a file download.

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  created_at: string;
  status: string | null;
  legal_name: string | null;
  dba_name: string | null;
  mc_number: string | null;
  dot_number: string | null;
  authority_status: string | null;
  authority_age_days: number | null;
  power_units: number | null;
  drivers_count: number | null;
  vehicle_oos_pct: string | null;
  driver_oos_pct: string | null;
  crashes_24mo: number | null;
  safety_rating: string | null;
  has_amazon_relay: boolean | null;
  valuation_low: number | null;
  valuation_high: number | null;
  valuation_floored_reason: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes_internal: string | null;
};

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const session = verifySession(cookieStore.get(ADMIN_COOKIE)?.value);
  let authorized = !!session;
  if (!authorized) {
    const expected = process.env.ADMIN_KEY ?? "";
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key") ?? "";
    authorized = expected.length > 0 && key === expected;
  }
  if (!authorized) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    return new Response("DATABASE_URL not configured.", { status: 500 });
  }
  const sql = neon(url);

  let rows: Row[] = [];
  try {
    // Ensure the `source` column exists, then export only inbound rows — the
    // outbound monitoring agent's prospects have their own export.
    await ensureValuationsSchema();
    rows = (await sql`
      SELECT id, created_at::text AS created_at, status, legal_name, dba_name,
             mc_number, dot_number, authority_status, authority_age_days,
             power_units, drivers_count, vehicle_oos_pct, driver_oos_pct,
             crashes_24mo, safety_rating, has_amazon_relay, valuation_low,
             valuation_high, valuation_floored_reason, contact_name,
             contact_email, contact_phone, notes_internal
        FROM valuations
       WHERE source = 'inbound'
       ORDER BY created_at DESC
    `) as Row[];
  } catch (err) {
    console.error("[valuations/export] db error", err);
    return new Response("Database error.", { status: 500 });
  }

  const headers = [
    "id",
    "created_at",
    "status",
    "legal_name",
    "dba_name",
    "mc_number",
    "dot_number",
    "authority_status",
    "authority_age_days",
    "power_units",
    "drivers_count",
    "vehicle_oos_pct",
    "driver_oos_pct",
    "crashes_24mo",
    "safety_rating",
    "has_amazon_relay",
    "valuation_low",
    "valuation_high",
    "valuation_floored_reason",
    "contact_name",
    "contact_email",
    "contact_phone",
    "notes_internal",
  ];

  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      headers
        .map((h) => csvEscape((r as Record<string, unknown>)[h]))
        .join(","),
    );
  }
  const csv = lines.join("\n");

  const filename = `veritor-valuations-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
