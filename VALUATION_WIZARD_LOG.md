# Valuation Wizard Work Log

Replaces (or supplements) the contact form with an MC/DOT-driven 2-step
wizard that pulls FMCSA data and returns a value range.

---

## Status (2026-05-07)

🟢 **Phase 1 shipped to main (pending Vercel deploy).** Wizard live at
`/get-offer`. Hero + Header CTAs route EN traffic there. ES/RU still
go to `/contact` (wizard not yet localized).

### Files added
- `src/lib/fmcsa.ts` — typed FMCSA QCMobile API client
- `src/lib/valuation.ts` — pricing algorithm + range formatter
- `src/lib/db/valuations.ts` — DB persistence (`valuations` table,
  auto-created on first write)
- `src/app/api/valuation/lookup/route.ts` — step 1 endpoint
- `src/app/api/valuation/finalize/route.ts` — step 2 endpoint
- `src/components/ValuationWizard.tsx` — 5-step branded wizard
- `src/app/get-offer/page.tsx` — wizard page

### Files modified
- `src/components/Hero.tsx` — primary CTA → `/get-offer` (EN only)
- `src/components/Header.tsx` — both CTA buttons → `/get-offer` (EN only)
- `src/app/privacy/page.tsx` — new section 2.4 disclosing FMCSA wizard
- `src/app/terms/page.tsx` — section 3 expanded with wizard disclaimer

### Env
- `FMCSA_API_KEY` set in `.env.local` + Vercel (production + development).
  **Rotate after live test.**

### Live verification needed (post-deploy)
- [ ] Hit `/get-offer`, walk through with a real MC. Verify FMCSA pull
      returns expected fields.
- [ ] Verify `valuations` row appears in Neon DB after step 1.
- [ ] Verify pricing range appears on step 5.
- [ ] Verify `valuations.contact_email` populated after step 4.
- [ ] Test floor case: try a carrier with inactive authority — should
      return $8,000 flat.

### Phase 2 — shipped 2026-05-07

- ✅ **SAFER HTML scrape** added to `lib/fmcsa.ts`. Pulls `telephone`
  and `MCS-150 Form Date` from SAFER's public snapshot HTML — neither
  is in the QCMobile JSON despite being in the API docs.
- ✅ **Authority age auto-computed** from MCS-150 date and used in
  pricing automatically. No longer asked from user.
- ✅ **Phone pre-filled** in step 3 from SAFER scrape (user can edit).
- ✅ **Wizard redesigned** — one step visible at a time, thin top
  progress bar (% + "Step N of 5"), custom dark TCPA checkbox, logo
  on white pill (cream-on-dark contrast).
- ✅ **i18n localized** — wizard strings in `i18n.ts` for en/es/ru.
  `/es/get-offer` + `/ru/get-offer` pages live. Hero + Header CTAs
  route to locale-matched wizard.
- ✅ **Email autoreply wired** — wizard finalize triggers
  `seller_nurture` sequence (step 1 = immediate autoreply, then 4-step
  nurture) and sends a team notification with the carrier + range.
- ✅ **Admin valuations view** at `/admin?key=…` — third table after
  Leads. Shows company, DOT/MC, authority, age, Relay flag, range,
  contact, fleet size, OOS rates, crashes. Header KPIs include
  Relay-flagged + email-captured counts.

### Phase 3 — shipped 2026-05-07

- ✅ **Cal.com inline embed** wired into wizard step 5
  (`https://cal.eu/lukaveritor/15min`). Pre-fills name + email + a
  notes block with carrier name / DOT / MC / range / Relay flag.
  User can still edit anything in Cal's form before confirming.
- ✅ **CSP updated** — script-src + connect-src + frame-src now allow
  app.cal.eu, app.cal.com, cal.eu, cal.com.
- ✅ **MobileCTA** routes to `/get-offer` (EN) /
  `/[locale]/get-offer` (ES/RU). Wizard URLs added to HIDDEN_PATHS so
  the bottom CTA hides when already on the wizard.
- ✅ **Slack notification** on wizard completion with full carrier
  snapshot + range + Relay flag. Set SLACK_WEBHOOK_URL env to enable.
- ✅ **Status workflow** — `status` column on valuations
  (`new` → `contacted` → `diligence` → `offer_sent` → `closed_won` /
  `closed_lost`). Defaults to `new` on insert.
