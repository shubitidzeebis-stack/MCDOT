import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  createUser,
  deleteUser,
  listUsers,
  changePassword,
  setUserSendAs,
} from "@/lib/db/admin-users";

// Admin user management. Auth: session cookie required.
//
// GET     -> list users
// POST    -> create user { email, password, name?, sendAs? }
// PATCH   -> update a user { id, password?, sendAs? } — at least one field.
//            `sendAs: null` (or "") clears it back to the shared company From.
// DELETE  -> remove user { id }
//
// `sendAs` is the mailbox that user's admin-panel email goes out as. It is
// writable ONLY here, i.e. only by a full admin: a user who could set their
// own would be able to pick any address on a domain we own. Format and
// domain are validated server-side in lib/db/admin-users.ts regardless of
// what the UI does.

export const dynamic = "force-dynamic";

// User management is full-admin only. Agent-role users must not be able to
// list accounts, create logins, reset other people's passwords, or delete
// admins (self-service password change lives at /api/admin/password).
async function requireSession() {
  const session = await requireAdmin();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function GET() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const users = await listUsers();
  return NextResponse.json({ ok: true, users });
}

export async function POST(req: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const raw = (await req.json()) as {
    email?: unknown;
    password?: unknown;
    name?: unknown;
    sendAs?: unknown;
  };
  if (typeof raw.email !== "string" || typeof raw.password !== "string") {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const name = typeof raw.name === "string" && raw.name.trim().length > 0
    ? raw.name.trim()
    : null;
  const sendAs =
    typeof raw.sendAs === "string" && raw.sendAs.trim().length > 0
      ? raw.sendAs.trim()
      : null;
  const result = await createUser(raw.email, raw.password, name, sendAs);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? "Failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, user: result.user });
}

export async function PATCH(req: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const raw = (await req.json()) as {
    id?: unknown;
    password?: unknown;
    sendAs?: unknown;
  };
  if (typeof raw.id !== "number") {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Both fields are optional so the original password-reset shape
  // ({ id, password }) keeps working untouched, while { id, sendAs } — and
  // { id, sendAs: null } to clear — are now accepted too. `"sendAs" in raw`
  // rather than a truthiness test: an absent key means "leave it alone",
  // an explicit null means "clear it", and those must not collapse.
  const wantsPassword = typeof raw.password === "string";
  const wantsSendAs = "sendAs" in raw;
  if (!wantsPassword && !wantsSendAs) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (wantsPassword) {
    const result = await changePassword(raw.id, raw.password as string);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason ?? "Failed." }, { status: 400 });
    }
  }

  if (wantsSendAs) {
    if (raw.sendAs !== null && typeof raw.sendAs !== "string") {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }
    const next =
      typeof raw.sendAs === "string" && raw.sendAs.trim().length > 0
        ? raw.sendAs.trim()
        : null;
    const result = await setUserSendAs(raw.id, next);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason ?? "Failed." }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const raw = (await req.json()) as { id?: unknown };
  if (typeof raw.id !== "number") {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (raw.id === session.uid) {
    return NextResponse.json(
      { error: "You can't delete your own account." },
      { status: 400 },
    );
  }
  const result = await deleteUser(raw.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? "Failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
