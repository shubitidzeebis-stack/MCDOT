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

### Pending Phase 2

- **Calendar tool wiring** — "Schedule a call" CTA currently opens
  a `mailto:` to `info@groupveritor.com` with valuation context
  pre-filled. Replace with Cal.com / Calendly embed once user picks one.
- **ES/RU localized wizards** — copy strings still hardcoded English
  in `ValuationWizard.tsx`. Move to `i18n.ts` dict and create
  `/es/get-offer` + `/ru/get-offer` routes.
- **MobileCTA wiring** — bottom mobile CTA still points to `/contact`.
  Update to `/get-offer` for EN.
- **Email follow-up sequence** — wizard completions don't yet trigger
  the autoreply / nurture sequence. Either fold into existing
  `email/queue.ts` or build a new sequence specific to valuation
  completers.
- **Slack notification on completion** — currently nothing fires.
  Follow `notifications/slack.ts` pattern.
- **Admin view** — `/admin` shows leads but not valuations. Add a
  Valuations table view.

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
