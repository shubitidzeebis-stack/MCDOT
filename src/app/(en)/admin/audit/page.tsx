// On-demand audit tool at /admin/audit — punch in any MC/DOT (or an email
// address / phone number, resolved via the FMCSA census filing contact) and get
// the full insurance-history + UCC handoff + rating, independent of the monitor
// queue. Auth: session-cookie login only (see requireAdmin).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { OnDemandAuditTool } from "@/components/OnDemandAuditTool";

export const metadata: Metadata = {
  title: "Audit",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise on server pages.
  searchParams: Promise<{ kind?: string; number?: string }>;
}) {
  const session = await requireAdmin();
  if (!session) {
    redirect("/admin/login");
  }
  // The audit tool itself is open to every signed-in role, but its "Draft
  // Bill of Sale" shortcut points at an owner-only page — pass the role down
  // so agent-role users aren't offered a link that bounces them.
  const canDraftBos = session.role === "admin";

  // Deep-link support: /admin/calls links here with ?kind=phone&number=… so
  // the operator lands with the lookup already running, not an empty form.
  // Whitelist the kind — it flows into request bodies.
  const { kind, number } = await searchParams;
  const KINDS = ["mc", "dot", "email", "phone"] as const;
  const initialKind = (KINDS as readonly string[]).includes(kind ?? "")
    ? (kind as (typeof KINDS)[number])
    : undefined;

  return (
    <main className="min-h-screen bg-[#0a0a0b] p-6 text-white md:p-10">
      <div className="mb-6">
        <a href="/admin" className="text-[13px] text-white/55 hover:text-white">
          ← Back to admin
        </a>
        <h1 className="mt-2 text-xl font-semibold">On-demand carrier audit</h1>
        <p className="text-[13px] text-white/55">
          Insurance history, UCC handoff, eligibility &amp; rating — by MC/DOT, or
          by the email address or phone number on the carrier&apos;s MCS-150.
        </p>
      </div>
      <OnDemandAuditTool
        canDraftBos={canDraftBos}
        initialKind={initialKind}
        initialNumber={number}
      />
    </main>
  );
}
