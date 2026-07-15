import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { attemptLogin } from "@/lib/db/admin-users";
import { ADMIN_COOKIE, signSession, SESSION_TTL_SEC } from "@/lib/auth/sessions";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const LIMIT = 10;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  try {
    // Brute-force guard — 10 attempts per IP per 15 minutes. Tightens
    // any password-spray attack against the seeded shared password.
    const ip = getClientIp(req);
    const rl = await rateLimit(`admin-login:${ip}`, LIMIT, WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again shortly." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as { email?: unknown; password?: unknown };
    if (typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const email = body.email.trim().toLowerCase();
    const password = body.password;

    const user = await attemptLogin(email, password);
    if (!user) {
      // Constant-shape response — don't leak whether the account exists.
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const token = signSession({ uid: user.id, email: user.email, name: user.name });

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SEC,
    });

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("[admin/login] error", err);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 },
    );
  }
}
