// On-demand audit tool at /admin/audit — punch in any MC/DOT and get the full
// insurance-history + UCC handoff + rating, independent of the monitor queue.
// Auth mirrors the main admin page (session cookie → legacy ?key= → dev).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/auth/sessions";
import { OnDemandAuditTool } from "@/components/OnDemandAuditTool";

export const metadata: Metadata = {
  title: "Audit",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const expected = process.env.ADMIN_KEY ?? "";
  const { key } = await searchParams;

  const cookieStore = await cookies();
  const session = verifySession(cookieStore.get(ADMIN_COOKIE)?.value);
  const okSession = !!session;
  const okLegacyKey = expected.length > 0 && key === expected;
  const okInDev = expected.length === 0 && process.env.NODE_ENV !== "production";

  if (!okSession && !okLegacyKey && !okInDev) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] p-6 text-white md:p-10">
      <div className="mb-6">
        <a href={okSession ? "/admin" : `/admin?key=${key ?? ""}`} className="text-[13px] text-white/55 hover:text-white">
          ← Back to admin
        </a>
        <h1 className="mt-2 text-xl font-semibold">On-demand carrier audit</h1>
        <p className="text-[13px] text-white/55">
          Insurance history, UCC handoff, eligibility & rating for any MC/DOT.
        </p>
      </div>
      <OnDemandAuditTool adminKey={okSession ? undefined : (key ?? undefined)} />
    </main>
  );
}
