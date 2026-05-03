// Branded follow-up templates. Every step returns { subject, text, html }
// for Resend. Visual design lives in `./shell.ts` so all emails share
// one source of truth.

import { SITE } from "@/lib/site";
import {
  emailShell,
  firstName,
  SIGNATURE_TEXT,
  STYLE,
} from "./shell";

function safe(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://groupveritor.com";

export type TemplateResult = {
  subject: string;
  text: string;
  html: string;
};

type TemplateContext = {
  name: string;
  email: string;
  unsubscribeUrl?: string;
  /** Optional — the page the seller submitted from (partial_recovery). */
  page?: string;
};

type TemplateFn = (ctx: TemplateContext) => TemplateResult;

// ─────────────────────────────────────────────────────────────────────────────
// Auto-reply (sent immediately when /api/contact succeeds)
// ─────────────────────────────────────────────────────────────────────────────

export const autoreply: TemplateFn = (c) => {
  const first = firstName(c.name);
  const subject = `We received your details — ${SITE.name}`;
  const preheader = `Hi ${first}, your enquiry is in. Expect us shortly.`;
  const text = [
    `Hi ${first},`,
    ``,
    `Thanks for sending your LLC details over to us.`,
    ``,
    `A member of our acquisitions team will review and come back to you within a few hours during the working week. If your LLC fits our criteria, the next step is a quick call and a written offer — no pressure either way.`,
    ``,
    `If anything urgent comes up before we reply, just answer this email.`,
    ``,
    SIGNATURE_TEXT,
  ].join("\n");
  const html = emailShell({
    preheader,
    unsubscribeUrl: c.unsubscribeUrl,
    bodyHtml: `
      <p style="${STYLE.paragraph}">Hi ${safe(first)},</p>
      <p style="${STYLE.paragraph}">Thanks for sending your LLC details over to us.</p>
      <p style="${STYLE.paragraph}">
        A member of our acquisitions team will review and come back to you
        <strong style="${STYLE.strong}">within a few hours during the working week</strong>.
        If your LLC fits our criteria, the next step is a quick call and a
        written offer &mdash; no pressure either way.
      </p>
      <p style="${STYLE.paragraphMuted}">
        If anything urgent comes up before we reply, just answer this email.
      </p>
    `,
  });
  return { subject, text, html };
};

// ─────────────────────────────────────────────────────────────────────────────
// Sequence: seller_nurture
// 4 steps, queued at /api/contact submission
// D+1 (16h) → D+4 → D+10 → D+21
// ─────────────────────────────────────────────────────────────────────────────

export const sellerNurtureStep1: TemplateFn = (c) => {
  const first = firstName(c.name);
  const subject = "Quick check — anything stuck in spam?";
  const preheader = `Hi ${first}, just making sure our reply landed in your inbox.`;
  const text = [
    `Hi ${first},`,
    ``,
    `Yesterday you sent us your LLC details. We try to reply to every enquiry within a few hours during the working week — if you didn't hear from us, it's usually one of two things:`,
    ``,
    `  1. Our reply landed in your spam / promotions folder. Worth a quick look.`,
    `  2. Your LLC didn't fit our criteria, in which case we'd have told you why.`,
    ``,
    `Either way, the easiest thing is to reply "STILL INTERESTED" to this email and I'll personally make sure the thread gets back on track.`,
    ``,
    SIGNATURE_TEXT,
  ].join("\n");
  const html = emailShell({
    preheader,
    unsubscribeUrl: c.unsubscribeUrl,
    bodyHtml: `
      <p style="${STYLE.paragraph}">Hi ${safe(first)},</p>
      <p style="${STYLE.paragraph}">
        Yesterday you sent us your LLC details. We try to reply to every enquiry within
        a few hours during the working week &mdash; if you didn&rsquo;t hear from us,
        it&rsquo;s usually one of two things:
      </p>
      <ul style="${STYLE.list}">
        <li>Our reply landed in your <strong style="${STYLE.strong}">spam / promotions folder</strong>. Worth a quick look.</li>
        <li>Your LLC didn&rsquo;t fit our criteria, in which case we&rsquo;d have told you why.</li>
      </ul>
      <p style="${STYLE.paragraph}">
        Either way, the easiest thing is to reply <strong style="${STYLE.strong}">&ldquo;STILL INTERESTED&rdquo;</strong>
        to this email and we&rsquo;ll personally make sure the thread gets back on track.
      </p>
    `,
  });
  return { subject, text, html };
};

export const sellerNurtureStep2: TemplateFn = (c) => {
  const first = firstName(c.name);
  const subject = "The three questions sellers ask before signing";
  const preheader = "MC valuation, what transfers, scam red flags — the short answers.";
  const text = [
    `Hi ${first},`,
    ``,
    `Most sellers we talk to ask the same three questions before they're ready to move. Quick answers below — full versions linked.`,
    ``,
    `1. "What's my MC actually worth?"`,
    `   Five real factors: active Amazon Relay contract (biggest), MC age, insurance, violation history, active loans. Real fair-market sits well below the $20K-$30K figures you may have heard — those are usually fraudster bait. We give a written number per LLC after a quick FMCSA pull.`,
    ``,
    `2. "What transfers at closing?"`,
    `   The LLC itself, MC + DOT records, EIN, broker setups, company phone, company email, company bank account, and the Amazon Relay contract if applicable. Trucks transfer only if they're titled to the LLC and you want them to.`,
    ``,
    `3. "How do I know you're not a scam?"`,
    `   Three checks: written purchase agreement (never verbal), funds wire through an attorney's escrow account (not direct to a person), we operate the LLC after closing (not flip it). Trade press has documented rings buying authorities for cargo theft schemes — those operations refuse legal counsel and offer cash. We do neither.`,
    ``,
    `Read the full FAQ: ${SITE_URL}/faq`,
    ``,
    SIGNATURE_TEXT,
  ].join("\n");
  const html = emailShell({
    preheader,
    unsubscribeUrl: c.unsubscribeUrl,
    cta: { label: "Read the full FAQ", href: `${SITE_URL}/faq` },
    bodyHtml: `
      <p style="${STYLE.paragraph}">Hi ${safe(first)},</p>
      <p style="${STYLE.paragraph}">
        Most sellers we talk to ask the same three questions before they&rsquo;re ready to move.
        Quick answers below.
      </p>
      <p style="${STYLE.paragraph}"><strong style="${STYLE.strong}">1. &ldquo;What&rsquo;s my MC actually worth?&rdquo;</strong></p>
      <p style="${STYLE.paragraphMuted}">
        Five real factors: active Amazon Relay contract (biggest), MC age, insurance, violation
        history, active loans. Real fair-market sits well below the $20K&ndash;$30K figures you
        may have heard &mdash; those are usually fraudster bait. We give a written number per
        LLC after a quick FMCSA pull.
      </p>
      <p style="${STYLE.paragraph}"><strong style="${STYLE.strong}">2. &ldquo;What transfers at closing?&rdquo;</strong></p>
      <p style="${STYLE.paragraphMuted}">
        The LLC itself, MC + DOT records, EIN, broker setups, company phone, company email,
        company bank account, and the Amazon Relay contract if applicable. Trucks transfer only
        if they&rsquo;re titled to the LLC and you want them to.
      </p>
      <p style="${STYLE.paragraph}"><strong style="${STYLE.strong}">3. &ldquo;How do I know you&rsquo;re not a scam?&rdquo;</strong></p>
      <p style="${STYLE.paragraphMuted}">
        Three checks: written purchase agreement (never verbal), funds wire through an
        attorney&rsquo;s escrow account (not direct to a person), and we operate the LLC after
        closing (not flip it). Operations refusing legal counsel and offering cash are the ones
        you avoid. We do neither.
      </p>
    `,
  });
  return { subject, text, html };
};

export const sellerNurtureStep3: TemplateFn = (c) => {
  const first = firstName(c.name);
  const subject = "If we'd already made you an offer, here's the timeline";
  const preheader = "Day-by-day breakdown of what closing actually looks like.";
  const text = [
    `Hi ${first},`,
    ``,
    `One reason sellers stall: it's hard to picture what the next two weeks would actually look like. Here's the unedited version, day by day.`,
    ``,
    `Day 1 — You submit your details. We pull FMCSA, verify MC standing, check insurance and Relay status. Within hours we reply with either a written number or "here's why we're passing."`,
    ``,
    `Day 2-3 — Letter of intent signed. Locks the price. Outlines what transfers (LLC, MC, DOT, EIN, phone, email, bank, contracts).`,
    ``,
    `Day 3-7 — Diligence. Tax filings current, no undisclosed liens, violation history matches. Our legal counsel drafts the purchase agreement (we pay those fees, not you).`,
    ``,
    `Day 7-14 — Sign and wire. Final purchase agreement signed by both parties. Closing wire same-day or next-day. Phone / email / bank credentials handed over per checklist.`,
    ``,
    `Bottlenecks are usually outside our control: bank takes a day to update signatories, lender consent on a loan payoff, FMCSA portal access transfer. We've seen all of these and we know how to handle them.`,
    ``,
    `If you'd like a real number on your specific LLC, the form's still open: ${SITE_URL}/contact`,
    ``,
    SIGNATURE_TEXT,
  ].join("\n");
  const html = emailShell({
    preheader,
    unsubscribeUrl: c.unsubscribeUrl,
    cta: { label: "Get a free valuation", href: `${SITE_URL}/contact` },
    bodyHtml: `
      <p style="${STYLE.paragraph}">Hi ${safe(first)},</p>
      <p style="${STYLE.paragraph}">
        One reason sellers stall: it&rsquo;s hard to picture what the next two weeks would
        actually look like. Here&rsquo;s the unedited version, day by day.
      </p>
      <p style="${STYLE.paragraph}"><strong style="${STYLE.strong}">Day 1 &mdash; Submit + triage.</strong></p>
      <p style="${STYLE.paragraphMuted}">
        We pull FMCSA, verify MC standing, check insurance and Relay status. Within hours we
        reply with either a written number or &ldquo;here&rsquo;s why we&rsquo;re passing.&rdquo;
      </p>
      <p style="${STYLE.paragraph}"><strong style="${STYLE.strong}">Day 2&ndash;3 &mdash; Letter of intent.</strong></p>
      <p style="${STYLE.paragraphMuted}">
        Locks the price. Outlines what transfers (LLC, MC, DOT, EIN, phone, email, bank, contracts).
      </p>
      <p style="${STYLE.paragraph}"><strong style="${STYLE.strong}">Day 3&ndash;7 &mdash; Diligence.</strong></p>
      <p style="${STYLE.paragraphMuted}">
        Tax filings current, no undisclosed liens, violation history matches. Our legal counsel
        drafts the purchase agreement &mdash; we pay those fees, not you.
      </p>
      <p style="${STYLE.paragraph}"><strong style="${STYLE.strong}">Day 7&ndash;14 &mdash; Sign and wire.</strong></p>
      <p style="${STYLE.paragraphMuted}">
        Final purchase agreement signed by both parties. Closing wire same-day or next-day.
        Phone / email / bank credentials handed over per checklist.
      </p>
      <p style="${STYLE.paragraphMuted}">
        Bottlenecks are usually outside our control: bank takes a day to update signatories,
        lender consent on a loan payoff, FMCSA portal access transfer. We&rsquo;ve seen all of
        these and we know how to handle them.
      </p>
    `,
  });
  return { subject, text, html };
};

export const sellerNurtureStep4: TemplateFn = (c) => {
  const first = firstName(c.name);
  const subject = "Closing the loop";
  const preheader = "We won't keep emailing. Reply anytime if priorities shift.";
  const text = [
    `Hi ${first},`,
    ``,
    `Three weeks ago you got in touch about your LLC. We've sent a few follow-ups since — this is the last one. We won't keep emailing.`,
    ``,
    `If priorities shift and you'd like to revisit, just reply to this email. Your enquiry is still on file and we can pick up from where we left off.`,
    ``,
    `If you've decided to keep operating, or you've already sold to someone else, all good — wishing you the best either way.`,
    ``,
    SIGNATURE_TEXT,
  ].join("\n");
  const html = emailShell({
    preheader,
    unsubscribeUrl: c.unsubscribeUrl,
    bodyHtml: `
      <p style="${STYLE.paragraph}">Hi ${safe(first)},</p>
      <p style="${STYLE.paragraph}">
        Three weeks ago you got in touch about your LLC. We&rsquo;ve sent a few follow-ups since
        &mdash; this is the last one. <strong style="${STYLE.strong}">We won&rsquo;t keep emailing.</strong>
      </p>
      <p style="${STYLE.paragraph}">
        If priorities shift and you&rsquo;d like to revisit, just reply to this email. Your
        enquiry is still on file and we can pick up from where we left off.
      </p>
      <p style="${STYLE.paragraphMuted}">
        If you&rsquo;ve decided to keep operating, or you&rsquo;ve already sold to someone
        else, all good &mdash; wishing you the best either way.
      </p>
    `,
  });
  return { subject, text, html };
};

// ─────────────────────────────────────────────────────────────────────────────
// Sequence: partial_recovery (single step)
// Triggered by cron when partial_leads sits unconverted for >30 min.
// ─────────────────────────────────────────────────────────────────────────────

export const partialRecoveryStep1: TemplateFn = (c) => {
  const first = firstName(c.name);
  const subject = "Saw you started — anything we can help with?";
  const preheader = "Looks like you started filling out our form. We're here.";
  const text = [
    `Hi ${first},`,
    ``,
    `We noticed you started filling out our enquiry form earlier today but didn't finish. No pressure — sometimes life gets in the way.`,
    ``,
    `If you'd like to pick up where you left off, the form is still here: ${SITE_URL}/contact`,
    ``,
    `Or if it's easier, reply to this email with your LLC name + MC number and I'll come back with a written valuation directly.`,
    ``,
    SIGNATURE_TEXT,
  ].join("\n");
  const html = emailShell({
    preheader,
    unsubscribeUrl: c.unsubscribeUrl,
    cta: { label: "Resume your enquiry", href: `${SITE_URL}/contact` },
    bodyHtml: `
      <p style="${STYLE.paragraph}">Hi ${safe(first)},</p>
      <p style="${STYLE.paragraph}">
        We noticed you started filling out our enquiry form earlier today but didn&rsquo;t
        finish. No pressure &mdash; sometimes life gets in the way.
      </p>
      <p style="${STYLE.paragraphMuted}">
        Or if it&rsquo;s easier, reply to this email with your LLC name + MC number and
        we&rsquo;ll come back with a written valuation directly.
      </p>
    `,
  });
  return { subject, text, html };
};
