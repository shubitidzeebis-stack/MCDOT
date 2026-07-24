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
//
// Roles: "admin" = full access; "agent" = restricted (no deletes, no user
// management, no outreach/email sends — they work leads and write comments).
// Routes gate destructive actions on `session.role === "admin"`.
//
// There is deliberately NO legacy ?key= / ADMIN_KEY bypass here: it put the
// shared master secret into URLs, browser history and server logs and
// sidestepped the per-user audit trail. ADMIN_KEY now only seeds the initial
// accounts (see admin-users.ts).

export type AdminSession = SessionPayload & { role: string };

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
  };
}