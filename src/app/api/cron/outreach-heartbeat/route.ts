// Vercel cron — 18:15 ET on weekdays (vercel.json: "15 22 * * 1-5", UTC).
// The outreach sender runs 10:00–17:45 ET, so by 18:15 the day is final.
//
// Why this exists: from 2026-09-06 to 09-09 the sender produced ZERO emails
// for four consecutive days. Every candidate the sweep examined failed the
// FMCSA authority/insurance check, nothing was drafted, nothing was sent, and
// nothing told anyone — the auto-pause breaker only trips on bounces and
// complaints, so a silent starvation is invisible to it. This cron closes the
// gap: a weekday that ends at zero sends, or well under the daily cap, raises
// an ops email and a Slack ping.
//
// Deliberately quiet when the stop is intentional: outreachSendEnabled=false
// (the Edge Config kill switch) or the breaker has paused sending. Auth is the
// same CRON_SECRET contract as the other crons; a manual hit without it is 401.

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { isAuthorisedCronRequest } from "@/lib/email/queue";
import { getConfigValue, getFlag } from "@/lib/flags";
import {
  getOutreachControl,
  getOutreachSentTodayEt,
  logAgentAction,
} from "@/lib/db/monitor";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Below this share of the daily cap on a weekday, something is throttling the
// pipeline even if it is not fully dark. Sep 5 2026 was 44 of 135 (33%) the day
// before the outage — a lower bar would have caught it a day early.
const LOW_SHARE = 0.35;

function etLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function etWeekday(): string {
  return new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  });
}

async function slack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* best effort */
  }
}

async function opsEmail(subject: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: SITE.emailFrom,
      to: SITE.email,
      subject,
      text,
    });
    if (error) {
      console.error("[outreach-heartbeat] ops email error", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[outreach-heartbeat] ops email failed", err);
    return false;
  }
}

export async function GET(req: Request) {
  if (!isAuthorisedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const day = etWeekday();
  if (day === "Sat" || day === "Sun") {
    return NextResponse.json({ ok: true, skipped: "weekend" });
  }
  if (!(await getFlag("outreachSendEnabled"))) {
    return NextResponse.json({ ok: true, skipped: "sending_disabled" });
  }
  const control = await getOutreachControl();
  if (control.paused) {
    return NextResponse.json({
      ok: true,
      skipped: "breaker_paused",
      reason: control.reason,
    });
  }

  const sent = await getOutreachSentTodayEt();
  if (sent < 0) {
    // Could not read the log — say so rather than cry wolf or stay silent.
    await opsEmail(
      "⚠️ Outreach heartbeat could not check today's sends",
      "The heartbeat cron ran but could not read agent_actions. " +
        "Check the database and https://groupveritor.com/admin/agent by hand.",
    );
    return NextResponse.json({ ok: false, skipped: "db_unavailable" });
  }

  const cap = Math.min(
    500,
    Math.max(1, Number(await getConfigValue("outreachDailyCap")) || 20),
  );
  const level = sent === 0 ? "zero" : sent < cap * LOW_SHARE ? "low" : "ok";
  if (level === "ok") {
    return NextResponse.json({ ok: true, sent, cap, level });
  }

  const label = etLabel();
  const subject =
    level === "zero"
      ? `⛔ Outreach sent NOTHING today (${label})`
      : `⚠️ Outreach low today: ${sent} of ${cap} (${label})`;
  const text =
    (level === "zero"
      ? `The cold-outreach sender produced zero emails on ${label}, a weekday, ` +
        `with sending enabled and the breaker not tripped.\n\n`
      : `The cold-outreach sender produced only ${sent} emails on ${label} ` +
        `against a daily cap of ${cap}.\n\n`) +
    `Last time this happened (Sep 6–9, 2026) the sweep was examining ~640 ` +
    `candidates a day and every one failed the FMCSA authority/insurance ` +
    `check, so nothing was drafted. Nobody noticed for four days.\n\n` +
    `Where to look:\n` +
    `  1. https://groupveritor.com/admin/agent — "Drafts queued" and ` +
    `"Ready to email". If drafts are 0 while ready is in the thousands, ` +
    `the top of the pool is stale rows the FMCSA check rejects.\n` +
    `  2. Recent activity on the same page — a run of ` +
    `"draft_blocked_motus" with no "Offer email sent" confirms it.\n` +
    `  3. The Vercel cron log for the sweep, in case it stopped firing.\n\n` +
    `Sends today: ${sent}. Daily cap: ${cap}.`;

  const [emailed] = await Promise.all([
    opsEmail(subject, text),
    slack(
      level === "zero"
        ? `:octagonal_sign: OUTREACH SENT NOTHING today (${label}). Sending is on and the breaker is not tripped — the pipeline starved. Check /admin/agent.`
        : `:warning: Outreach low today: ${sent} of ${cap} (${label}). Check /admin/agent.`,
    ),
  ]);
  await logAgentAction("outreach_heartbeat_alert", "cron", null, {
    sent,
    cap,
    level,
    emailed,
  });

  return NextResponse.json({ ok: true, sent, cap, level, alerted: true, emailed });
}
