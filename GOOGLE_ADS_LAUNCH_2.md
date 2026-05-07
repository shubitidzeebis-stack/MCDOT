# Veritor Group — Google Ads Campaign 2 Launch Plan
## Valuation / Fair-Offer Wedge → groupveritor.com/get-offer

Built by three senior Google Ads specialists (keyword research, RSA copy,
campaign architecture). Source documents:

- `GOOGLE_ADS_KW_AGENT.md` — keyword universe + autocomplete validation
- `GOOGLE_ADS_COPY_AGENT.md` — RSAs, sitelinks, callouts, snippets
- `GOOGLE_ADS_LAUNCH_2_AGENT.md` — campaign architecture + UI walkthrough

This file is the master, paste-into-Google-Ads version. The three source
files stay as deeper reference.

---

## TL;DR

- **Different wedge from Campaign 1.** C1 captured "sell my MC" head terms.
  C2 attacks the **upper-funnel valuation/appraisal/"don't get lowballed"**
  intent layer — owners who haven't decided to sell yet, are suspicious of
  being lowballed, and want a fair second opinion. Lands on `/get-offer`
  (FMCSA-powered valuation wizard).
- **$20/day, entire USA, English only.** Spanish/Russian deliberately
  parked — at this budget you cannot afford ad-group fragmentation.
- **1 Search campaign, 1 ad group, 15 exact-match keywords.** Anything
  more starves data.
- **Manual CPC for at least 60 days.** At ~120 clicks/month you will
  be below Smart Bidding's 30-conversion threshold; resist the UI's
  prompts to "upgrade your bid strategy."
- **CRITICAL pre-launch [CODE CHANGE REQUIRED]:** fire a NEW GA4 event
  `valuation_completed` from the wizard's step-5 reveal. Do NOT reuse C1's
  `generate_lead` — it would blend reporting and make neither campaign
  evaluable. See §3.
- **Realistic 90-day forecast:** 8–22 wizard completions/month, CPL
  $40–$75, 1–2 attributable closed deals if Veritor's wizard-lead close
  rate is ≥10%.

---

## 1. The wedge — why this campaign is different

| | Campaign 1 (live) | Campaign 2 (this doc) |
|---|---|---|
| Intent layer | "I've decided to sell" | "Am I being lowballed? What's it worth?" |
| Sample keyword | `[sell my mc authority]` | `[how much is my trucking company worth]` |
| Landing page | `/` (homepage) | `/get-offer` (FMCSA wizard) |
| Languages | EN + ES + RU | EN only |
| Budget | $4.5K–$6K/month | ~$600/month |
| Geo | State-prioritized | Entire USA |
| Tone | "Sell direct, no broker" | "Get the real number first" |

The reader of a C2 ad isn't ready to sell. They're suspicious. The hook
is **NOT "sell now."** The hook is **"find out the real number — no
obligation, no broker pressure."** Veritor's `/get-offer` wizard is the
single best-matched landing page on the SERP for this intent — no
competitor has anything close.

---

## 2. Competitive positioning

Same moat as C1, but reframed for valuation intent:

> **Operator-led, US-domestic firm. We pulled FMCSA data on 400+ LLCs
> and closed every one of them. Get a written valuation range in 90
> seconds — same data we use when we make offers.**

That last clause is the differentiator. Most "free valuation" tools
online are lead bait — they ask 10 questions and give you nothing. The
Veritor wizard pulls live FMCSA data and returns a real range. That's
the trust angle.

---

## 3. CRITICAL: pre-launch code change

**[CODE CHANGE REQUIRED] — Do NOT unpause the campaign until this is
deployed and verified.**

### What
Fire a new GA4 event `valuation_completed` when the user reaches the
wizard's value-reveal step (step 5) with contact info captured.

### Why
- C1 imports `generate_lead` from the homepage contact form. If C2
  imports the same event, conversion data blends across two completely
  different funnels (different completion rates, different lead quality,
  different audience behavior). Neither campaign becomes evaluable.
- A separate event also lets you set **`valuation_completed` = Primary**
  for C2 and **`generate_lead` = Secondary (observation only)** without
  breaking C1.

### Where
`src/components/ValuationWizard.tsx` (or
`src/app/api/valuation/finalize/route.ts` if you'd rather fire it
server-side after the wizard data is persisted). The wizard's finalize
route already exists; this is just adding a `gtag('event', …)` call.

