// Lead admin dashboard: valuation pipeline, acquisition monitor, outreach
// drafts, and unconverted partials. (The legacy contact-form "Submitted
// leads" table was removed 2026-07-16 — the wizard/valuations pipeline is
// the funnel now; contact-form submissions still arrive by email.)
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
  comments: { author: string; text: string; at: string }[] | null;
};

async function loadLeads(): Promise<{
  partials: Partial[];
  valuations: Valuation[];
}> {
  const url = process.env.DATABASE_URL;
  if (!url) return { partials: [], valuations: [] };
  const sql = neon(url);
  try {
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
               telephone, phy_address, comments
          FROM valuations
         WHERE source = 'inbound'
         ORDER BY created_at DESC
         LIMIT 500
      `) as Valuation[];
    } catch {
      valuations = [];
    }
    return { partials, valuations };
  } catch (err) {
    console.error("[admin] db read failed", err);
    return { partials: [], valuations: [] };
  }
}

export default async function AdminPage() {
  const session = await requireAdmin();
  if (!session) {
    redirect("/admin/login");
  }

  // Agent-role users (e.g. Donnie) get the leads pipeline only: no monitor
  // roster, no outreach drafts, no partials, no agent-dashboard nav. The
  // API routes enforce the same boundary server-side.
  const isFullAdmin = session.role === "admin";

  const { partials, valuations } = await loadLeads();
  const monitor = isFullAdmin ? await listMonitorCandidates() : [];
  const outreachDrafts = isFullAdmin ? await listOutreachDrafts() : [];
  const valuationsWithEmail = valuations.filter((v) => v.contact_email);
  const relayValuations = valuations.filter((v) => v.has_amazon_relay === true);
  const currentUser = { name: session.name, email: session.email };

  return (
    <main className="min-h-screen bg-[#0a0a0b] p-6 text-white md:p-10">
      <AdminHeader
        currentUser={currentUser}
        stats={{
          valuations: valuations.length,
          withEmail: valuationsWithEmail.length,
          relay: relayValuations.length,
          partials: partials.length,
        }}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {isFullAdmin && (
          <a
            href="/admin/agent"
            className="rounded-lg bg-[#ff8a1a]/15 px-4 py-2 text-[13px] font-semibold text-[#ffb371] ring-1 ring-[#ff8a1a]/25 hover:bg-[#ff8a1a]/25"
          >
            Agent dashboard →
          </a>
        )}
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

      <AdminValuationsPanel initial={valuations} role={session.role} />

      {isFullAdmin && <AdminMonitorPanel initial={monitor} />}

      {isFullAdmin && <OutreachDraftsPanel initial={outreachDrafts} />}

      {isFullAdmin && partials.length > 0 && (
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
