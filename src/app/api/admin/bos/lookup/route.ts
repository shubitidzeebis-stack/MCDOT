import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { lookupCarrier } from "@/lib/fmcsa";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// Bill of Sale generator lookup: enter ANY MC/DOT → live QCMobile/SAFER
// lookup, returns only the company fields the BoS form needs. Unlike the
// public /api/valuation/lookup this writes NO valuation row — admin
// lookups must never appear as leads.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { number: string; kind: "mc" | "dot" };

function isBody(x: unknown): x is Body {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.number !== "string" || o.number.trim().length === 0) return false;
  if (o.kind !== "mc" && o.kind !== "dot") return false;
  return true;
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    if (!isBody(raw)) {
      return NextResponse.json({ error: "Enter an MC or DOT number." }, { status: 400 });
    }

    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Live SAFER/QCMobile calls — same per-IP cap as the audit tool so a
    // logged-in user can't burn the FMCSA daily quota.
    const rl = await rateLimit(`bos-lookup:${getClientIp(req)}`, 20, 5 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many lookups — try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } },
      );
    }

    const lookup = await lookupCarrier(raw.number, raw.kind);
    if (!lookup.ok) {
      return NextResponse.json(
        { error: lookup.message, reason: lookup.reason },
        { status: lookup.reason === "not_found" ? 404 : 502 },
      );
    }

    const c = lookup.carrier;
    return NextResponse.json({
      ok: true,
      company: {
        legalName: c.legalName,
        dbaName: c.dbaName,
        dotNumber: String(c.dotNumber),
        mcNumbers: lookup.mcNumbers,
        address:
          [c.phyStreet, c.phyCity, c.phyState, c.phyZipcode]
            .filter(Boolean)
            .join(", ") || null,
        telephone: lookup.telephone,
      },
    });
  } catch (err) {
    console.error("[admin/bos/lookup] error", err);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
}
