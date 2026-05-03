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
