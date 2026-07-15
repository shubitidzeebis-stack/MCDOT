// Lead admin dashboard. Shows recent leads + partials in a table,
// sortable by submission time, with priority badges so the team can
// triage at a glance.
//
// Auth: session-cookie login only (see requireAdmin). The old
// ?key=ADMIN_KEY query-string bypass has been removed.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { AdminValuationsPanel } from "@/components/AdminValuationsPanel";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ensureValuationsSchema } from "@/lib/db/valuations";
import { AdminMonitorPanel } from "@/components/AdminMonitorPanel";
import { OutreachDraftsPanel } from "@/components/OutreachDraftsPanel";
import { listMonitorCandidates, listOutreachDrafts } from "@/lib/db/monitor";

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
  insurance_status: string | null;
  telephone: string | null;
  phy_address: {
    street: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
  } | null;
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
      // ensure the schema (incl. the `source` column) exists so this read
      // can filter on it even before the first wizard write of this deploy.
      await ensureValuationsSchema();
      // source='inbound' keeps the outbound monitoring agent's ~40k cold
      // prospect rows out of this daily-triage dashboard. Those live in the
      // dedicated monitor view.
      valuations = (await sql`
        SELECT id, created_at::text AS created_at, status, legal_name, dba_name,
               mc_number, dot_number, authority_status, authority_age_days,
               has_amazon_relay, valuation_low, valuation_high,
               valuation_floored_reason, contact_name, contact_email,
               contact_phone, contact_provided_at::text AS contact_provided_at,
               power_units, drivers_count, vehicle_oos_pct, driver_oos_pct,
               crashes_24mo, safety_rating, notes_internal, insurance_status,
               telephone, phy_address
          FROM valuations
         WHERE source = 'inbound'
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

export default async function AdminPage() {
  const session = await requireAdmin();
  if (!session) {
    redirect("/admin/login");
  }

  const { leads, partials, valuations } = await loadLeads();
  const monitor = await listMonitorCandidates();
  const outreachDrafts = await listOutreachDrafts();
  const valuationsWithEmail = valuations.filter((v) => v.contact_email);
  const relayValuations = valuations.filter((v) => v.has_amazon_relay === true);
  const currentUser = { name: session.name, email: session.email };

  return (
    <main className="min-h-screen bg-[#0a0a0b] p-6 text-white md:p-10">
      <AdminHeader
        currentUser={currentUser}
        stats={{
          leads: leads.length,
          valuations: valuations.length,
          withEmail: valuationsWithEmail.length,
          relay: relayValuations.length,
          partials: partials.length,
        }}
      />

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

      <AdminValuationsPanel initial={valuations} />

      <div className="mt-12 flex items-center justify-end gap-2">
        <a
          href="/admin/agent"
          className="rounded-lg bg-[#ff8a1a]/15 px-4 py-2 text-[13px] font-semibold text-[#ffb371] ring-1 ring-[#ff8a1a]/25 hover:bg-[#ff8a1a]/25"
        >
          Agent dashboard →
        </a>
        <a
          href="/admin/audit"
          className="rounded-lg bg-white/[0.05] px-4 py-2 text-[13px] font-semibold text-white/80 ring-1 ring-white/10 hover:bg-white/[0.08]"
        >
          On-demand audit tool →
        </a>
        <a
          href="/admin/bill-of-sale"
          className="rounded-lg bg-white/[0.05] px-4 py-2 text-[13px] font-semibold text-white/80 ring-1 ring-white/10 hover:bg-white/[0.08]"
        >
          Bill of Sale generator →
        </a>
      </div>

      <AdminMonitorPanel initial={monitor} />

      <OutreachDraftsPanel initial={outreachDrafts} />

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
