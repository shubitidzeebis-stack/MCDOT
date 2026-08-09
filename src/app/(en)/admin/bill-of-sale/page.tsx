// Bill of Sale generator at /admin/bill-of-sale.
//
// Auth: FULL ADMIN ONLY — a valid session is not enough. The owner closes
// every acquisition personally, so no agent-role user has a reason to open
// this page, and two things behind it are strictly need-to-know: the saved
// buyer directory (who actually pays for authorities — the one fact not
// discoverable from public FMCSA data) and the seller wire-transfer fields.
// Agent-role users are sent back to /admin, and the API behind the buyer
// dropdown enforces the same rule independently (a redirect here is UX; the
// route handler is the actual boundary).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { BillOfSalePanel } from "@/components/admin/BillOfSalePanel";

export const metadata: Metadata = {
  title: "Bill of Sale — Veritor Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminBillOfSalePage() {
  const session = await requireAdmin();
  if (!session) {
    redirect("/admin/login?next=/admin/bill-of-sale");
  }
  // Role comes from the DB on every request (see require-admin.ts), so a
  // demotion takes effect immediately — an old cookie can't hold access.
  if (session.role !== "admin") {
    redirect("/admin");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Bill of Sale generator
            </h1>
            <p className="mt-1 text-[13px] text-white/55">
              Membership Interest Purchase PDF — leave any field empty and it
              renders as a highlighted [PENDING] placeholder, so drafts can go
              out before the figures are final. The PDF is generated in your
              browser: no deal detail — price, wire info, seller or company —
              is ever sent to or stored on the server. The saved-buyer list is
              the only thing this page loads from the server.
            </p>
          </div>
          <Link
            href="/admin"
            className="text-[13px] text-white/55 hover:text-white"
          >
            ← Back to admin
          </Link>
        </header>

        <BillOfSalePanel />
      </div>
    </main>
  );
}
