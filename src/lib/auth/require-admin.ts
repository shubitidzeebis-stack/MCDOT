import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  verifySession,
  type SessionPayload,
} from "@/lib/auth/sessions";
import { userExists } from "@/lib/db/admin-users";

// Central admin authorization guard for every /admin page and /api/admin/*
// route. Two checks:
//   1. A valid, unexpired, HMAC-signed session cookie (the proper login flow).
//   2. The user still exists in the DB — so removing an account revokes
//      access immediately, even though the session cookie is stateless.
//
// There is deliberately NO legacy ?key= / ADMIN_KEY bypass here: it put the
// shared master secret into URLs, browser history and server logs and
// sidestepped the per-user audit trail. ADMIN_KEY now only seeds the initial
// accounts (see admin-users.ts).
export async function requireAdmin(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const session = verifySession(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!session) return null;
  // `false` = the account is confirmed deleted → revoke now. `null` = no DB
  // configured (local dev) → can't check, so trust the valid signature.
  if ((await userExists(session.uid)) === false) return null;
  return session;
}
