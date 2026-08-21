// Quo webhook liveness watchdog — run from the cron.
//
// WHY: Quo auto-disables a webhook whose deliveries keep failing, and a
// disabled webhook is SILENT — no calls, no messages, no missed-call board,
// and Quo does not redeliver events from the disabled period. On 2026-08-18
// exactly that happened and nobody noticed for 3 days, because Quo's own
// notification email landed in an inbox with the sender blocked.
//
// So we watch our own ingest instead: if no Quo event has arrived for longer
// than STALE_AFTER_HOURS, email the team inbox from our own (trusted) domain
// with the re-enable runbook. The business line sees traffic essentially
// every day, so a genuine quiet spell longer than the threshold is rare — and
// a rare false alarm is a far better failure mode than 3 dark days.
//
// Dedupe: at most one alert per ALERT_EVERY_HOURS while the outage persists,
// tracked in monitor_cursor (id 'quo-webhook-stale-alert') so it survives
// serverless instance churn.

import { Resend } from "resend";
import { SITE } from "@/lib/site";
import { getCursor, latestQuoWebhookEventAt, setCursor } from "@/lib/db/monitor";

const STALE_AFTER_HOURS = 26;
const ALERT_EVERY_HOURS = 20;
const CURSOR_ID = "quo-webhook-stale-alert";

export type LivenessResult = {
  ok: boolean;
  lastEventAt: string | null;
  staleHours: number | null;
  alerted: boolean;
};

function hoursSince(iso: string): number {
  return (Date.now() - Date.parse(iso)) / 3_600_000;
}

export async function checkQuoWebhookLiveness(): Promise<LivenessResult> {
  const lastEventAt = await latestQuoWebhookEventAt();
  // Never seen a Quo event (fresh DB / feature not live) — nothing to watch.
  if (!lastEventAt) return { ok: true, lastEventAt: null, staleHours: null, alerted: false };

  const staleHours = hoursSince(lastEventAt);
  if (!Number.isFinite(staleHours) || staleHours < STALE_AFTER_HOURS) {
    return { ok: true, lastEventAt, staleHours: Math.round(staleHours * 10) / 10, alerted: false };
  }

  const cursor = await getCursor(CURSOR_ID);
  // Unparseable last_run_at maps to 0 ("just alerted") — fail QUIET: the
  // wrong way round would email every 15-minute cron run for a whole outage.
  const sinceAlert = cursor?.last_run_at ? hoursSince(cursor.last_run_at) : Infinity;
  const lastAlert = Number.isFinite(sinceAlert) || sinceAlert === Infinity ? sinceAlert : 0;
  if (lastAlert < ALERT_EVERY_HOURS) {
    return { ok: false, lastEventAt, staleHours: Math.round(staleHours), alerted: false };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      await new Resend(apiKey).emails.send({
        from: SITE.emailFrom,
        to: SITE.email,
        subject: `🚨 Quo webhook looks DEAD — no events for ${Math.round(staleHours)}h`,
        text: [
          `No Quo webhook event has reached ${SITE.name} since ${lastEventAt} (UTC).`,
          ``,
          `Most likely Quo auto-disabled the "Admin calls page" webhook after failed`,
          `deliveries — while it is off, ALL call/message ingestion is silently dead`,
          `and Quo will NOT redeliver the missed events.`,
          ``,
          `Check: my.quo.com → Settings → Webhooks. If it shows disabled, open the`,
          `webhook's DETAIL page and toggle Status back on (the toggle on the list`,
          `page ignores clicks), then backfill the gap from the Quo API if it`,
          `matters. If the webhook is enabled and the line was simply quiet (e.g. a`,
          `weekend), this was a false alarm and you can ignore it.`,
          ``,
          `This alert repeats at most every ${ALERT_EVERY_HOURS}h while the feed stays quiet.`,
        ].join("\n"),
      });
      await setCursor(CURSOR_ID, null, { lastEventAt, staleHours: Math.round(staleHours) });
      return { ok: false, lastEventAt, staleHours: Math.round(staleHours), alerted: true };
    } catch (err) {
      console.error("[quo/liveness] alert email failed", err);
    }
  } else {
    console.error("[quo/liveness] RESEND_API_KEY missing — cannot send stale-webhook alert");
  }
  return { ok: false, lastEventAt, staleHours: Math.round(staleHours), alerted: false };
}
