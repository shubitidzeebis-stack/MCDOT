// Call monitoring for the Quo business line, (326) 222-5444.
//
// Rows are pushed in by /api/webhooks/quo and pre-linked to a lead at ingest,
// so this page is a straight read — no live API call on page load, which keeps
// it fast and means a Quo outage degrades to stale data rather than a broken
// screen.
//
// Full-admin only. Agent-role users (Donnie) are bounced back to /admin the
// same way the Bill of Sale generator does it; /api/admin/calls* enforces the
// same boundary server-side, so hiding the link is UX, not security.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listCalls, listMissedUnrecovered } from "@/lib/db/calls";
import { AdminCallsPanel } from "@/components/AdminCallsPanel";

export const metadata: Metadata = {
  title: "Calls",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCallsPage() {
  const session = await requireAdmin();
  if (!session) {
    redirect("/admin/login");
  }
  if (session.role !== "admin") {
    redirect("/admin");
  }

  // The recovery board is its own query so an old unhandled missed call
  // survives being pushed out of the last-200 log window.
  const [calls, missed] = await Promise.all([listCalls(), listMissedUnrecovered()]);

  return (
    <main className="min-h-screen bg-[#0a0a0b] p-6 text-white md:p-10">
      <div className="mb-6">
        <a href="/admin" className="text-[13px] text-white/55 hover:text-white">
          ← Back to admin
        </a>
        <h1 className="mt-2 text-xl font-semibold">Calls</h1>
        <p className="text-[13px] text-white/55">
          Live activity on (326) 222-5444 — recordings, transcripts, and missed-call recovery.
        </p>
      </div>

      <AdminCallsPanel initial={calls} initialMissed={missed} />
    </main>
  );
}
