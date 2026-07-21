import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { lookupCarrier } from "@/lib/fmcsa";
import { verifyCandidate } from "@/lib/monitor/verify";
import { buildUccHandoff } from "@/lib/audit/ucc";
import { computeValuation } from "@/lib/valuation";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// On-demand audit tool: enter ANY MC/DOT → live QCMobile/SAFER lookup +
// bulk-data insurance-history + eligibility + rating + UCC handoff, independent
// of the monitor queue. Reuses the same engine the sweep uses.
// Auth: session cookie, or legacy ADMIN_KEY in body.

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

    // Each audit fires live SAFER/QCMobile + Socrata lookups — cap per IP so a
    // logged-in user can't burn the FMCSA daily quota.
    const rl = await rateLimit(`monitor-audit:${getClientIp(req)}`, 20, 5 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many audits — try again shortly." },
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

    const carrier = lookup.carrier;
    const dot = String(carrier.dotNumber);

    const verify = await verifyCandidate({
      dotNumber: dot,
      addDate: null,
      powerUnits: carrier.totalPowerUnits,
    });

    const uccHandoff = buildUccHandoff({
      legalName: carrier.legalName,
      dbaName: carrier.dbaName,
      state: carrier.phyState,
    });

    const valuation = computeValuation(carrier, {
      hasAmazonRelay: verify.eligibility.state === "eligible_now",
      authorityAgeDays:
        verify.eligibility.daysSinceAnchor ?? lookup.authorityAgeDays,
    });

    return NextResponse.json({
      ok: true,
      carrier: {
        legalName: carrier.legalName,
        dbaName: carrier.dbaName,
        dotNumber: carrier.dotNumber,
        mcNumbers: lookup.mcNumbers,
        street: carrier.phyStreet,
        state: carrier.phyState,
        city: carrier.phyCity,
        zip: carrier.phyZipcode,
        telephone: lookup.telephone,
        powerUnits: carrier.totalPowerUnits,
        drivers: carrier.totalDrivers,
      },
      authorityActive: verify.authorityActive,
      brokerOnly: verify.brokerOnly,
      currentInsured: verify.currentInsured,
      insurance: verify.insurance,
      eligibility: verify.eligibility,
      auditRating: verify.auditRating,
      acquisitionScore: verify.acquisitionScore,
      uccHandoff,
      valuation,
    });
  } catch (err) {
    console.error("[admin/monitor/audit] error", err);
    return NextResponse.json({ error: "Audit failed." }, { status: 500 });
  }
}