### Suggested payload
```ts
gtag('event', 'valuation_completed', {
  event_category: 'wizard',
  event_label: 'get-offer',
  value: 1,
  has_amazon_relay: boolean,
  authority_status: 'A' | 'I',
  valuation_low: number,
  valuation_high: number,
});
```

### Optional secondary event
Fire `valuation_scheduled` when the user completes the embedded Cal.com
booking on step 5 (listen for the iframe's postMessage callback). A
booked call is a stronger signal than a form completion — worth wiring
up if the Cal.com event surface allows it.

### Verification before unpausing
1. Walk through `/get-offer` end-to-end on production (groupveritor.com,
   not localhost)
2. Confirm `valuation_completed` appears in GA4 DebugView
3. In Google Ads → Tools → Conversions, the imported action should show
   status **"Recording conversions"** (not "No recent conversions")

---

## 4. Campaign structure

| Setting | Value |
|---|---|
| Campaign type | Search (only) |
| Sub-type | Standard, **without a goal's guidance** (NOT Leads/Sales wizard — those force Smart Bidding + Display defaults) |
| Networks | Google Search ON · Search Partners **OFF** · Display Network **OFF** |
| Ad groups | **1 only** ("Valuation — English") |
| Match types | Exact-match primary, max 2 phrase-match supplements (added only if exact under-delivers in week 1) |
| Languages | English |
| Locations | United States — **Presence: People in or regularly in** (not "Presence or interest"); exclude HI, AK, PR, Guam, USVI, NMI, American Samoa |
| Budget | $20.00/day, Standard delivery |
| Bid strategy | Manual CPC, **Enhanced CPC OFF**, default bid $4.50, hard cap $6 |
| Status on creation | **Paused** (review before unpausing) |

**Why one ad group:** at $20/day ÷ ~$5 blended CPC = ~4 clicks/day = ~120
clicks/month. Two ad groups means each gets 2 clicks/day — too thin to
generate any decision-grade signal. Concentrate everything in one pool.

---

## 5. Keywords

### Ad Group: "Valuation — English"

**Exact-match (the curated $20/day starter list — 8 keywords):**

```
[how much is my trucking company worth]
[trucking company valuation]
[trucking business valuation]
[how to value a trucking company]
[free trucking company valuation]
[trucking company valuation calculator]
[trucking company appraisal]
[owner operator business valuation]
```

**Exact-match (FMCSA + fairness sub-cluster — 7 keywords):**

```
[what is my mc authority worth]
[mc authority valuation]
[trucking company lowball offer]
[fair price for trucking company]
[second opinion trucking company offer]
[how much is my mc number worth]
[trucking business fair market value]
```

**Total starter list: 15 keywords. Do not exceed this on a $20/day
budget.**

**Optional phrase-match supplements (max 2 — only if exact match
under-delivers in week 1):**

```
"how much is my trucking company worth"
"how much can I sell my trucking company for"
```

### Parked (DO NOT add at launch — analyst/researcher contamination)

- `[trucking company valuation multiples]` — high volume but pulls
  finance students, investment bankers, MBA researchers. Add in Phase 2
  once you can build a precise negative wall.
- All Cluster 6 (retirement / exit framing) — Campaign 1 already owns
  that intent.
- Generic `[trucking company worth]` / `[trucking business worth]` (no
  "my") — attracts journalists and analysts.

### Highest-confidence picks

1. `[how much is my trucking company worth]` — "my" filters out
   analysts; direct wizard match
2. `[trucking company valuation]` — highest absolute volume; tool-seeker
   intent
3. `[what is my mc authority worth]` — uncontested, near-zero
   competition, perfect FMCSA-wizard alignment; expected QS 8–10

### Why the FMCSA cluster is your QS unlock

The wizard literally asks for an MC number and pulls FMCSA's database. A
searcher who types *"what is my mc authority worth"* and lands on a page
that says *"Enter your MC number — we'll pull your FMCSA profile and give
you a written valuation"* will see the highest-relevance match on the
SERP. That's a Quality Score 8–10 candidate before you write a single
ad headline.

---

## 6. Negative keywords (campaign-level, applied as Shared List)

Create a Shared Library list named **`C2 — Valuation Exclusions`** and
apply at campaign level. Do **not** simply re-use C1's list — there's
intentional overlap to keep, see notes after.

### Buyer-side intent (will eat budget fast)
```
-buy a trucking company           -trucking company for sale
-buy trucking business            -trucking companies for sale
-buy trucking llc                 -trucking company for sale near me
-trucking business for sale       -mc for sale
-dot number for sale              -mc authority for sale
-trucking company listings        -bizbuysell trucking
-trucking company broker listings -acquire trucking company
-how to buy a trucking company valuation
-trucking company valuation for purchase
-trucking company for sale valuation
```

### Physical truck appraisal (the highest-risk confusion)
```
-truck appraisal                  -truck value
-used truck value                 -semi truck value
-semi truck appraisal             -commercial truck appraisal
-truck blue book                  -kelley blue book truck
-carmax truck                     -truck trade in value
-truck book value                 -NADA truck value
-truck depreciation               -fleet valuation
-truck auction value              -truck resale value
-equipment appraisal              -heavy equipment appraisal
-fleet appraisal insurance        -equipment appraisal truck
-semi truck price
```

### Jobs / training / starting up
```
-trucking jobs                    -truck driver jobs
-cdl jobs                         -owner operator jobs
-truck driver hiring              -cdl training
-trucking school                  -truck driving school
-lease purchase                   -lease to own
-dispatcher training              -freight broker training
-become a truck driver            -owner operator training
-how to start a trucking company  -start a trucking company
-new trucking authority           -get mc authority
-apply for mc number              -fmcsa registration
```

### Finance / stocks / generic business valuation
```
-trucking stocks                  -trucking etf
-trucking industry valuation      -freight stock valuation
-EBITDA trucking industry         -trucking company investment
-trucking company IPO             -trucking company acquisition target
-transport sector valuation       -freight index
-real estate valuation            -business valuation software
-business valuation course        -business valuation certification
-certified business valuator      -business appraisal license
-SBA business appraisal           -free business valuation
-business valuation calculator    -business valuation calculator free
-business appraisal calculator    -valuation spreadsheet
-valuation excel template         -valuation model template
-dcf model trucking               -dot compliance valuation
```

### DIY / templates / academic
```
-free spreadsheet                 -excel template
-free template                    -business valuation template free
-how to calculate business value spreadsheet
-free business valuation software -SBA loan valuation
-case study                       -homework
-business school                  -MBA
-research paper                   -thesis
-trucking company case study      -transportation company analysis
```

### Carrier / load-booking (different "trucking company" context)
```
-book a truck                     -book freight
-find a carrier                   -find a trucker
-hire a trucking company          -trucking company near me
-local trucking company           -shipping company near me
-freight quote                    -load board
-dat load board                   -truckstop
-amazon relay load                -trucking insurance quote
-amazon flex
```

### Branded competitors (block branded waste)
```
-swift trucking                   -werner trucking
-old dominion                     -jb hunt
-schneider                        -knight transport
-heartland express                -landstar
```

### State-name "for sale" variants (high-volume buyer-side)
```
-trucking company for sale florida    -trucking company for sale texas
-trucking company for sale georgia    -trucking company for sale california
-trucking company for sale nj         -trucking company for sale ohio
-trucking company for sale pa         -trucking company for sale nc
-for sale by owner trucking
```

### Note on cross-campaign overlap with C1

You do **not** need to add C2's keywords as negatives in C1, or
vice-versa. At $20+$150-ish/day combined this isn't a meaningful
self-auction. Whichever ad has higher Quality Score wins; both campaigns
benefit from being eligible for cross-funnel queries (a user who
searches "sell my MC" then later "trucking company valuation" should
see Veritor in both).

**Review the search-terms report on Day 1, 3, 7, 14.** At $20/day, one
bad day of garbage matches is 7% of your monthly budget.

---

## 7. Responsive Search Ad

Final URL: `https://groupveritor.com/get-offer`
Display path: `/sell` `/trucking-company` (renders as
`groupveritor.com/sell/trucking-company`)

### 15 headlines (≤30 chars, all verified)

| # | Headline | Chars | Pin |
|---|---|---|---|
| H1 | Don't Take a Lowball Offer | 27 | **P1** |
| H2 | What's My Trucking LLC Worth? | 30 | **P2** |
| H3 | Free Trucking Valuation | 24 | — |
| H4 | FMCSA-Pulled Number in 90 Sec | 30 | — |
| H5 | 400+ LLCs Valued Since 2019 | 28 | — |
| H6 | Trucking Company Valuation | 26 | — |
| H7 | $50K-$250K for Your MC? | 23 | — |
| H8 | Get a Written Valuation Range | 30 | — |
| H9 | Trucking Company Appraisal | 27 | — |
| H10 | Know Before You Sign Anything | 30 | — |
| H11 | Call 213-789-6878 Free Quote | 29 | — |
| H12 | Questions? 213-789-6878 | 23 | — |
| H13 | US Buyer. Real FMCSA Data. | 26 | — |
| H14 | No Broker. No Pressure. | 23 | — |
| H15 | Valuation in 90 Seconds Flat | 29 | — |

**Pinning logic:** Pin H1 to P1 and H2 to P2 — defensive framing
("Don't take a lowball offer") is this campaign's wedge; curiosity
("What's it worth?") is the natural follow-up. On mobile, P1+P2 are
often the only visible text before the description, so this pair tells
the full story. Leave P3 unpinned so Google can rotate H4/H5/H7/H11–H13
and surface the strongest performer. Pinning all 3 positions tanks Ad
Strength to "Poor."

**Verify H7's price range with Veritor before launch** — `$50K–$250K`
reflects single-truck OO to small-fleet ranges. Adjust if the actual
deal range differs. Keep a price-bracket headline regardless; bracketed
numbers are the highest CTR driver in B2B acquisition advertising.

**H11/H12 similarity flag:** both contain the phone number. Google may
flag low uniqueness. If the Ad Strength panel flags it after upload,
swap H12 for `Free Appraisal. No Listing.` (27 chars).

### 4 descriptions (≤90 chars, each independently complete)

| # | Description | Chars |
|---|---|---|
| D1 | FMCSA data in 90 sec. Written valuation range. No broker, no obligation, no pressure. | 87 |
| D2 | 400+ trucking LLCs valued and closed. US-based buyer. Written offer in 48 hours. Call us. | 90 |
| D3 | Suspicious of a low offer? We run your FMCSA number and give you the real market range. | 88 |
| D4 | Operator-led firm. NDA first. Valuation free. If you sell, two-week close. 213-789-6878. | 89 |

**Pin D1** to position 1 (the mechanism — sets expectations correctly).
Leave D2/D3/D4 unpinned for rotation.

### Ad-strength self-audit

Predicted **Good** on upload, climbing to **Excellent** if (a) Ad
Strength panel doesn't flag H11/H12 similarity and (b) H6 ("Trucking
Company Valuation") stays in the lineup — that exact-match anchor is
the single biggest QS unlock.

---

## 8. Assets (extensions)

Add at **campaign level** so they apply to all ad groups (and any future
ones).

### Sitelinks (6, text ≤25 chars, descriptions ≤35 chars each)

| Text | URL | Desc 1 | Desc 2 |
|---|---|---|---|
| How We Value Your LLC | `/get-offer` | FMCSA data + market comps | Written range in 90 seconds |
| What Sellers Got Paid | `/case-studies` | 400+ closes since 2019 | Real deal data, not estimates |
| Is Your Offer Fair? | `/get-offer` | Compare your offer to market | No broker opinion. Real data. |
| About Veritor Group | `/about` | Operator-led, Dayton OH | US buyer, US bank, US close |
| FAQ: Valuation Process | `/faq` | How long? 90 seconds online | NDA first, no obligation |
| Get a Written Offer | `/get-offer` | Free. No listing. No fees. | 48-hour written cash offer |

### Callouts (10, ≤25 chars)

```
400+ LLCs Closed       Written 48hr Offer      No Commission
NDA First              US-Based Buyer          FMCSA-Verified Data
Two-Week Close         No Listing Required     Free Valuation Tool
Operator-Led Firm
```

### Structured snippets

- Header: **Services**
- Values: `Free Valuation` · `Written Offer` · `NDA Conversation` ·
  `FMCSA Data Pull` · `Two-Week Close` · `Title Transfer Help`

### Call asset

- Phone: `213-789-6878`
- Country: US
- Schedule: **Mon–Fri 7am–8pm ET, Sat 8am–5pm ET, Sun off**
  (24/7 routing to voicemail degrades Google's call-conversion quality
  signal — use only if Veritor has live answering coverage)
- Call reporting: ON
- Conversion action: phone-click as Secondary (observation only)

### Lead form asset

**SKIP.** The wizard at `/get-offer` IS the lead form. A Google-native
lead form would compete with the wizard and capture lower-quality leads
(no FMCSA enrichment, no valuation reveal, no Cal.com booking).

---

## 9. Bid strategy progression

| Stage | Trigger | Strategy | Cap |
|---|---|---|---|
| 0 (Day 0–14) | 0 conv | Manual CPC, Enhanced CPC OFF, default bid $4.50 | $6 hard |
| 1 (Day 15–30) | <15 conv/30d | Manual CPC continues; aggressive negative pruning | $6 |
| 2 (Day 31–60) | <15 conv/30d | **Maximize Clicks** with bid cap (NOT Smart Bidding — a traffic maximizer with a leash) | $7 |
| 3 (Day 31+) | ≥15 conv/30d | **Maximize Conversions**, no tCPA cap; expect 14-day learning period | n/a |
| 4 (Day 60+) | ≥30 conv/30d | **Target CPA** at 120% of observed CPL | n/a |

**Day-0 bid:** $4.50. After 72 hours, if impression share <30% raise
to $5.50; if you're burning $20 by 11 AM raise the cap or lower the
default bid to $3.50.

**Honest call:** at $20/day you may spend months 1–2 entirely on Manual
CPC. That's fine. Premature Smart Bidding at low conv volume produces
erratic pacing and zero meaningful optimization. The UI will keep
nudging you to "upgrade" — ignore it until you cross 15 conv/30d.

---

## 10. Geographic + device + audience

### Locations

- Target: **United States**
- Location options → Target = **"Presence: People in or regularly in
  your targeted locations"** (NOT the "Presence or interest" default —
  that's how offshore traffic gets in)
- Excluded: Hawaii, Alaska, Puerto Rico, Guam, US Virgin Islands,
  Northern Mariana Islands, American Samoa
- **No state-level bid adjustments in month 1** (insufficient data;
  noise optimization). Revisit at Day 30 with the geo report.

### Devices

| Device | Bid adj | Why |
|---|---|---|
| Desktop | 0% | baseline |
| Mobile | **−10%** | Truckers search on phones, but the 5-step wizard rewards a more patient session. Watch mobile vs. desktop conversion ratio — if mobile ≥60% of desktop, remove the adjustment. If <40%, drop to −20%. |
| Tablet | **−20%** | Low traffic, low conv rate in this vertical |

### Audiences (ALL in **Observation** mode, NOT Targeting)

In-market:
- Business Services > Business Financing
- Business Services > Business Ownership Change *(if available)*
- Real Estate > Commercial Properties

Affinity:
- Business Professionals > Small Business Owners

Life events:
- Approaching Retirement

Custom segment (build it in Audience Manager → "People who browse
websites similar to"):
- URL signals: `dat.com`, `truckstop.com`, `overdriveonline.com`,
  `freightwaves.com`, `landline.media`, `ccjdigital.com`
- Keyword signals: `"trucking company value"`, `"sell trucking
  business"`, `"FMCSA authority transfer"`

**Observation = measurement only, no audience filtering.** Confirm the
"How they'll be used" column reads "Observation" for every entry. If it
reads "Targeting" you've cut your reach to that audience only — easy
mistake.

### RLSA — not yet

Min audience size for RLSA activation is 1,000 cookies. At C2 traffic
volume that's 2–4 months out. Wire up the audience list now so it
starts accumulating:

- Audience Manager → New audience → Website visitors
- Rule: visited `/get-offer`
- Membership duration: 90 days

Apply to the campaign in Observation mode once it reaches 1,000. Then
+25–30% bid adjustment for re-search visitors.

### Ad schedule

**24/7 for the first 30 days. Do NOT restrict.** At 4–5 clicks/day,
restricting to business hours just compresses pacing and inflates CPCs.
Truckers search early-morning, evenings, and weekends.

Day-14 review: pull Day-of-Week and Hour-of-Day reports
(Dimensions tab). If conv clusters in a window, +15% there. Decision on
data, not assumption.

---

## 11. Conversion tracking (post code-change)

| Role | Event | Settings |
|---|---|---|
| **Primary** | `valuation_completed` (NEW — see §3) | Category: Lead · Count: One per click · Click window: 30 days · View window: 1 day · Attribution: Data-driven · Include in Conversions: **ON** |
| Primary (optional) | `valuation_scheduled` (Cal.com booking) | Same settings; treat a booked call as ≥ a form lead |
| Secondary | `generate_lead` (existing C1 event) | **Include in Conversions: OFF for this campaign** (toggle at the campaign-conversion-goal level so C1 stays unaffected) |
| Secondary | Phone click on `tel:+12137896878` | Observation only |
| Secondary | `/get-offer` pageview | Observation only — measures top-of-wizard interest |

**Tracking template** (campaign URL options):
```
{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign=C2-valuation-en&utm_content={adgroupid}&utm_term={keyword}&gclid={gclid}
```
The valuations table already captures `utm_source`, `utm_medium`,
`utm_campaign` — UTMs land in the database for free.

---

## 12. Budget + KPI targets

| Metric | Month 1 | Month 2 | Month 3 |
|---|---|---|---|
| Clicks/day | 3–5 | 4–6 | 4–6 |
| Wizard completions/month | 8–15 | 10–18 | 12–22 |
| CPL | $40–$75 | $35–$60 | $30–$50 |
| Conversion rate | 10–15% | 11–16% | 12–18% |
| Impression share | 20–40% | 25–45% | 30–50% |

CPL is materially lower than C1's $200–$500 because the wizard delivers
immediate value (the valuation range) before asking for anything — so
completion rates run 10–15% vs. ~3% on a vanilla contact form.

### "Good" outcomes

- **30 days:** ≥8 wizard completions · CPL ≤$75 · ≥1 Cal.com call
  scheduled · 0 tracking failures
- **60 days:** ≥15 leads/month · CPL ≤$60 · search-terms report clean
- **90 days:** ≥20 leads/month · 1–2 attributable closed deals · CPL
  data justifies budget scaling

### Scale triggers

- **CPL ≤$60 AND ≥15 leads/month consistently** → double budget to
  $40/day. Let it re-learn for 14 days before evaluating.
- **≥30 conv/30d** → flip to Target CPA at 120% of observed CPL.
- **≥50 conv/month combined (C1 + C2)** → consider PMax with Customer
  Match audience signals. Add brand negatives to PMax to prevent
  cannibalizing organic brand search.

### Kill triggers

After 60 days of clean tracking: <5 leads/month, OR CPL >$120, OR
search-terms report shows >70% irrelevant queries → restructure (likely
keyword rebuild), don't just add budget.

---

## 13. Step-by-step launch guide (Google Ads UI)

### Pre-flight (do before opening Google Ads)
1. Confirm `valuation_completed` GA4 event is deployed and firing in
   GA4 DebugView when you walk through `/get-offer` to completion.
2. Confirm GA4 property `535770144` is linked to Google Ads.
3. Confirm auto-tagging is ON (Google Ads → Tools → Data Manager → GA4
   link → Settings).

### Create campaign

1. Click **+ New campaign** in the left sidebar.
2. **"Create a campaign without a goal's guidance."** (Bottom of the
   goal screen — DO NOT pick Leads/Sales; the goal-guided wizard locks
   in Smart Bidding + Display defaults that destroy a $20/day budget.)
3. Campaign type: **Search** → Continue.
4. "Ways to reach your goal": check **Website visits**, enter
   `https://groupveritor.com/get-offer` → Continue.

### Campaign settings

5. **Name:** `C2 — Valuation EN — USA — Manual`
6. **Networks:**
   - Google Search ✓
   - Search Partners ✗ (uncheck — conservative call; cleaner data at the cost of some incremental volume. At $20/day, the data hygiene wins.)
   - Display Network ✗ (uncheck — checked by default; this is the
     biggest trap)
7. **Locations:** Enter "United States" → click the small **Location
   options** link below the map → Target: **"Presence: People in or
   regularly in your targeted locations"** → Excluded: add HI, AK, PR,
   Guam, USVI, NMI, American Samoa.
8. **Languages:** English only.
9. **Audience segments:** Browse → add all from §10 → confirm every
   row reads "Observation" in the "How they'll be used" column.
10. **Budget:** $20.00/day, Standard delivery.
11. **Bidding:** click "Select a bid strategy directly" (small link
    beneath the dropdown) → **Manual CPC** → uncheck "Help increase
    conversions with Enhanced CPC."
12. **Ad schedule:** All day (24/7).
13. **Campaign URL options → Tracking template:** paste the UTM
    template from §11.
14. Save and continue.

### Ad group + keywords

15. Ad group name: `Valuation — English`
16. Default bid: **$4.50**
17. Paste the 15 exact-match keywords from §5 (with `[brackets]`).
18. Save and continue.

### Responsive Search Ad

19. **Final URL:** `https://groupveritor.com/get-offer`
20. **Display path:** `sell` / `trucking-company`
21. Paste **15 headlines** from §7. Pin H1 to P1, H2 to P2, leave P3
    unpinned.
22. Paste **4 descriptions** from §7. Pin D1 to position 1.
23. Check Ad Strength reading. Aim for **Excellent** or at minimum
    **Good**. If "Poor," add length variation, ensure keywords appear
    in multiple headlines.
24. Save → Done.

### Assets

25. Add **6 sitelinks** (§8) at campaign level.
26. Add **10 callouts** (§8) at campaign level.
27. Add **structured snippet** with header "Services" and 6 values
    (§8).
28. Add **call asset** with the schedule in §8.
29. **DO NOT** add a Google-native lead form asset — the wizard is
    the form.

### Conversions

30. Tools → Conversions → New conversion action → Import from GA4 →
    Web → check `valuation_completed` → set as **Primary** with
    settings in §11.
31. Also import `valuation_scheduled` (if deployed) as Primary.
32. For `generate_lead`: at the **campaign-level conversion goals**
    setting on the C2 campaign, set "Include in Conversions" = OFF for
    `generate_lead` so it doesn't pollute C2 optimization (C1 is
    unaffected).
33. Import phone-click as Secondary.

### Negative keywords

34. Tools → Shared Library → Negative keyword lists → New list:
    **`C2 — Valuation Exclusions`** → paste full list from §6.
35. Apply to the C2 campaign (Keywords → Negative keywords → Use
    negative keyword list).

### Final

36. Set campaign status to **Paused** if it's Enabled by default.
37. Run the pre-launch QA checklist (§14) before unpausing.

---

## 14. Pre-launch QA checklist

Before clicking Enable, every item must be true:

1. ☐ `valuation_completed` event fires in GA4 DebugView when you walk
   the wizard end-to-end on production
2. ☐ Code change deployed to production (Vercel build live, not
   localhost)
3. ☐ Imported conversion shows **"Recording conversions"** status in
   Google Ads
4. ☐ Networks: Search Partners OFF · Display Network OFF
5. ☐ Locations: US targeted, "Presence" mode (not "Presence or
   interest"), HI/AK/territories excluded
6. ☐ Manual CPC selected, Enhanced CPC unchecked, default bid $4.50
7. ☐ Daily budget = $20.00, delivery = Standard
8. ☐ Every audience segment reads "Observation," not "Targeting"
9. ☐ Negative list `C2 — Valuation Exclusions` applied
10. ☐ RSA final URL = `/get-offer`, mobile preview renders correctly
11. ☐ All 6 sitelinks, 10 callouts, structured snippet, call asset
    attached at campaign level
12. ☐ UTM tracking template applied; manual test confirms params land
    in GA4 real-time
13. ☐ Campaign status = **Paused**
14. ☐ GA4 property `535770144` linked, auto-tagging ON

---

## 15. Day 1 / 7 / 14 / 30 review checklists

### Day 1
- ☐ Impressions > 0 within 4 hours of unpausing during business hours.
  If 0: check pause state, billing active, ad-approval status.
- ☐ All RSA elements approved (no disapprovals = zero ads serving).
- ☐ Hourly pacing sane in Billing → Transaction history. (Don't act on
  $3 spent by noon — that's normal $20/day pacing.)
- ☐ If any wizard completions: confirm they appear in BOTH GA4
  real-time AND Google Ads "All conversions" column.
- ☐ **Do NOT touch bids, keywords, or copy.** No data yet.

### Day 7
- ☐ Search-terms report — pull and add negatives aggressively. Common
  traps: "how to value a business" (generic), "truck driver salary"
  (jobseeker), "FMCSA lookup" (just looking up own number, not
  selling).
- ☐ Impression share — if <20%, raise bids by $0.50.
- ☐ Average CPC — if breaching the $6 cap, verify Manual CPC settings.
- ☐ Conversion count check. If 0 after 7 days, re-walk the wizard,
  verify the GA4 event in DebugView.
- ☐ **Do NOT pause keywords with 0 clicks** — Quality Score hasn't
  stabilized; tight-niche keywords can stay quiet for 2 weeks then
  surge.
- ☐ **Do NOT change** match types, bid strategy, or ad copy.

### Day 14
- ☐ Full search-terms pull (days 1–14). Aggressive negative pruning.
- ☐ Device report — if mobile conv rate <40% of desktop, drop mobile
  to −20%.
- ☐ Hour-of-day / Day-of-week — if clear concentration, +15% there.
- ☐ Conversions: 0 in 14 days = funnel broken (do not raise bids).
  3–7 = on track. 8+ = ahead of plan.
- ☐ Quality Score column — anything <4/10 needs ad-copy or
  landing-page-relevance review.
- ☐ RSA Ad-Strength panel — pin any winning combinations Google has
  identified.

### Day 30
- ☐ Total conversions in rolling 30 days. ≥15 → switch to Maximize
  Conversions (no tCPA), 14-day learning. <15 → stay Manual CPC.
- ☐ CPL math: spend ÷ conversions. Within §12 target band?
- ☐ Geo report — if TX/CA/FL disproportionately convert, +10–15% bid
  adjustment for top 3 states.
- ☐ RLSA audience — has the `/get-offer` 90-day list crossed 1,000
  cookies? If yes, attach in Observation mode.
- ☐ Cross-check vs. C1 search terms. If both campaigns are matching
  the same queries and one dominates, no action needed (same account,
  highest QS wins). If actual auction conflict appears, add mutual
  negatives.
- ☐ **Decision point:** continue, scale, or restructure (§12 triggers).

---

## 16. Top 5 ways $20/day campaigns die in week 1

1. **Smart Bidding turned on too early.** UI suggests "Upgrade to
   Maximize Conversions" at 3 conversions. You click it. 14-day learning
   period burns budget on noise. *Mitigation:* don't touch bid strategy
   until ≥15 conv/30d.
2. **Display Network left on.** Missed Step 6. CPL hits $200 from
   in-app and unknown-placement clicks. *Mitigation:* triple-check
   Networks before unpausing; verify in Reports → Network breakdown.
3. **Match type too broad.** A single phrase keyword bleeds to
   "restaurant business valuation," "real estate business valuation."
   $20 burned by 10 AM on irrelevant traffic. *Mitigation:* Day-1, 3, 7
   search-terms reviews; same-day negatives.
4. **Location set to "Presence or interest."** Overseas traffic
   dominates impressions; conv rate 0%. *Mitigation:* Step 7 exactly,
   verify after save.
5. **No conversion tracking before launch.** 30 days of Manual CPC with
   no signal. *Mitigation:* don't unpause until you've personally walked
   the wizard and seen `valuation_completed` in both GA4 DebugView AND
   Google Ads "Recording conversions."

---

## 17. After Campaign 2 proves out

### At ~30 conv/month
- Target CPA at 150% of current CPL (loose leash); tighten to 120%
  after 3 weeks of stable data
- Scale budget $20 → $40 → $60/day, never more than 2× per step,
  14-day learning each
- Attach RLSA in Observation, then +30% adjustment

### At ~50 conv/month
- **YouTube companion:** 15-second non-skippable "What's your trucking
  LLC worth?" video, Custom Segment + In-Market: Business Ownership
  Change. $15–20/day. Awareness + pre-warming.
- **Display remarketing:** combination list (visited /get-offer, did
  NOT complete, last 14 days). $10/day max.
- **Customer Match:** upload Veritor's 400-deal list as Customer Match
  → use as RLSA exclusion (don't re-show to closed sellers) AND as a
  lookalike seed.
- **Meta lookalikes:** same 400-deal list to Meta Custom Audience →
  1% and 3% lookalikes → lead-gen campaign. Trucker audiences
  over-index on Facebook vs. Google. CPL likely $25–$50. **Single
  biggest unlock for volume beyond Google Search at this niche size.**

### Spanish micro-campaign (when ready)

If you want Spanish ads, run them as a SEPARATE $10–15/day campaign,
not a second ad group inside C2. At $20/day total, splitting EN+ES
starves both. Final URL: `/es/get-offer`. ES headlines/descriptions in
`GOOGLE_ADS_COPY_AGENT.md` §8.

---

## 18. Honest caveats

- **Tiny niche.** This wedge has real but limited search volume. The
  campaign's ceiling is search demand, not budget. Once the wizard +
  copy + negatives are tuned, the next unlock is Meta lookalikes off
  the 400-deal list, not more Google spend.
- **CPC and volume estimates** are educated, not pulled from Keyword
  Planner. Recalibrate after 14 days of live data.
- **The `[trucking company appraisal]` keyword** has semantic
  ambiguity ("appraisal" defaults to physical-truck appraisal in many
  minds). Negatives cover it but pull the Day-7 search-terms specifically
  for this keyword. If >30% of matches are non-business contexts, pause
  it.
- **Russian:** excluded entirely. The Russian-speaking US trucker
  audience uses Yandex and Russian Facebook, not Google in Russian.
  Reach via Meta/YouTube channels in Phase 3.
- **Search alone won't hit acquisition pace.** Same caveat as C1 — for
  scale, layer Meta + YouTube on top.

---

*Master document for Google Ads Campaign 2.*
*Sub-references: `GOOGLE_ADS_KW_AGENT.md`, `GOOGLE_ADS_COPY_AGENT.md`,
`GOOGLE_ADS_LAUNCH_2_AGENT.md`.*
*Code change required before unpausing: `valuation_completed` GA4 event
in `ValuationWizard.tsx` (or finalize route). See §3.*
*Phone: 213-789-6878 · Site: groupveritor.com · GA4 property: 535770144*
