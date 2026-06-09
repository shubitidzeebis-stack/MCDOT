// Outreach sender — the cold-acquisition equivalent of email/queue.ts
// processQueue(), but DELIBERATELY forked:
//   - separate Resend key  (RESEND_OUTREACH_API_KEY)
//   - separate from-address (OUTREACH_EMAIL_FROM, on outreach.groupveritor.com)
// so cold M&A volume never touches the info@ transactional reputation.
//
// It reuses everything else: the branded shell, the shared unsubscribe
// suppression list + HMAC one-click link, and CAN-SPAM headers/footer.
//
// Inert until BOTH outreach env vars are set — returns {skipped:'no_sender'}.
// Sends only human-APPROVED rows, except P5 auto-send: when autoSendEnabled and
// a draft's persona is in autoSendPersonas above the score threshold, it is
// auto-approved first.

import { Resend } from "resend";
import { getConfigValue, getFlag } from "@/lib/flags";
import { isUnsubscribed } from "@/lib/db/email-followups";
import { unsubscribeUrl } from "@/lib/email/queue";
import { renderOutreachEmail } from "./render";
import { stripCrLf } from "@/lib/security/sanitize";
import {
  approveOutreach,
  discardOutreach,
  getDueOutreach,
  isOutreachPaused,
  listAutoSendCandidates,
  logAgentAction,
  markMonitorOfferSent,
  markOutreachFailed,
  markOutreachSent,
  reapStaleSending,
  setMonitorStage,
} from "@/lib/db/monitor";

const AUTO_SEND_MIN_SCORE = 70;
const SEND_CAP = 25;

export type OutreachSendResult =
  | { skipped: "no_sender" | "disabled" | "paused" }
  | { approvedAuto: number; sent: number; failed: number; suppressed: number };

export async function processOutreachQueue(): Promise<OutreachSendResult> {
  const from = process.env.OUTREACH_EMAIL_FROM;
  // Accept either the canonical name or the RESEND_OUTREACH_API_Key casing set
  // in Vercel (env var names are case-sensitive).
  const apiKey =
    process.env.RESEND_OUTREACH_API_KEY ?? process.env.RESEND_OUTREACH_API_Key;
  // Inert until the dedicated outreach sender is provisioned.
  if (!from || !apiKey) return { skipped: "no_sender" };
  // Runtime kill switch — flip outreachSendEnabled off in Edge Config to halt
  // ALL sending instantly (including already-approved + auto-send), no redeploy.
  if (!(await getFlag("outreachSendEnabled"))) return { skipped: "disabled" };
  // Auto-pause circuit breaker — tripped by the bounce/complaint webhook.
  if (await isOutreachPaused()) return { skipped: "paused" };

  // ---- P5 auto-send: auto-approve eligible drafts before the send loop. -----
  let approvedAuto = 0;
  try {
    if (await getFlag("autoSendEnabled")) {
      const personas = new Set(
        (await getConfigValue("autoSendPersonas"))
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
      if (personas.size > 0) {
        const cands = await listAutoSendCandidates(50);
        for (const c of cands) {
          if (
            c.persona &&
            personas.has(c.persona) &&
            (c.acquisition_score ?? 0) >= AUTO_SEND_MIN_SCORE
          ) {
            await approveOutreach(c.id, "auto");
            await logAgentAction("outreach_auto_approved", "agent", null, {
              outreachId: c.id,
              persona: c.persona,
              score: c.acquisition_score,
            });
            approvedAuto += 1;
          }
        }
      }
    }
  } catch (err) {
    console.error("[outreach] auto-approve failed", err);
  }

  // ---- Send approved rows. --------------------------------------------------
  // First, dead-letter any rows stranded in 'sending' by a crashed prior run —
  // the email MAY have gone out, so a human verifies in Resend before re-approving.
  const reaped = await reapStaleSending();
  if (reaped > 0) {
    console.error(`[outreach] reaped ${reaped} stale 'sending' row(s) -> failed (verify in Resend)`);
  }
  const resend = new Resend(apiKey);
  const due = await getDueOutreach(SEND_CAP);
  let sent = 0;
  let failed = 0;
  let suppressed = 0;

  for (const row of due) {
    const to = row.recipient_email;
    if (!to) {
      await markOutreachFailed(row.id, "no recipient email");
      failed += 1;
      continue;
    }
    try {
      if (await isUnsubscribed(to)) {
        // Dead-letter (NOT 'sent') — a suppressed skip must not inflate the
        // sent denominator that the bounce/complaint auto-pause rates divide by.
        await discardOutreach(row.id);
        await setMonitorStage(row.valuation_id, "suppressed");
        suppressed += 1;
        continue;
      }
      const unsub = unsubscribeUrl(to);
      const { subject, text, html } = renderOutreachEmail({
        subject: stripCrLf(row.draft_subject ?? "Acquisition inquiry"),
        bodyText: row.draft_body_text ?? "",
        unsubscribeUrl: unsub,
      });
      const { error } = await resend.emails.send({
        from,
        to,
        // Replies go back to the outreach inbox (luka@…), not info@.
        replyTo: from,
        subject,
        text,
        html,
        headers: {
          "List-Unsubscribe": `<${unsub}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      if (error) throw new Error(JSON.stringify(error));
      await markOutreachSent(row.id);
      await markMonitorOfferSent(row.valuation_id);
      await logAgentAction("outreach_sent", "agent", row.valuation_id, {
        outreachId: row.id,
        persona: row.persona,
      });
      sent += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[outreach] send failed", row.id, msg);
      await markOutreachFailed(row.id, msg);
      failed += 1;
    }
  }

  return { approvedAuto, sent, failed, suppressed };
}
