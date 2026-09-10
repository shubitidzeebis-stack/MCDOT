import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  createBuyer,
  deleteBuyer,
  listBuyers,
  updateBuyer,
  type BuyerInput,
} from "@/lib/db/buyers";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// Saved-buyer directory behind the Bill of Sale generator.
//
// GET     -> list buyers
// POST    -> create   { name, address?, email?, phone?, notes? }
// PATCH   -> update   { id, name, address?, email?, phone?, notes? }
// DELETE  -> remove   { id }
//
// AUTH — any signed-in role can list, create and update; DELETE is owner-only.
// The agent (Donnie) drafts bills of sale for the deals they close, so the
// directory has to be readable and growable from the agent role. Removing a
// buyer is the one irreversible verb, so it keeps the `session.role ===
// "admin"` gate, in line with the rest of the agent model (no deletes).
// For the owner's awareness: the buyer list identifies who pays for
// authorities, the one fact not discoverable from public FMCSA data.
//
// The 401/403 split is deliberate: 401 = not signed in (the client should
// send you to login), 403 = signed in but not allowed this verb.
//
// PRIVACY NOTE: this route intentionally moves buyer NAME + ADDRESS only —
// the two fields the Bill of Sale prints. No government-ID data is accepted,
// stored, or logged anywhere in this path. Deal terms (price, wire details,
// seller info) never reach the server at all: the PDF is built client-side in
// the browser, and this buyer list is the page's ONLY server round-trip.
// Keep it that way.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Guard =
  | { ok: true; uid: number }
  | { ok: false; response: NextResponse };

async function requireSession(): Promise<Guard> {
  const session = await requireAdmin();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
  return { ok: true, uid: session.uid };
}

async function requireFullAdmin(): Promise<Guard> {
  const session = await requireAdmin();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
  if (session.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Removing a saved buyer is restricted to the account owner." },
        { status: 403 },
      ),
    };
  }
  return { ok: true, uid: session.uid };
}

// Per-user cap (not per-IP — the team can share an office IP). Generous
// enough for normal use; low enough that a stolen session can't scrape or
// churn the directory at speed.
async function limited(
  req: Request,
  uid: number,
  action: string,
  max: number,
): Promise<NextResponse | null> {
  const rl = await rateLimit(
    `bos-buyers:${action}:${uid}:${getClientIp(req)}`,
    max,
    5 * 60 * 1000,
  );
  if (rl.ok) return null;
  return NextResponse.json(
    { error: "Too many requests — try again shortly." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) },
    },
  );
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

type WriteBody = {
  name: string;
  address: unknown;
  email: unknown;
  phone: unknown;
  notes: unknown;
};

function isWriteBody(x: unknown): x is WriteBody {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.name === "string" && o.name.trim().length > 0;
}

function toInput(body: WriteBody): BuyerInput {
  return {
    name: body.name,
    address: asOptionalString(body.address),
    email: asOptionalString(body.email),
    phone: asOptionalString(body.phone),
    notes: asOptionalString(body.notes),
  };
}

function isIdBody(x: unknown): x is { id: number } {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "number" && Number.isInteger(o.id) && o.id > 0;
}

export async function GET(req: Request) {
  try {
    const guard = await requireSession();
    if (!guard.ok) return guard.response;

    const throttled = await limited(req, guard.uid, "read", 120);
    if (throttled) return throttled;

    const buyers = await listBuyers();
    return NextResponse.json({ ok: true, buyers });
  } catch (err) {
    console.error("[admin/buyers GET] error", err);
    return NextResponse.json({ error: "Could not load buyers." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireSession();
    if (!guard.ok) return guard.response;

    const throttled = await limited(req, guard.uid, "write", 60);
    if (throttled) return throttled;

    const raw: unknown = await req.json();
    if (!isWriteBody(raw)) {
      return NextResponse.json({ error: "Buyer name is required." }, { status: 400 });
    }

    const result = await createBuyer(toInput(raw));
    if (!result.ok) {
      return NextResponse.json({ error: result.reason ?? "Failed." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, buyer: result.buyer });
  } catch (err) {
    console.error("[admin/buyers POST] error", err);
    return NextResponse.json({ error: "Could not save buyer." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await requireSession();
    if (!guard.ok) return guard.response;

    const throttled = await limited(req, guard.uid, "write", 60);
    if (throttled) return throttled;

    const raw: unknown = await req.json();
    if (!isIdBody(raw) || !isWriteBody(raw)) {
      return NextResponse.json(
        { error: "Buyer id and name are required." },
        { status: 400 },
      );
    }

    const result = await updateBuyer(raw.id, toInput(raw));
    if (!result.ok) {
      return NextResponse.json({ error: result.reason ?? "Failed." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, buyer: result.buyer });
  } catch (err) {
    console.error("[admin/buyers PATCH] error", err);
    return NextResponse.json({ error: "Could not update buyer." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const guard = await requireFullAdmin();
    if (!guard.ok) return guard.response;

    const throttled = await limited(req, guard.uid, "write", 60);
    if (throttled) return throttled;

    const raw: unknown = await req.json();
    if (!isIdBody(raw)) {
      return NextResponse.json({ error: "Buyer id is required." }, { status: 400 });
    }

    const result = await deleteBuyer(raw.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason ?? "Failed." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/buyers DELETE] error", err);
    return NextResponse.json({ error: "Could not remove buyer." }, { status: 500 });
  }
}
