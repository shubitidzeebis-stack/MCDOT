// Call monitoring for the Quo business line, (326) 222-5444.
//
// Rows are pushed in by /api/webhooks/quo and pre-linked to a lead at ingest,
// so this page is a straight read — no live API call on page load, which keeps
// it fast and means a Quo outage degrades to stale data rather than a broken
// screen.
//
// Open to every signed-in role. The agent (Donnie) makes and takes these
// calls, so the log, recordings, transcripts and missed-call recovery are
// part of the desk; /api/admin/calls* is gated the same way.

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
