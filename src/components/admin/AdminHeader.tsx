"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminHeader({
  currentUser,
  stats,
}: {
  currentUser: { name: string | null; email: string };
  stats: {
    leads: number;
    valuations: number;
    withEmail: number;
    relay: number;
    partials: number;
  };
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // ignore — clear cookie is best-effort
    }
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Veritor — Admin</h1>
        <p className="mt-1 text-[13px] text-white/55">
          {stats.leads} leads · {stats.valuations} valuations ({stats.withEmail} w/ email
          · {stats.relay} active Relay) · {stats.partials} active partials
        </p>
      </div>
      <div className="flex flex-col items-end gap-2 text-right">
        <div className="text-[12px] text-white/55">
          <div className="font-medium text-white/85">{currentUser.name || "—"}</div>
          <div className="text-[11px] text-white/40">{currentUser.email}</div>
        </div>
        <div className="flex items-center gap-3 text-[12px]">
          <Link href="/" className="text-white/55 hover:text-white">
            Back to site
          </Link>
          <span className="text-white/20">·</span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-white/55 hover:text-white disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </header>
  );
}