- ✅ **Internal notes** — `notes_internal` column for admin-side notes.
- ✅ **Admin panel rebuilt** — `/admin?key=Luka20Gio22` loads. New
  features:
  - KPI cards (total / Relay / email-captured / closed-won + value)
  - Filter bar (status / Relay / email / search)
  - Inline status dropdowns with optimistic update
  - Detail drawer per row with FMCSA snapshot + notes editor
  - CSV export of all valuations
  - Pipeline-value calc across contacted/diligence/offer-sent

### Admin login
- URL: `https://groupveritor.com/admin?key=Luka20Gio22`
- Password is `Luka20Gio22` — set as `ADMIN_KEY` on Vercel (production
  + development envs) and in local `.env.local`.

### Phase 4 — shipped 2026-05-07

- ✅ **Multi-user auth** — proper per-user login flow at `/admin/login`.
  - 4 seeded accounts: `luka@`, `lisa@`, `keira@`, `giorgi@groupveritor.com`
  - Initial shared password = `Luka20Gio22` (the existing ADMIN_KEY value).
    Each user is expected to change it post-first-login.
  - Passwords hashed with scrypt (Node built-in, no deps).
  - Sessions: stateless HMAC-signed cookie (`veritor_admin`), 7-day TTL.
  - Brute-force guard: 10 attempts / 15 min per IP.
  - Legacy `?key=ADMIN_KEY` URL still works as emergency fallback.
- ✅ **Email-from-admin** — compose + send from the detail drawer.
  - 4 templates (intro, diligence, offer-followup, blank custom).
  - `{{name}}` and `{{range}}` placeholders auto-fill from row data.
  - Sent from `info@groupveritor.com`, reply-to = logged-in admin's email
    so seller replies thread correctly to whoever sent it.
  - Rate-limited to 30 sends/hour per admin per IP.
- ✅ **Admin header refactor** — current user name + email shown,
  Sign-out button calls `/api/admin/logout` and redirects to login.

### Phase 4 — skipped (per user)

- ❌ Wizard A/B copy testing.

### Phase 4 — blocked (needs Cal.com API key)

- 🔒 **Realtime "next available slot" preview** on wizard reveal —
  needs a Cal.com API key from `https://cal.com/settings/developer/api-keys`.
  Add it as `CAL_API_KEY` env var when ready and ping me to wire it up.

### Phase 5 — shipped 2026-05-07

- ✅ **Cal.com embed switched to iframe** (was rendering empty —
  cal.eu's 307 redirect to www.cal.eu was breaking the JS SDK origin
  handshake). Iframe handles the redirect transparently. CSP extended
  to `www.cal.eu` + `www.cal.com`.
- ✅ **Insurance status display** — `bipdInsuranceOnFile` +
  `bipdInsuranceRequired` derive an `insurance_status` value
  ("active" / "lapsed" / "not_required" / "unknown") shown on wizard
  step 2 and admin detail drawer. Stored on valuations table.
- ✅ **Delete row from admin** — POST `/api/admin/valuations/delete`
  + Del button per row + confirm dialog. Used to clear test rows.
- ✅ **Self-service password change** at `/admin/account` — verifies
  current password before update, rate-limited 5 attempts/30min.
- ✅ **Team member management** at `/admin/account` — add new admin
  (email + name + initial password), reset other users' passwords,
  remove other users (can't remove yourself, can't remove the last
  admin).
- ✅ **Email send history per valuation** — every send via
  `/api/admin/email/send` now logs to `admin_email_log` table.
  History surfaces in the detail drawer with sender, subject, body
  (collapsible).

### Email scraping — confirmed not possible from FMCSA

Re-verified twice: the QCMobile JSON does not include `email` despite
the documentation listing `telephone`. SAFER's public HTML snapshot
also has no email field. FMCSA explicitly marks MCS-150 email as
**confidential**. Phone is public; email is not.

Available paths for email enrichment, if Veritor wants to invest:
- **Hunter.io** — domain → emails ($49+/month)
- **Apollo / Snov.io / Lusha** — same idea, varies on price
- These look up emails via their own datasets. We'd plug whichever the
  user picks into the wizard's contact step as a "did you mean…?"
  pre-fill suggestion.

For now the wizard collects email directly from the seller — no
reliable way around this.

### Phase 6 — shipped 2026-05-07

- ✅ **Hero MC/DOT input form** — primary CTA replaced with an inline
  toggle (MC/DOT) + input + "Check your company" button. On submit,
  routes to `/get-offer?kind=...&number=...` and the wizard auto-runs
  the FMCSA lookup, landing the seller directly on step 2.
