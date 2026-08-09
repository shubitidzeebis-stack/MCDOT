import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { lookupCarrier } from "@/lib/fmcsa";
import { verifyCandidate } from "@/lib/monitor/verify";
import {
  findCarriersByContact,
  parseContact,
  type ContactMatch,
} from "@/lib/monitor/reverse-lookup";
import { buildUccHandoff } from "@/lib/audit/ucc";
import { computeValuation } from "@/lib/valuation";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// On-demand audit tool: enter ANY MC/DOT → live QCMobile/SAFER lookup +
// bulk-data insurance-history + eligibility + rating + UCC handoff, independent
// of the monitor queue. Reuses the same engine the sweep uses.
// Auth: session cookie, or legacy ADMIN_KEY in body.
//
// It also accepts an EMAIL or PHONE, resolved against the FMCSA Census
// MCS-150 filing contact first (see lib/monitor/reverse-lookup.ts). That
// contact is very often a dispatcher / insurance agent / compliance-filing
// service, so one value can front many carriers. Hence the three outcomes:
//   0 matches  → 404
//   1 match    → falls through to the normal DOT audit; response shape unchanged
//   2+ matches → { ok: true, matches: [...] } and NO audit, because every audit
//                fires live SAFER + QCMobile calls against a daily quota.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuditKind = "mc" | "dot" | "email" | "phone";

type Body = { number: string; kind: AuditKind };

const AUDIT_KINDS: readonly string[] = ["mc", "dot", "email", "phone"];

function isBody(x: unknown): x is Body {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.number !== "string" || o.number.trim().length === 0) return false;
  if (typeof o.kind !== "string" || !AUDIT_KINDS.includes(o.kind)) return false;
  return true;
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    if (!isBody(raw)) {
      return NextResponse.json(
        { error: "Enter an MC/DOT number, an email address, or a phone number." },
        { status: 400 },
      );
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

    // MC/DOT go straight through. Email/phone resolve to a DOT first, and the
    // branch below overwrites both of these before the audit runs.
    let lookupNumber = raw.number;
    let lookupKind: "mc" | "dot" = raw.kind === "mc" ? "mc" : "dot";

    if (raw.kind === "email" || raw.kind === "phone") {
      const label = raw.kind === "email" ? "email address" : "phone number";

      // An unusable value is a bad request, not a miss — say so, rather than
      // reporting "no carrier found" for something we never actually searched.
      if (!parseContact(raw.number)) {
        return NextResponse.json(
          { error: "Enter a full email address or a 10-digit US phone number." },
          { status: 400 },
        );
      }

      let matches: ContactMatch[];
      try {
        matches = await findCarriersByContact(raw.number);
      } catch (err) {
        // socrataQuery throws on API failure by design — never let an outage
        // masquerade as "no such carrier".
        console.error("[admin/monitor/audit] census contact lookup failed", err);
        return NextResponse.json(
          { error: "FMCSA census lookup failed — try again shortly." },
          { status: 502 },
        );
      }

      if (matches.length === 0) {
        return NextResponse.json(
          {
            error:
              `No carrier in the FMCSA census lists that ${label}. Census holds the ` +
              `MCS-150 filing contact, so a personal cell or a new inbox often isn't in it.`,
          },
          { status: 404 },
        );
      }

      // Ambiguous on purpose: the Census contact is the MCS-150 FILING contact,
      // so a dispatcher / insurance agent / filing service fronts many
      // carriers. Hand the operator a picker instead of guessing — and do NOT
      // audit them all, since each audit burns live SAFER/QCMobile quota.
      if (matches.length > 1) {
        return NextResponse.json({ ok: true, matches });
      }

      lookupNumber = matches[0].dotNumber;
      lookupKind = "dot";
    }

    const lookup = await lookupCarrier(lookupNumber, lookupKind);
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
