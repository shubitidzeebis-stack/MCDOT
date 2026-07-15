import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getMonitorAuditInputs,
  logAgentAction,
  recordUccFindings,
} from "@/lib/db/monitor";
import { acquisitionScore, combineAuditScore } from "@/lib/audit/score";
import { deriveUccRating } from "@/lib/audit/ucc";
import type {
  EligibilityState,
  InsuranceRating,
  UccFindings,
  UccRating,
} from "@/lib/monitor/types";

// Safety team submits UCC findings for a monitor candidate. We store them and
// recompute the combined audit + acquisition score (UCC was 'unknown' until now).
// Auth: session cookie, or legacy ADMIN_KEY in body — same as other admin routes.

export const dynamic = "force-dynamic";

const UCC_RATINGS: UccRating[] = ["green", "amber", "red", "unknown"];

type Body = {
  id: number;
  liensFound: boolean;
  lienCount?: number | null;
  securedParties?: string;
  collateral?: string;
  notes?: string;
  uccRating?: UccRating;
};

function isBody(x: unknown): x is Body {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "number") return false;
  if (typeof o.liensFound !== "boolean") return false;
  if (
    o.uccRating !== undefined &&
    !UCC_RATINGS.includes(o.uccRating as UccRating)
  ) {
    return false;
  }
  return true;
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

    const findings: UccFindings = {
      liensFound: raw.liensFound,
      lienCount: raw.lienCount ?? null,
      securedParties: raw.securedParties
        ? raw.securedParties.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
        : null,
      collateral: raw.collateral ?? null,
      notes: raw.notes ?? null,
    };

    const uccRating: UccRating = raw.uccRating ?? deriveUccRating(findings);
    const uccStatus = findings.liensFound ? "liens_found" : "clear";

    // Recompute combined audit + acquisition score now that UCC is known.
    const inputs = await getMonitorAuditInputs(raw.id);
    const insuranceRating = (inputs?.insurance_rating as InsuranceRating) ?? "unknown";
    const currentlyUninsured = inputs?.insurance_current === false;
    const auditRating = combineAuditScore(insuranceRating, uccRating, {
      currentlyUninsured,
    });
    // Re-apply the persisted safety penalty — a fresh acquisitionScore() knows
    // nothing about it, and writing the raw value would silently erase the
    // deduction the safety enrich applied.
    const baseScore = acquisitionScore({
      insurance: insuranceRating,
      ucc: uccRating,
      valuationFactor: null,
      fleetUnits: inputs?.power_units ?? null,
      daysTo180: inputs?.days_to_180 ?? null,
      eligibility: (inputs?.eligibility_state as EligibilityState) ?? undefined,
      currentlyUninsured,
    });
    const score = Math.max(0, baseScore - (inputs?.safety_penalty ?? 0));

    const auditedBy = session.email;
    const result = await recordUccFindings(raw.id, {
      uccStatus,
      uccRating,
      uccFindings: findings,
      auditedBy,
      auditScore: auditRating,
      acquisitionScore: score,
    });
    if (!result.ok) {
      return NextResponse.json({ error: "Save failed." }, { status: 500 });
    }

    await logAgentAction("ucc_captured", `admin:${auditedBy}`, raw.id, {
      uccRating,
      uccStatus,
      auditRating,
    });

    return NextResponse.json({
      ok: true,
      uccRating,
      uccStatus,
      auditScore: auditRating,
      acquisitionScore: score,
    });
  } catch (err) {
    console.error("[admin/monitor/capture-ucc] error", err);
    return NextResponse.json({ error: "Save failed." }, { status: 500 });
  }
}
