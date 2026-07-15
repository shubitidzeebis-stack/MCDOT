// On-demand audit tool at /admin/audit — punch in any MC/DOT and get the full
// insurance-history + UCC handoff + rating, independent of the monitor queue.
// Auth: session-cookie login only (see requireAdmin).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { OnDemandAuditTool } from "@/components/OnDemandAuditTool";

export const metadata: Metadata = {
  title: "Audit",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  if (!(await requireAdmin())) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] p-6 text-white md:p-10">
      <div className="mb-6">
        <a href="/admin" className="text-[13px] text-white/55 hover:text-white">
          ← Back to admin
        </a>
        <h1 className="mt-2 text-xl font-semibold">On-demand carrier audit</h1>
        <p className="text-[13px] text-white/55">
          Insurance history, UCC handoff, eligibility & rating for any MC/DOT.
        </p>
      </div>
      <OnDemandAuditTool />
    </main>
  );
}
