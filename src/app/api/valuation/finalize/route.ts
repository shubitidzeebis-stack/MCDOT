import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { lookupCarrier } from "@/lib/fmcsa";
import { computeValuation, formatRange } from "@/lib/valuation";
import {
  finalizeValuation,
  updateValuationContact,
} from "@/lib/db/valuations";

// Step 2 of the wizard. Takes:
// - The valuationId returned from /lookup
// - The relay flag
// - Optional contact (name, email, phone) collected in the wizard
// - The original number/kind so we can recompute valuation server-side
//   (never trust client-provided FMCSA data when computing the price)
//
// Returns the formatted range. Persists relay + computed pricing + any
// contact info provided to the row created in /lookup.

const LIMIT = 10;
const WINDOW_MS = 10 * 60 * 1000;

export const dynamic = "force-dynamic";

type FinalizeBody = {
  sessionId: string;
  valuationId: number;
  number: string;
  kind: "mc" | "dot";
  hasAmazonRelay: boolean;
  authorityAgeDays?: number | null;
  contact?: { name?: string; email?: string; phone?: string };
};

function isFinalizeBody(x: unknown): x is FinalizeBody {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.sessionId === "string" &&
    o.sessionId.length > 0 &&
    typeof o.valuationId === "number" &&
    typeof o.number === "string" &&
    typeof o.hasAmazonRelay === "boolean" &&
    (o.kind === "mc" || o.kind === "dot")
  );
}

function isEmailLikeValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(`valuation:finalize:${ip}`, LIMIT, WINDOW_MS);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many submissions. Try again shortly." },
        { status: 429 },
      );
    }

    const raw = await req.json();
    if (!isFinalizeBody(raw)) {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }

    // Re-fetch FMCSA — never trust client-side carrier data for pricing.
    const lookup = await lookupCarrier(raw.number, raw.kind);
    if (!lookup.ok) {
      return NextResponse.json(
        { error: lookup.message },
        { status: lookup.reason === "not_found" ? 404 : 502 },
      );
    }

    const valuation = computeValuation(lookup.carrier, {
      hasAmazonRelay: raw.hasAmazonRelay,
      authorityAgeDays: raw.authorityAgeDays ?? null,
    });

    // Persist the relay flag + computed pricing.
    await finalizeValuation(
      raw.valuationId,
      raw.sessionId,
      raw.hasAmazonRelay,
      valuation,
    );

    // Persist contact info if provided. Validate email shape if given;
    // silently drop if malformed (don't block the flow).
    if (raw.contact) {
      const cleanContact: { name?: string; email?: string; phone?: string } = {};
      if (raw.contact.name && raw.contact.name.trim().length > 0) {
        cleanContact.name = raw.contact.name.trim();
      }
      if (raw.contact.email && isEmailLikeValid(raw.contact.email)) {
        cleanContact.email = raw.contact.email.trim().toLowerCase();
      }
      if (raw.contact.phone && raw.contact.phone.trim().length > 0) {
        cleanContact.phone = raw.contact.phone.trim();
      }
      if (Object.keys(cleanContact).length > 0) {
        await updateValuationContact(
          raw.valuationId,
          raw.sessionId,
          cleanContact,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      range: formatRange(valuation),
      low: valuation.low,
      high: valuation.high,
      flooredReason: valuation.flooredReason,
    });
  } catch (err) {
    console.error("[valuation/finalize] error", err);
    return NextResponse.json(
      { error: "Could not compute valuation. Please try again." },
      { status: 500 },
    );
  }
}