- ✅ **Hero animation lag fixed** — MaskWords duration cut from 1.0s
  to 0.55s, stagger from 0.08 to 0.05, and all delay chains collapsed.
  Total hero reveal now lands in ~1.3s vs ~3s before.
- ✅ **Wizard UI polish** — top wordmark logo with transparent
  background (no white pill), thin progress strip only (no percentage,
  no step counter), bigger faded wordmark below the form.
- ✅ **Cal.com realtime slot preview** — `/api/cal/next-slots` calls
  the v2 slots API on cal.eu; reveal screen shows up to 3 upcoming
  slots above the embed ("Next available: Thu May 8, 9:00 AM").
- ✅ **Copy: 2-week → 3-5 business days** — replaced everywhere across
  homepage, layout meta, OG images, how-it-works, requirements, why,
  about, get-offer, blog, email templates, and i18n dict.
- ✅ **Copy: response hours** — "during the working week" → "every
  day of the week" across all surfaces (i18n, thanks, email templates,
  autoreply).
- ✅ **Copy: step 1 header** — "Submit your details" → "Check your
  MC" everywhere (i18n, how-it-works, OG images).
- ✅ **Copy: in-person bank closing** — how-it-works Day 7-14 fully
  rewritten as Day 3-5: in-person meeting at the seller's bank
  (typically Amazon-Relay-attached), face-to-face signing,
  counter-side wire transfer. Email sequence updated to match.
- ✅ **Copy: deal-bottlenecks demoted** — was an h3 section in
  how-it-works, now a small footnote-style paragraph in muted text.
- ✅ **Copy + logic: 180-day rule flipped** — no longer about
  "fresh MC under 180 days", now about MC + insurance continuously
  active for **at least** 6 months (Amazon Relay's actual onboarding
  requirement). Updated in: requirements page, requirements OG,
  ContactForm qualifier, lead-priority logic (lib/db/leads.ts), and
  pricing algorithm (lib/valuation.ts).
- ✅ **Team member added** — Managing Partner card placed second in
  the leadership grid (under Luka). Photo at
  `/about/team-managing-partner.jpg`. **Name placeholder is `[Name TBD]`**
  — user needs to provide the real name. Grid expanded to
  `lg:grid-cols-5` to accommodate 5 cards.

### Open / blocked

- 🔓 **Managing Partner name** — using "[Name TBD]" placeholder.
  Send the actual name and I'll swap it in.
- **Email enrichment service** (Hunter / Apollo) — still pending a
  budget decision.
- **Audit log** — track who changed what status / notes / deleted
  what row.
- **Bulk admin actions** — "mark all selected as Contacted", "delete
  selected".

## Agreed scope

### UX

