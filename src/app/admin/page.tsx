// Password-gated lead admin. Lives at /admin?key=<ADMIN_KEY>.
// Shows recent leads + partials in a table, sortable by submission
// time, with priority badges so the team can triage at a glance.
//
// Security model: HTTP basic-style query-string auth. Nothing fancy
// because:
//   - It's behind robots.txt disallow + noindex
//   - The data is already in Vercel Storage (admin can always go there)
//   - The /admin page is purely read-only — no destructive actions
// If you ever want stronger auth (Vercel Auth, magic-link login, etc.)
// it's an easy upgrade path; this exists for fast daily triage.

import type { Metadata } from "next";
import Link from "next/link";
import { neon } from "@neondatabase/serverless";
import { AdminValuationsPanel } from "@/components/AdminValuationsPanel";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Lead = {
  id: number;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  mc: string | null;
  has_relay: string | null;
  insurance: string | null;
  state: string | null;
  locale: string;
  priority: "high" | "medium" | "low" | null;
  attribution: Record<string, string> | null;
};

type Partial = {
  session_id: string;
  email: string | null;
  name: string | null;
  page: string | null;
  converted: boolean;
  recovery_queued_at: string | null;
  updated_at: string;
};

type Valuation = {
  id: number;
  created_at: string;
  status: string | null;
  legal_name: string | null;
  dba_name: string | null;
  mc_number: string | null;
  dot_number: string | null;
  authority_status: string | null;
  authority_age_days: number | null;
  has_amazon_relay: boolean | null;
  valuation_low: number | null;
  valuation_high: number | null;
  valuation_floored_reason: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_provided_at: string | null;
  power_units: number | null;
  drivers_count: number | null;
  vehicle_oos_pct: string | null;
  driver_oos_pct: string | null;
  crashes_24mo: number | null;
  safety_rating: string | null;
  notes_internal: string | null;
};

async function loadLeads(): Promise<{
  leads: Lead[];
  partials: Partial[];
  valuations: Valuation[];
}> {
  const url = process.env.DATABASE_URL;
  if (!url) return { leads: [], partials: [], valuations: [] };
  const sql = neon(url);
  try {
    const leads = (await sql`
      SELECT id, created_at::text AS created_at, name, email, phone, company, mc,
             has_relay, insurance, state, locale, priority, attribution
        FROM leads
       ORDER BY created_at DESC
       LIMIT 200
    `) as Lead[];
    const partials = (await sql`
      SELECT session_id, email, name, page, converted, recovery_queued_at,
             updated_at::text AS updated_at
        FROM partial_leads
       WHERE converted = false
       ORDER BY updated_at DESC
       LIMIT 50
    `) as Partial[];
    let valuations: Valuation[] = [];
    try {
      // Wrapped because the table doesn't exist until first wizard
      // submission. Don't break /admin if no one's used the wizard yet.
      valuations = (await sql`
        SELECT id, created_at::text AS created_at, status, legal_name, dba_name,
               mc_number, dot_number, authority_status, authority_age_days,
               has_amazon_relay, valuation_low, valuation_high,
               valuation_floored_reason, contact_name, contact_email,
               contact_phone, contact_provided_at::text AS contact_provided_at,
               power_units, drivers_count, vehicle_oos_pct, driver_oos_pct,
               crashes_24mo, safety_rating, notes_internal
          FROM valuations
         ORDER BY created_at DESC
         LIMIT 500
      `) as Valuation[];
    } catch {
      valuations = [];
    }
    return { leads, partials, valuations };
  } catch (err) {
    console.error("[admin] db read failed", err);
    return { leads: [], partials: [], valuations: [] };
  }
}


