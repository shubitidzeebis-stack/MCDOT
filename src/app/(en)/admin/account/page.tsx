import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listUsers } from "@/lib/db/admin-users";
import { AccountPanel } from "@/components/admin/AccountPanel";

export const metadata: Metadata = {
  title: "Account — Veritor Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  const session = await requireAdmin();
  if (!session) {
    redirect("/admin/login?next=/admin/account");
  }

  const users = await listUsers();

  return (
    <main className="min-h-screen bg-[#0a0a0b] p-6 text-white md:p-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
            <p className="mt-1 text-[13px] text-white/55">
              Signed in as {session.name || session.email} · {session.email}
            </p>
          </div>
          <Link
            href="/admin"
            className="text-[13px] text-white/55 hover:text-white"
          >
            ← Back to admin
          </Link>
        </header>

        <AccountPanel
          currentUserId={session.uid}
          initialUsers={users}
        />
      </div>
    </main>
  );
}