- New page: `/get-offer`
- Hero CTA on homepage: "Get a free valuation"
- Wizard steps:
  1. Enter MC or DOT number → fetch FMCSA → show legal name / address /
     authority status / safety rating to confirm
  2. (If FMCSA didn't return email) Enter email
  3. Yes/no — Active Amazon Relay contract?
  4. Reveal: company info summary + valuation **range** + "Schedule a
     call" CTA
- Professional industry-standard wizard styling: progress indicator,
  Veritor branding, dark + amber palette consistent with rest of site

### Pricing rules

- **Range only**, never specific number
- **Floor**: $8,000 (no exceptions)
- **Ceiling**: $22,000 default; **up to $25,000 for top-tier
  Amazon-Relay carriers with A+ safety**
- Min/max NEVER displayed publicly anywhere on site as static numbers
- Range is computed per carrier and shown as `$X,XXX–$Y,XXX`

### Pricing algorithm (v1, tweak after launch)

```
base_low  = 8000
base_high = 8000

If has_active_authority = false → return { low: 8000, high: 8000 }

factors = 0  # 0..1 multiplier on the spread
If has_amazon_relay:        factors += 0.30
If authority_age_days < 180: factors += 0.20
ElseIf authority_age_days < 365: factors += 0.10
ElseIf authority_age_days > 730: factors -= 0.15

If vehicle_oos_pct < national_avg: factors += 0.15
If driver_oos_pct  < national_avg: factors += 0.15
If vehicle_oos_pct >= 50: factors -= 0.50  # floor trigger
If driver_oos_pct  >= 50: factors -= 0.50

If crashes_24mo > 5:  factors -= 0.15
ElseIf crashes_24mo > 2: factors -= 0.10

# Spread between floor and ceiling
ceiling = has_amazon_relay AND safety_rating == 'A+' ? 25000 : 22000
spread  = ceiling - 8000
midpoint = 8000 + (spread * clamp(factors, 0, 1))

low  = max(8000, midpoint - 1500)
high = min(ceiling, midpoint + 1500)
```

Outputs `{ low, high }`. Spread of ~$3K around midpoint = wide enough
to feel honest, narrow enough to anchor.

### Data flow

1. User enters MC/DOT → `POST /api/valuation/lookup`
2. Server calls FMCSA QCMobile API (with caching)
3. Server saves carrier data to `valuations` table immediately (even
   before user provides contact info — capture every lookup)
4. Returns FMCSA data to client (without valuation yet)
5. Client confirms identity, captures missing email if FMCSA didn't
   provide it
6. Client asks Amazon Relay yes/no
7. `POST /api/valuation/finalize` with relay flag → server computes
   range, updates valuations row, returns range
8. Reveal screen: range + "Schedule a call" CTA
9. CTA → calendar booking integration (TBD: Cal.com / Calendly)

### Database schema (new `valuations` table)

```sql
CREATE TABLE IF NOT EXISTS valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  mc_number TEXT,
  dot_number TEXT,
  legal_name TEXT,
  dba_name TEXT,
  authority_status TEXT,           -- 'A' | 'I'
  authority_granted_date DATE,
  authority_age_days INT,
  power_units INT,
  drivers_count INT,
  phy_address JSONB,
  vehicle_oos_pct NUMERIC,
  vehicle_oos_national_avg NUMERIC,
  driver_oos_pct NUMERIC,
  driver_oos_national_avg NUMERIC,
  crashes_24mo INT,
  safety_rating TEXT,
  has_amazon_relay BOOLEAN,
  valuation_low INT,
  valuation_high INT,
  fmcsa_raw JSONB,
  -- attribution
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  gclid TEXT,
  fbclid TEXT,
  -- contact
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_provided_at TIMESTAMPTZ,
  -- meta
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_valuations_mc ON valuations(mc_number);
CREATE INDEX IF NOT EXISTS idx_valuations_dot ON valuations(dot_number);
CREATE INDEX IF NOT EXISTS idx_valuations_session ON valuations(session_id);
CREATE INDEX IF NOT EXISTS idx_valuations_email ON valuations(contact_email);
CREATE INDEX IF NOT EXISTS idx_valuations_created ON valuations(created_at DESC);
```

### Edge cases (all handled)

- Invalid MC → friendly error
- Brand new MC <30d not in FMCSA → fallback to existing contact form
- Inactive/revoked authority → still show data, lock to $8K floor
- FMCSA API down → graceful fallback message + form link
- High OOS rate (≥50%) → floor price, no exceptions

### Privacy / Terms updates

- Disclose: we query FMCSA public records using your MC/DOT
- Disclose: we store FMCSA snapshot indefinitely associated with
  contact info if provided
- TCPA consent before contact capture
- e-SIGN compliance reaffirmed

### Forms strategy

- Wizard = primary CTA path
- Existing contact form = fallback at `/contact` (linked from footer
  + from wizard error states)

## Decisions / rationale

- **Range, not specific number** — public price anchoring would hurt
  negotiation. User confirmed: range, with min/max never shown publicly
  as static numbers.
- **Capture data immediately on first lookup** — even if user bounces
  before providing contact info, we have the FMCSA enrichment for
  later outreach. Per user's explicit preference.
- **$25K ceiling reserved for A+ Amazon Relay carriers** — competitive
  flexibility for the highest-value prospects without elevating the
  default ceiling.
- **Schedule-a-call CTA, not "submit & we'll respond"** — once the
  valuation is shown, momentum is high. Calendar booking captures that
  intent immediately.

## Pending / blocked

- **API key rotation needed** — `5fed2f5e05d8...` was shared in chat
  twice. After build verifies it works, rotate via FMCSA portal and
  update env var only (never check into code or share again).
- **Calendar tool decision** — Cal.com / Calendly / SavvyCal? Free
  tier is fine for now. User to pick before "Schedule a call" CTA goes
  live. For now I'll wire the CTA to a placeholder URL that opens the
  existing form as a stop-gap.

## History

### 2026-05-07
- User proposed wizard concept replacing forms.
- Strategy questions resolved (see Agreed scope above).
- This log file created.
- Implementation starting: FMCSA client → DB migration → pricing →
  API routes → wizard UI → hero CTA → privacy.