function priorityBadge(p: Lead["priority"]) {
  if (p === "high")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#ff8a1a]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ff8a1a]">
        🔥 High
      </span>
    );
  if (p === "medium")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#ffb371]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffb371]">
        ⚡ Med
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
      Low
    </span>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const expected = process.env.ADMIN_KEY ?? "";
  const { key } = await searchParams;

  // No-key configured = lock everyone out in production. Locally a missing
  // key is permissive so dev can hit /admin without setup.
  const okInProd = expected.length > 0 && key === expected;
  const okInDev =
    expected.length === 0 && process.env.NODE_ENV !== "production";
  if (!okInProd && !okInDev) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0b] p-8 text-white">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-3 text-sm text-white/55">
          Append <code className="rounded bg-white/[0.06] px-1.5 py-0.5">?key=YOUR_ADMIN_KEY</code> to the URL.
        </p>
      </main>
    );
  }

  const { leads, partials, valuations } = await loadLeads();
  const valuationsWithEmail = valuations.filter((v) => v.contact_email);
  const relayValuations = valuations.filter((v) => v.has_amazon_relay === true);

  return (
    <main className="min-h-screen bg-[#0a0a0b] p-6 text-white md:p-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Veritor — Admin</h1>
          <p className="mt-1 text-[13px] text-white/55">
            {leads.length} leads · {valuations.length} valuations
            {" "}({valuationsWithEmail.length} w/ email · {relayValuations.length} active Relay)
            {" "}· {partials.length} active partials
          </p>
        </div>
        <Link
          href="/"
          className="text-[13px] text-white/55 hover:text-white"
        >
          ← Back to site
        </Link>
      </header>

      <section className="mt-8">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
          Submitted leads
        </h2>
        <div className="overflow-x-auto rounded-xl bg-white/[0.025] ring-1 ring-white/10">
          <table className="min-w-full divide-y divide-white/8 text-[13px]">
            <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-[0.18em] text-white/55">
              <tr>
                <th className="px-3 py-3">When</th>
                <th className="px-3 py-3">Priority</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">LLC / MC</th>
                <th className="px-3 py-3">Relay</th>
                <th className="px-3 py-3">State</th>
                <th className="px-3 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {leads.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-white/45">
                    No leads yet.
                  </td>
                </tr>
              )}
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-3 py-3 text-white/65">
                    {new Date(l.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-3">{priorityBadge(l.priority)}</td>
                  <td className="px-3 py-3 font-medium text-white">{l.name}</td>
                  <td className="px-3 py-3">
                    <a
                      href={`mailto:${l.email}`}
                      className="text-[#ffb371] hover:underline"
                    >
                      {l.email}
                    </a>
                  </td>
                  <td className="px-3 py-3">
                    <a
                      href={`tel:${l.phone}`}
                      className="text-[#ffb371] hover:underline"
                    >
                      {l.phone}
                    </a>
                  </td>
                  <td className="px-3 py-3 text-white/65">
                    {l.company || "—"}
                    {l.mc && <span className="text-white/35"> · {l.mc}</span>}
                  </td>
                  <td className="px-3 py-3 text-white/65">{l.has_relay ?? "—"}</td>
                  <td className="px-3 py-3 text-white/65">{l.state ?? "—"}</td>
                  <td className="px-3 py-3 text-[12px] text-white/45">
                    {l.attribution?.attr_utm_source ?? l.attribution?.attr_referrer ?? "direct"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AdminValuationsPanel initial={valuations} adminKey={key ?? ""} />

      {partials.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
            Unconverted partials (last seen)
          </h2>
          <div className="overflow-x-auto rounded-xl bg-white/[0.025] ring-1 ring-white/10">
            <table className="min-w-full divide-y divide-white/8 text-[13px]">
              <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-[0.18em] text-white/55">
                <tr>
                  <th className="px-3 py-3">Updated</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Page</th>
                  <th className="px-3 py-3">Recovery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {partials.map((p) => (
                  <tr key={p.session_id} className="hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-3 py-3 text-white/65">
                      {new Date(p.updated_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-3">
                      {p.email ? (
                        <a
                          href={`mailto:${p.email}`}
                          className="text-[#ffb371] hover:underline"
                        >
                          {p.email}
                        </a>
                      ) : (
                        <span className="text-white/35">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-white/65">{p.name ?? "—"}</td>
                    <td className="px-3 py-3 text-[12px] text-white/45">
                      {p.page ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-white/45">
                      {p.recovery_queued_at ? "queued" : "pending"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
