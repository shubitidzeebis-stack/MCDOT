import { NextResponse } from "next/server";
import { addValuationComment } from "@/lib/db/valuations";
import { requireAdmin } from "@/lib/auth/require-admin";

// Append an attributed comment to a valuation. Open to ALL roles (admin +
// agent) — this is the agent-safe way to leave notes on a lead. The author
// name always comes from the session, never from the request body, so a
// comment can't be written under someone else's name.

export const dynamic = "force-dynamic";

type Body = { id: number; text: string };

function isBody(x: unknown): x is Body {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "number" &&
    typeof o.text === "string" &&
    o.text.trim().length > 0 &&
    o.text.length <= 2000
  );
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    if (!isBody(raw)) {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }

    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const author = session.name ?? session.email;
    const result = await addValuationComment(raw.id, author, raw.text.trim());
    if (!result.ok) {
      return NextResponse.json({ error: "Comment failed." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, comments: result.comments });
  } catch (err) {
    console.error("[admin/valuations/comment] error", err);
    return NextResponse.json({ error: "Comment failed." }, { status: 500 });
  }
}
