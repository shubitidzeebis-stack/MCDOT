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
              out before the figures are final. Generated in your browser;
              nothing is stored or sent to the server.
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
