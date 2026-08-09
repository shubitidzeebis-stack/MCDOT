import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  verifySession,
  type SessionPayload,
} from "@/lib/auth/sessions";
import { getUserAccess } from "@/lib/db/admin-users";

// Central admin authorization guard for every /admin page and /api/admin/*
// route. Checks:
//   1. A valid, unexpired, HMAC-signed session cookie (the proper login flow).
//   2. The user still exists in the DB — so removing an account revokes
//      access immediately, even though the session cookie is stateless.
//   3. The ROLE comes from the DB row, not the cookie, so a role change
//      (admin ⇄ agent) also takes effect on the next request.
//   4. So does SEND_AS — the mailbox this user's admin-panel email goes out
//      as. It ends up in a From header, so it must come from the server's
//      copy of the row on every request; a stale cookie must never be able
//      to pin a sending identity.
//
// Roles: "admin" = full access; "agent" = restricted (no deletes, no
// internal notes, no user management, no outreach/monitor dashboards — they
// work leads, write comments, and email the lead they're working).
// Routes gate destructive actions on `session.role === "admin"`.
//
// There is deliberately NO legacy ?key= / ADMIN_KEY bypass here: it put the
// shared master secret into URLs, browser history and server logs and
// sidestepped the per-user audit trail. ADMIN_KEY now only seeds the initial
// accounts (see admin-users.ts).

export type AdminSession = SessionPayload & {
  role: string;
  /** Verified send-as mailbox, or null to use the shared company From. */
  sendAs: string | null;
};

export async function requireAdmin(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const session = verifySession(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!session) return null;
  const access = await getUserAccess(session.uid);
  // null = the account is confirmed deleted → revoke now.
  if (access === null) return null;
  // undefined = no DB configured (local dev) → trust the valid signature.
  return {
    ...session,
    name: access?.name ?? session.name,
    role: access?.role ?? "admin",
    // No DB (dev) → no send-as identity, so sends fall back to the shared
    // company From rather than inventing one.
    sendAs: access?.send_as ?? null,
  };
}