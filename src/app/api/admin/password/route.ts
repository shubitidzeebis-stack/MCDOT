import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/auth/sessions";
import { findUserByEmail, changePassword } from "@/lib/db/admin-users";
import { verifyPassword } from "@/lib/auth/passwords";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// Self-service password change — must be authenticated AND the current
// password must match. Rate-limited to deter session-hijack attempts.

export const dynamic = "force-dynamic";

const LIMIT = 5;
const WINDOW_MS = 30 * 60 * 1000;

type Body = { currentPassword?: unknown; newPassword?: unknown };

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(ADMIN_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rl = rateLimit(`admin-pw:${session.email}:${ip}`, LIMIT, WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429 },
      );
    }

    const raw: Body = await req.json();
    if (
      typeof raw.currentPassword !== "string" ||
      typeof raw.newPassword !== "string"
    ) {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }
    if (raw.newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const user = await findUserByEmail(session.email);
    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    const ok = await verifyPassword(raw.currentPassword, user.password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 },
      );
    }

    const result = await changePassword(user.id, raw.newPassword);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason ?? "Update failed." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/password] error", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
