import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  createUser,
  deleteUser,
  listUsers,
  changePassword,
} from "@/lib/db/admin-users";

// Admin user management. Auth: session cookie required.
//
// GET     -> list users
// POST    -> create user { email, password, name? }
// PATCH   -> reset password for a user { id, password }
// DELETE  -> remove user { id }

export const dynamic = "force-dynamic";

async function requireSession() {
  return requireAdmin();
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
  };
  if (typeof raw.email !== "string" || typeof raw.password !== "string") {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const name = typeof raw.name === "string" && raw.name.trim().length > 0
    ? raw.name.trim()
    : null;
  const result = await createUser(raw.email, raw.password, name);
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
  const raw = (await req.json()) as { id?: unknown; password?: unknown };
  if (typeof raw.id !== "number" || typeof raw.password !== "string") {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const result = await changePassword(raw.id, raw.password);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? "Failed." }, { status: 400 });
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
