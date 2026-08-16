import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { lookupCarrier } from "@/lib/fmcsa";
import { verifyCandidate } from "@/lib/monitor/verify";
import {
  findContactMatches,
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

    // MC/DOT go straight through. Email/phone resolve to a carrier first, and
    // the branch below overwrites these before the audit runs.
    let lookupNumber = raw.number;
    let lookupKind: "mc" | "dot" = raw.kind === "mc" ? "mc" : "dot";
    // Second identifier to retry with when the first comes back not_found —
    // only ever set on the contact path, where we hold both an MC and a DOT.
    let fallback: { number: string; kind: "mc" | "dot" } | null = null;

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

      // Searches our own leads + monitor prospects AND the FMCSA census, then
      // merges. Degrades to local-only if Socrata is down rather than failing
      // the whole request — see findContactMatches().
      let matches: ContactMatch[];
      let censusFailed: boolean;
      try {
        ({ matches, censusFailed } = await findContactMatches(raw.number));
      } catch (err) {
        console.error("[admin/monitor/audit] contact lookup failed", err);
        return NextResponse.json(
          { error: "Contact lookup failed — try again shortly." },
          { status: 502 },
        );
      }

      if (matches.length === 0) {
        return NextResponse.json(
          {
            error: censusFailed
              ? `Nothing in our records matches that ${label}, and the FMCSA census ` +
                `is not responding right now — so this is not a confirmed miss. Try again shortly.`
              : `No match for that ${label} in our leads, our prospect list, or the ` +
                `FMCSA census. Census only holds the MCS-150 filing contact, so a ` +
                `personal mobile or a new inbox often isn't in it — try their MC or DOT.`,
          },
          { status: 404 },
        );
      }

      // Ambiguous on purpose: the census contact is the MCS-150 FILING contact,
      // so a dispatcher / insurance agent / filing service fronts many
      // carriers. Hand the operator a picker instead of guessing — and do NOT
      // audit them all, since each audit burns live SAFER/QCMobile quota.
      if (matches.length > 1) {
        return NextResponse.json({ ok: true, matches, censusFailed });
      }

      // A single hit from our own records may have no DOT (an inbound lead whose
      // FMCSA lookup never resolved). There is nothing to audit, but the row
      // still identifies the person — return it as a one-row picker rather than
      // pretending we found nothing.
      const only = matches[0];
      if (!only.dotNumber && !only.mcNumber) {
        return NextResponse.json({ ok: true, matches, censusFailed });
      }

      // Prefer the MC docket. QCMobile serves MC and DOT from SEPARATE endpoints
      // and they genuinely disagree: S & S TRANSPORTATION LLC (DOT 3836634 /
      // MC 1393707) returns nothing from /carriers/{dot} but a full record from
      // /carriers/docket-number/{mc}. Since the census hands us docket1 for
      // free, leading with MC turns a dead end into a working audit. The DOT is
      // kept as the fallback below.
      if (only.mcNumber) {
        lookupNumber = only.mcNumber;
        lookupKind = "mc";
        fallback = only.dotNumber ? { number: only.dotNumber, kind: "dot" } : null;
      } else {
        lookupNumber = only.dotNumber;
        lookupKind = "dot";
      }
    }

    let lookup = await lookupCarrier(lookupNumber, lookupKind);
    // QCMobile's MC and DOT endpoints disagree about which carriers exist, so a
    // not_found on one is not proof of absence when we hold the other number.
    // api_error retries too: the MC path leans on the Motus docket resolve, so
    // a transient there shouldn't 502 an audit a direct DOT lookup can serve.
    if (!lookup.ok && lookup.reason !== "no_key" && fallback) {
      lookup = await lookupCarrier(fallback.number, fallback.kind);
    }
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
