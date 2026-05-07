"use client";

import { useState } from "react";

type User = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
  last_login_at: string | null;
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-[#ff8a1a]/50";
const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45";

export function AccountPanel({
  currentUserId,
  initialUsers,
}: {
  currentUserId: number;
  initialUsers: User[];
}) {
  const [users, setUsers] = useState(initialUsers);

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-2">
      <ChangePasswordForm />
      <TeamMembersPanel
        currentUserId={currentUserId}
        users={users}
        setUsers={setUsers}
      />
    </div>
  );
}

function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFlash(null);
    if (next.length < 8) {
      setFlash({ kind: "err", msg: "New password must be at least 8 characters." });
      return;
    }
    if (next !== confirmNext) {
      setFlash({ kind: "err", msg: "New password fields don’t match." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFlash({ kind: "err", msg: data.error || "Update failed." });
        return;
      }
      setFlash({ kind: "ok", msg: "Password updated." });
      setCurrent("");
      setNext("");
      setConfirmNext("");
    } catch {
      setFlash({ kind: "err", msg: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white/[0.025] p-6 ring-1 ring-white/10 md:p-8">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
        Change password
      </h2>
      <p className="mt-2 text-[13px] text-white/55">
        Update your sign-in password. Changes take effect immediately on next login.
      </p>
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Current password</span>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className={inputClass}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>New password</span>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            className={inputClass}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Confirm new password</span>
          <input
            type="password"
            value={confirmNext}
            onChange={(e) => setConfirmNext(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            className={inputClass}
            required
          />
        </label>
        {flash && (
          <p
            className={`text-[12px] ${
              flash.kind === "ok" ? "text-emerald-300" : "text-red-400"
            }`}
          >
            {flash.msg}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="self-end rounded-full bg-[#ff8a1a] px-5 py-2 text-[13px] font-semibold text-[#0a0a0b] transition-colors hover:bg-[#ffb371] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}

function TeamMembersPanel({
  currentUserId,
  users,
  setUsers,
}: {
  currentUserId: number;
  users: User[];
  setUsers: (us: User[]) => void;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  async function reload() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setFlash(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          name: newName || null,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFlash({ kind: "err", msg: data.error || "Failed." });
        return;
      }
      setFlash({ kind: "ok", msg: "User created." });
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      await reload();
    } catch {
      setFlash({ kind: "err", msg: "Network error." });
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(id: number) {
    const newPwd = prompt("New password for this user (8+ chars):");
    if (!newPwd) return;
    if (newPwd.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password: newPwd }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Reset failed.");
      return;
    }
    alert("Password reset.");
  }

  async function removeUser(id: number) {
    if (id === currentUserId) {
      alert("You can't remove yourself.");
      return;
    }
    if (!confirm("Remove this user? They will lose all access immediately.")) return;
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Remove failed.");
      return;
    }
    await reload();
  }

  return (
    <section className="rounded-2xl bg-white/[0.025] p-6 ring-1 ring-white/10 md:p-8">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
        Team members
      </h2>
      <p className="mt-2 text-[13px] text-white/55">
        Add new admins, reset passwords, or remove access. Anyone here can sign
        in at <code className="rounded bg-white/[0.06] px-1">/admin/login</code>.
      </p>

      <ul className="mt-6 divide-y divide-white/8 rounded-xl bg-white/[0.02] ring-1 ring-white/10">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-white">
                {u.name || "—"}
                {u.id === currentUserId && (
                  <span className="ml-2 inline-flex rounded-full bg-[#ff8a1a]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#ff8a1a]">
                    You
                  </span>
                )}
              </p>
              <p className="truncate text-[11px] text-white/45">{u.email}</p>
              <p className="text-[10px] text-white/35">
                {u.last_login_at
                  ? `Last login ${new Date(u.last_login_at).toLocaleDateString()}`
                  : "Never logged in"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => resetPassword(u.id)}
                className="rounded-md px-2 py-1 text-white/60 hover:bg-white/[0.06] hover:text-white"
              >
                Reset password
              </button>
              {u.id !== currentUserId && (
                <button
                  type="button"
                  onClick={() => removeUser(u.id)}
                  className="rounded-md px-2 py-1 text-red-400/70 hover:bg-red-500/[0.08] hover:text-red-300"
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={createUser} className="mt-6 grid gap-3">
        <p className={labelClass}>Add a new admin</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="email"
            placeholder="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            className={inputClass}
          />
          <input
            type="text"
            placeholder="name (optional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={inputClass}
          />
        </div>
        <input
          type="password"
          placeholder="initial password (8+ chars)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          required
          className={inputClass}
        />
        {flash && (
          <p
            className={`text-[12px] ${
              flash.kind === "ok" ? "text-emerald-300" : "text-red-400"
            }`}
          >
            {flash.msg}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="self-end rounded-full bg-[#ff8a1a] px-5 py-2 text-[13px] font-semibold text-[#0a0a0b] transition-colors hover:bg-[#ffb371] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Creating…" : "Add user"}
        </button>
      </form>
    </section>
  );
}
