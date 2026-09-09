import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { lookupCarrier, deriveCarrierFlags } from "@/lib/fmcsa";
import { createValuation, countValuationsByIp } from "@/lib/db/valuations";
import { requireAdmin } from "@/lib/auth/require-admin";
import { SITE } from "@/lib/site";

// Step 1 of the wizard: take MC or DOT, fetch FMCSA, save snapshot,
// return display data to the client. Pricing is NOT computed here —
// happens in /finalize after the relay flag is given.
//
// Rate limit: 10 lookups / 10 min per IP. Generous enough that a real
// seller flipping between MC variants isn't blocked, tight enough that
// a scraper hits the wall fast.

const LIMIT = 10;
const WINDOW_MS = 10 * 60 * 1000;

// Daily cap (Lukas, 2026-09-09, after a 29-row test burst from two IPs):
// one IP gets at most DAILY_LIMIT valuation rows per rolling 24 hours,
// counted from the valuations table itself so it holds across every
// serverless instance. Logged-in admins are exempt so internal testing
// keeps working. Test-mode rows count too — that is the point.
const DAILY_LIMIT = 3;
const DAILY_WINDOW_HOURS = 24;

export const dynamic = "force-dynamic";
// Worst-case upstream chain (QCMobile + Motus + SAFER, each with retries) can
// far outrun the platform default — cap it so a slow upstream day fails fast
// instead of hanging the wizard.
export const maxDuration = 60;

type LookupBody = {
  sessionId: string;
  number: string;
  kind: "mc" | "dot";
  authorityAgeDays?: number | null;
  attribution?: unknown;
  test?: boolean;
};

function isLookupBody(x: unknown): x is LookupBody {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.sessionId === "string" &&
    o.sessionId.length > 0 &&
    typeof o.number === "string" &&
    o.number.length > 0 &&
    (o.kind === "mc" || o.kind === "dot")
  );
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limit = await rateLimit(`valuation:lookup:${ip}`, LIMIT, WINDOW_MS);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many lookups from this network. Try again shortly." },
        { status: 429, headers: { "Retry-After": Math.ceil(limit.resetIn / 1000).toString() } },
      );
    }

    const raw = await req.json();
    if (!isLookupBody(raw)) {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }

    // Per-IP daily cap — see DAILY_LIMIT above. Runs before the FMCSA
    // lookup so a capped caller never burns upstream quota either.
    if (ip !== "unknown") {
      const admin = await requireAdmin().catch(() => null);
      if (!admin) {
        const recent = await countValuationsByIp(ip, DAILY_WINDOW_HOURS);
        if (recent >= DAILY_LIMIT) {
          return NextResponse.json(
            {
              error: `This network has already run ${DAILY_LIMIT} valuations in the last 24 hours. Call ${SITE.phoneDisplay} or use the contact page and we will run it for you.`,
              reason: "daily_limit",
            },
            {
              status: 429,
              headers: { "Retry-After": String(DAILY_WINDOW_HOURS * 3600) },
            },
          );
        }
      }
    }

    const lookup = await lookupCarrier(raw.number, raw.kind);
    if (!lookup.ok) {
      return NextResponse.json(
        {
          error: lookup.message,
          reason: lookup.reason,
        },
        { status: lookup.reason === "not_found" ? 404 : 502 },
      );
    }

    const { carrier, mcNumbers, telephone, mcs150FormDate, authorityAgeDays } = lookup;
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    // Persist immediately — even if the user bounces from here, we have
    // the FMCSA snapshot keyed to their session. Authority age comes
    // from SAFER's MCS-150 Form Date if available; user-supplied input
    // wins if provided.
    const saved = await createValuation(
      {
        sessionId: raw.sessionId,
        carrier,
        mcNumbers,
        authorityAgeDays: raw.authorityAgeDays ?? authorityAgeDays,
        telephone,
        mcs150FormDate,
        attribution: raw.attribution ?? null,
        isTest: raw.test === true,
      },
      { ip, userAgent },
    );

    const flags = deriveCarrierFlags(carrier);

    // Return only what the wizard needs to render the confirmation step.
    // Don't leak the full raw FMCSA payload back to the client (saves
    // bandwidth + reduces over-disclosure).
    return NextResponse.json({
      ok: true,
      valuationId: saved.id ?? null,
      carrier: {
        legalName: carrier.legalName,
        dbaName: carrier.dbaName,
        dotNumber: String(carrier.dotNumber),
        mcNumbers,
        address: {
          street: carrier.phyStreet,
          city: carrier.phyCity,
          state: carrier.phyState,
          zip: carrier.phyZipcode,
        },
        powerUnits: carrier.totalPowerUnits,
        drivers: carrier.totalDrivers,
        crashes24mo: carrier.crashTotal,
        safetyRating: carrier.safetyRating,
        authorityStatus: carrier.commonAuthorityStatus,
        allowedToOperate: carrier.allowedToOperate === "Y",
        vehicleOosRate: carrier.vehicleOosRate,
        driverOosRate: carrier.driverOosRate,
        vehicleOosNationalAvg: Number(carrier.vehicleOosRateNationalAverage) || null,
        driverOosNationalAvg: Number(carrier.driverOosRateNationalAverage) || null,
        // From SAFER scrape — possibly null if SAFER didn't have it.
        telephone,
        mcs150FormDate,
        authorityAgeDays,
        flags,
      },
    });
  } catch (err) {
    console.error("[valuation/lookup] error", err);
    return NextResponse.json(
      { error: "Lookup failed. Please try again." },
      { status: 500 },
    );
  }
}
