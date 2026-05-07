// Sends a real-time Slack alert when a new lead lands. Configured via
// the SLACK_WEBHOOK_URL env var — when missing, the function silently
// no-ops so the contact route keeps working in environments without
// Slack wired up.
//
// To enable: create a Slack incoming webhook at
// https://api.slack.com/messaging/webhooks and set the resulting URL
// as SLACK_WEBHOOK_URL on Vercel.

import type { ContactPayload } from "@/lib/security/schemas";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://groupveritor.com";

export async function notifySlackNewLead(
  lead: ContactPayload,
  meta: { id?: number; priority?: "high" | "medium" | "low" },
): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  const priorityEmoji =
    meta.priority === "high"
      ? "🔥"
      : meta.priority === "medium"
        ? "⚡"
        : "💬";

  const fields: Array<{ title: string; value: string; short: boolean }> = [];
  fields.push({
    title: "Email",
    value: lead.email,
    short: true,
  });
  fields.push({ title: "Phone", value: lead.phone, short: true });
  if (lead.company) fields.push({ title: "Company / LLC", value: lead.company, short: true });
  if (lead.mc) fields.push({ title: "MC #", value: lead.mc, short: true });
  fields.push({
    title: "Amazon Relay",
    value: lead.hasRelay === "yes" ? "Yes" : lead.hasRelay === "no" ? "No" : "—",
    short: true,
  });
  fields.push({
    title: "Insurance",
    value: lead.insurance || "—",
    short: true,
  });
  if (lead.mcAgeDays) fields.push({ title: "MC age (days)", value: lead.mcAgeDays, short: true });
  if (lead.state) fields.push({ title: "State", value: lead.state, short: true });
  fields.push({
    title: "Locale",
    value: lead.locale,
    short: true,
  });

  // Surface attribution when we have it.
  const attr = lead.attribution as Record<string, string> | null | undefined;
  if (attr) {
    const summary = [
      attr.attr_utm_source && `utm_source=${attr.attr_utm_source}`,
      attr.attr_utm_campaign && `utm_campaign=${attr.attr_utm_campaign}`,
      attr.attr_utm_medium && `utm_medium=${attr.attr_utm_medium}`,
      attr.attr_referrer && `referrer=${attr.attr_referrer.slice(0, 80)}`,
    ]
      .filter(Boolean)
      .join("\n");
    if (summary) fields.push({ title: "Attribution", value: summary, short: false });
  }

  if (lead.notes) {
    fields.push({
      title: "Notes",
      value: lead.notes.slice(0, 1000),
      short: false,
    });
  }

  const body = {
    attachments: [
      {
        color:
          meta.priority === "high"
            ? "#ff8a1a"
            : meta.priority === "medium"
              ? "#ffb371"
              : "#7a7a7a",
        pretext: `${priorityEmoji} *New ${meta.priority ?? "lead"}* — <${SITE_URL}/contact|view site>`,
        title: `${lead.name}${lead.company ? ` · ${lead.company}` : ""}`,
        title_link: `${SITE_URL}/contact`,
        fields,
        footer: `Veritor lead #${meta.id ?? "?"}`,
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Keep it tight — if Slack is slow, don't block the user.
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.warn("[slack] webhook returned", res.status);
    }
  } catch (err) {
    console.warn("[slack] webhook failed", err);
  }
}

// Wizard valuation completion ping — separate from the contact-form
// shape because we have richer FMCSA data and a computed range.
export async function notifySlackNewValuation(payload: {
  legalName: string;
  dotNumber: string;
  mcNumber: string | null;
  range: string;
  hasAmazonRelay: boolean;
  flooredReason: string | null;
  contact: { name?: string; email?: string; phone?: string };
  authorityStatus: string;
  authorityAgeDays: number | null;
  powerUnits: number;
  drivers: number;
  crashes24mo: number;
  safetyRating: string | null;
  vehicleOosRate: number;
  driverOosRate: number;
}): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  const emoji = payload.hasAmazonRelay ? "🔥" : "💬";
  const color = payload.hasAmazonRelay
    ? "#ff8a1a"
    : payload.flooredReason
      ? "#7a7a7a"
      : "#ffb371";

  const fields: Array<{ title: string; value: string; short: boolean }> = [];
  fields.push({ title: "Range", value: payload.range, short: true });
  fields.push({
    title: "Active Relay",
    value: payload.hasAmazonRelay ? "Yes" : "No",
    short: true,
  });
  fields.push({
    title: "Authority",
    value:
      payload.authorityStatus === "A"
        ? "Active for-hire"
        : payload.authorityStatus === "I"
          ? "Inactive"
          : "—",
    short: true,
  });
  if (payload.authorityAgeDays !== null) {
    fields.push({
      title: "Auth age",
      value: `${Math.round(payload.authorityAgeDays / 30)} mo`,
      short: true,
    });
  }
  fields.push({
    title: "Fleet",
    value: `${payload.powerUnits} units · ${payload.drivers} drivers`,
    short: true,
  });
  fields.push({
    title: "OOS V/D",
    value: `${payload.vehicleOosRate}% / ${payload.driverOosRate}%`,
    short: true,
  });
  fields.push({
    title: "Crashes 24mo",
    value: String(payload.crashes24mo),
    short: true,
  });
  if (payload.safetyRating) {
    fields.push({
      title: "Safety",
      value:
        payload.safetyRating === "S"
          ? "Satisfactory"
          : payload.safetyRating === "C"
            ? "Conditional"
            : payload.safetyRating === "U"
              ? "Unsatisfactory"
              : payload.safetyRating,
      short: true,
    });
  }
  if (payload.contact.email) {
    fields.push({ title: "Email", value: payload.contact.email, short: true });
  }
  if (payload.contact.phone) {
    fields.push({ title: "Phone", value: payload.contact.phone, short: true });
  }
  if (payload.flooredReason) {
    fields.push({
      title: "Floored",
      value: payload.flooredReason,
      short: false,
    });
  }

  const titleSuffix = payload.mcNumber ? ` · MC-${payload.mcNumber}` : "";
  const body = {
    attachments: [
      {
        color,
        pretext: `${emoji} *Wizard valuation* — <${SITE_URL}/admin|admin panel>`,
        title: `${payload.legalName} · USDOT ${payload.dotNumber}${titleSuffix}`,
        fields,
        footer: payload.contact.name
          ? `Submitted by ${payload.contact.name}`
          : "Wizard submission",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.warn("[slack valuation] webhook returned", res.status);
    }
  } catch (err) {
    console.warn("[slack valuation] webhook failed", err);
  }
}
