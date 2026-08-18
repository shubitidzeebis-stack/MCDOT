// Vercel cron — every 5 minutes (schedule in vercel.json). Two steps:
//
//   1. syncCalMeetings() — refresh the cal_meetings mirror from cal.eu
//      (new bookings, reschedules, cancellations all reconcile here).
//   2. claimDueReminders() — SMS Lukas 30 minutes before each meeting, from
//      the business line, with company + join link. The claim column makes
//      each meeting text exactly once; a failed send releases the claim so
//      the next tick retries.
//
// Auth: same contract as process-followups — Vercel injects
// `Authorization: Bearer ${CRON_SECRET}` on scheduled runs; manual hits
// without it get 401.
//
// Recipient/sender are constants with env overrides rather than config UI:
// there is exactly one business line and one person on call. Donnie gets his
// times on the admin page; add MEETING_REMINDER_TO_2 once he has a number
// that should be texted too.

import { NextResponse } from "next/server";
import { isAuthorisedCronRequest } from "@/lib/email/queue";
import { sendMessage } from "@/lib/quo/client";
import { syncCalMeetings } from "@/lib/cal/sync";
import { claimDueReminders, releaseReminder } from "@/lib/db/meetings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Quo business line and Lukas's cell — see the Quo phone-system notes.
const FROM = process.env.MEETING_REMINDER_FROM || "+13262225444";
const TO = process.env.MEETING_REMINDER_TO || "+13264670388";

// The SMS goes to Lukas, so times are rendered in his timezone.
const SMS_TZ = "Europe/Madrid";

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SMS_TZ,
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
    // Plain GSM-7 text on purpose — no emoji, so it stays one segment and
    // never falls into UCS-2 encoding.
    const content =
      `Meeting in ${mins} min - ${fmtTime(m.starts_at)} Mallorca time: ` +
      `${withAttendee}.` +
      (m.join_url ? ` Join: ${m.join_url}` : "");
    const sent = await sendMessage({ from: FROM, to: TO, content });
    if (sent.ok) {
      reminded += 1;
    } else {
      // Release so the next tick retries — better a slightly later reminder
      // than a silently missed meeting.
      await releaseReminder(m.uid);
      errors.push(`${m.uid}: ${sent.error ?? "send failed"}`);
      console.error("[meeting-reminders] send failed", m.uid, sent.error);
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
