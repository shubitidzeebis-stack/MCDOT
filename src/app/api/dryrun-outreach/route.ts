// TEMPORARY test route — sends ONE sample outreach email through the real
// render + Resend path so Lukas can see exactly what a carrier receives.
// Token-gated (no secret needed from the operator). DELETE after the test.

import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  OUTREACH_TEMPLATES,
  renderFallbackDraft,
  selectPersona,
  type DraftFacts,
} from "@/lib/outreach/templates";
import { renderOutreachEmail } from "@/lib/outreach/render";
import { unsubscribeUrl } from "@/lib/email/queue";

export const runtime = "nodejs";
export const maxDuration = 30;

// Throwaway gate — this route is removed immediately after the test send.
const TEST_TOKEN = "dr_7Qp2Lf9XzVn4Ks8Bm3Hy6Tw";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("key") !== TEST_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const to = url.searchParams.get("to");
  if (!to) return NextResponse.json({ error: "missing ?to=" }, { status: 400 });

  const from = process.env.OUTREACH_EMAIL_FROM;
  const apiKey =
    process.env.RESEND_OUTREACH_API_KEY ?? process.env.RESEND_OUTREACH_API_Key;
  if (!from || !apiKey) {
    return NextResponse.json(
      { error: "outreach env not set", hasFrom: !!from, hasKey: !!apiKey },
      { status: 400 },
    );
  }

  // A realistic sample carrier (owner-operator, ~18 days from the 180 mark)
  // so the email reads exactly as a real one would.
  const facts: DraftFacts = {
    legalName: "Northbound Carriers LLC",
    dbaName: null,
    state: "OH",
    mcNumber: "1689452",
    dotNumber: "4231907",
    powerUnits: 3,
    daysTo180: 18,
    eligibilityState: "approaching",
    offerLow: null,
    offerHigh: null,
  };
  const persona = selectPersona({ powerUnits: facts.powerUnits });
  const draft = renderFallbackDraft(OUTREACH_TEMPLATES[persona], facts);
  const unsub = unsubscribeUrl(to);
  const email = renderOutreachEmail({
    subject: draft.subject,
    bodyText: draft.body,
    unsubscribeUrl: unsub,
  });

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo: from,
    subject: email.subject,
    text: email.text,
    html: email.html,
    headers: {
      "List-Unsubscribe": `<${unsub}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    id: data?.id,
    persona,
    subject: email.subject,
    to,
  });
}
