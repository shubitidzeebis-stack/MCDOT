// Vercel cron — every 5 minutes (schedule in vercel.json). Two steps:
//
//   1. syncCalMeetings() — refresh the cal_meetings mirror from cal.eu
//      (new bookings, reschedules, cancellations all reconcile here).
//   2. claimDueReminders() — SMS Lukas and Donnie 30 minutes before each
//      meeting, from the business line, with company + join link, each in
//      the recipient's own timezone. The claim column makes each meeting
//      text exactly once; the claim is released for retry ONLY when every
//      recipient's send failed — a partial failure is not retried, because
//      the claim is per-meeting and a retry would double-text whoever
//      already got theirs.
//
// Auth: same contract as process-followups — Vercel injects
// `Authorization: Bearer ${CRON_SECRET}` on scheduled runs; manual hits
// without it get 401.
//
// Recipients/sender are constants with env overrides rather than config UI:
// there is exactly one business line and exactly these two people.

import { NextResponse } from "next/server";
import { isAuthorisedCronRequest } from "@/lib/email/queue";
import { sendMessage } from "@/lib/quo/client";
import { syncCalMeetings } from "@/lib/cal/sync";
import { claimDueReminders, releaseReminder } from "@/lib/db/meetings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Quo business line — see the Quo phone-system notes.
const FROM = process.env.MEETING_REMINDER_FROM || "+13262225444";

// Every recipient gets the meeting time rendered in THEIR timezone, labeled
// so a reminder forwarded between them can't be misread (Lukas is in
// Mallorca, Donnie in Tbilisi — 2h apart, exactly the gap that causes a
// missed meeting).
const RECIPIENTS = [
  {
    name: "Lukas",
    to: process.env.MEETING_REMINDER_TO || "+13264670388",
    tz: "Europe/Madrid",
    tzLabel: "Mallorca time",
  },
  {
    name: "Donnie",
    to: process.env.MEETING_REMINDER_TO_2 || "+12832186198",
    tz: "Asia/Tbilisi",
    tzLabel: "Tbilisi time",
  },
];

function fmtTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export async function GET(req: Request) {
  if (!isAuthorisedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sync = await syncCalMeetings();

  const due = await claimDueReminders(30);
  let reminded = 0;
  const errors: string[] = [];
  for (const m of due) {
    const mins = Math.max(
      1,
      Math.round((new Date(m.starts_at).getTime() - Date.now()) / 60_000),
    );
    const who = m.legal_name ?? m.attendee_name ?? "unknown company";
    const withAttendee =
      m.legal_name && m.attendee_name ? `${who} (${m.attendee_name})` : who;
    let delivered = 0;
    for (const r of RECIPIENTS) {
      // Plain GSM-7 text on purpose — no emoji, so it stays one segment and
      // never falls into UCS-2 encoding.
      const content =
        `Meeting in ${mins} min - ${fmtTime(m.starts_at, r.tz)} ${r.tzLabel}: ` +
        `${withAttendee}.` +
        (m.join_url ? ` Join: ${m.join_url}` : "");
      const sent = await sendMessage({ from: FROM, to: r.to, content });
      if (sent.ok) {
        delivered += 1;
      } else {
        errors.push(`${m.uid}→${r.name}: ${sent.error ?? "send failed"}`);
        console.error("[meeting-reminders] send failed", m.uid, r.name, sent.error);
      }
    }
    if (delivered > 0) {
      reminded += 1;
    } else {
      // Nobody got it — release so the next tick retries. (A partial failure
      // keeps the claim: retrying would double-text the one who got theirs.)
      await releaseReminder(m.uid);
    }
  }

  return NextResponse.json({
    ok: sync.ok && errors.length === 0,
    sync,
    due: due.length,
    reminded,
    errors,
  });
}
