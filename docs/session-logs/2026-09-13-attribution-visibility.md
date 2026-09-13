# 2026-09-13 — make traffic visible from everywhere

Shipped: `b02124e`, pushed to main, Vercel Production `veritor-daronkmd6` Ready in 41s.

## Why

Lukas got two "New seller enquiry" emails on Sep 12 and could not tell where they
came from. He had been seeing roughly one of those a month. Tracing it turned up
two independent holes, both of which made lead sources unrecoverable.

**Hole 1 — outbound links carried no campaign tags.** The cold-outreach branded
email's orange CTA button ("See what your company is worth" → `/get-offer`) had
shipped completely untagged since the branded template went live on 2026-08-07.
`src/lib/attribution.ts` captures `utm_*` and the ad-network click IDs on first
page-load and writes them onto the `leads` / `valuations` row, so an untagged
link means the visitor arrives looking like **direct traffic** in GA4 and in our
own tables alike. With ~5,900 companies emailed and the send rate having jumped
roughly fivefold on Sep 10–11, the entire outreach channel had no measurable
conversion path. The lifecycle follow-up emails (`/faq`, `/contact` links) had
the same gap.

**Hole 2 — the source we DID capture never reached a human.** The seller-enquiry
notification in `api/contact` built an attribution block, but only into the
`text/plain` part. Mail clients render the HTML part, so Lukas's inbox copy
stopped dead at "Locale". The wizard valuation notification
(`api/valuation/finalize`) had no attribution at all, because the row's
attribution is written back at `/lookup` and finalize never read it.

## What changed

| File | Change |
|---|---|
| `src/lib/tracking-links.ts` | **new** — `tagUrl` / `tagUrlsInText` |
| `src/lib/outreach/render.ts` | tags header, CTA, footer + body URLs, both parts |
| `src/lib/outreach/send.ts` | passes persona → `utm_content`, sender → `utm_term` |
| `src/lib/email/templates.ts` | lifecycle links tagged `source=lifecycle`, per-sequence campaign |
| `src/lib/attribution.ts` | `attributionLines()`, shared by both notifications |
| `src/app/api/contact/route.ts` | renders the attribution block in the HTML half |
| `src/app/api/valuation/finalize/route.ts` | reads the row's attribution, appends "Where this lead came from" |
| `src/lib/db/valuations.ts` | `getValuationAttribution(id)` |

Tag scheme now in effect:

- cold outreach → `utm_source=outreach`, `utm_medium=email`,
  `utm_campaign=fmcsa-monitor`, `utm_content=<persona>`, `utm_term=<sender>`
- lifecycle mail → `utm_source=lifecycle`, `utm_medium=email`,
  `utm_campaign=<sequence>`
- Google Ads is unaffected; it keeps arriving with `gclid` / `gbraid`.

## Safety rules baked in

`tagUrl` only touches `groupveritor.com` URLs, never overwrites a parameter the
caller already set, and **refuses to tag `/api/unsubscribe`** — that link carries
an HMAC and is also handed to mail providers for List-Unsubscribe one-click,
which POSTs the URL verbatim. An unsubscribe click is not campaign traffic
anyway. Verified in the render test below that the token passes through byte for
byte.

## Verification

- `npx tsc --noEmit` clean.
- `npx eslint` clean on all eight touched files.
- Unit smoke test of the tagging helpers: third-party URLs untouched, existing
  params preserved, unparseable input returned as-is, trailing sentence
  punctuation kept outside the link.
- Full branded render via `tsx`: all three shell links plus the in-body URL
  tagged in **both** the HTML and text parts; `tel:` and the unsubscribe URL
  unchanged.

## Still open

- The `leads` table has no admin surface at all — it was removed from `/admin`
  on 2026-07-16. Contact-form enquiries exist only as email. Worth a panel.
- Outreach replies still land in the Outlook mailboxes on the two sending
  domains with no ingestion, and the "Results — outcomes you've recorded" panel
  on `/admin/agent` has never been used.
- Donald is still capped at 15/day in Edge Config; the requested raise to 120
  (and the global cap 135 → 240) has not been applied.
- 45 missed inbound calls sit unrecovered on `/admin/calls`, oldest Sep 4.

See `.claude/skills/ads-audit/history/2026-09-12.md` for the full audit that
surfaced this.
