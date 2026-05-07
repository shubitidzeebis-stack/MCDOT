# Veritor Group — Google Ads Campaign 2 Launch Playbook
# Valuation / Fair-Offer Wedge → groupveritor.com/get-offer
# Budget: $20/day (~$600/month) | National US | English only

Built for paste-into-Google-Ads execution. Read Campaign 1 blueprint
(GOOGLE_ADS_LAUNCH.md) first — this document references it extensively.

---

## PART A — Campaign Architecture for $20/Day National US

---

### 1. Campaign Type: Search Only

**Recommendation: Search only. Do not use Performance Max.**

At $20/day, PMax is a budget incinerator. It requires conversion volume
to learn (~50 conv/month to function properly), and at $600/month you
will not generate that. PMax's black-box asset optimization will spread
your $20 across Display, YouTube, Discover, Gmail, and Search
simultaneously — each channel gets a fraction of what it needs to
generate a signal, and you'll waste 60–70% of spend on placements that
will never convert a trucker looking to sell their LLC.

Search only captures the narrow, high-intent universe of people actively
typing "trucking company valuation" variants right now. That's the
entire addressable population at $20/day. Every dollar should go there.

Display Remarketing (a separate campaign) is worth considering at Day 30
if you have a pixel audience, but it is not this campaign.

---

### 2. Ad Group Structure: 1 Ad Group

**Recommendation: 1 ad group. Hard stop.**

The math is definitive. At $20/day with a realistic $4–6 CPC on
valuation-intent terms:

- $20 ÷ $5 average CPC = **4 clicks/day**
- 4 clicks/day × 30 days = **120 clicks/month**
- Conversion rate for this wizard (warm, interactive, returns immediate
  value) = realistically 8–15%
- **Expected leads/month: 10–18**

Smart Bidding minimum: 30 conversions in 30 days. You will not reach
this threshold in month 1. You may not reach it in month 2.

Two ad groups means each group sees 2 clicks/day. At that density you
will never accumulate enough data to make any decision — bid, creative,
or keyword — with confidence. One tight ad group means all 120 clicks
and all conversion events go to a single pool. That pool at least has a
chance of surfacing signal.

Name the ad group: **"Valuation — English"**.

If the keyword agent delivers both head-term valuation queries
("trucking company valuation") AND question-form queries ("how much is
my trucking company worth"), those belong in the same ad group. Do not
separate them. The wizard handles both.

---

### 3. Match Types: Exact + 2 Phrase Max

**Recommendation: Exact-match primary, maximum 2 phrase-match additions.**

At $20/day, a single broad-match keyword can consume your entire daily
budget on irrelevant queries before 9 AM. Broad match is off the table.

**Exact match handles the whole list.** Exact match in 2024–2026 Google
is not as tight as it was in 2017 — Google does expand it to "close
variants" (same meaning, different word order, minor function words) —
but it still blocks the worst mismatch traffic.

**Allow phrase match ONLY for these two types:**

1. Question-form terms that exact match would miss:
   `"how much is my trucking company worth"` — worth having as phrase
   because Google will match it to `"what is my trucking LLC worth"`,
   `"how much can I sell my trucking company for"` etc., all of which
   are legitimate.

2. Modifier + head term if the keyword agent surfaces something like
   `"trucking business appraisal"` — phrase lets it catch `"trucking
   company appraisal online"` without going broad.

**No broad match. No BMM (deprecated anyway). No more than 5 phrase
keywords total alongside your exact list.** Pull the Search Terms report
daily in week 1 and add any garbage queries as negatives within 24
hours. At $20/day, one bad day of broad match can blow 25% of your
monthly budget.

---

### 4. Bid Strategy Progression

**The Smart Bidding threshold problem:**

At $20/day → ~120 clicks/month → 10–18 leads/month → 10–18
conversions. Smart Bidding's official minimum is 30 conversions per 30
days. You are likely to be below that threshold for months 1 and 2. The
bid strategy progression below accounts for this honestly.

| Stage | Days | Strategy | Max CPC Cap | Trigger to advance |
|---|---|---|---|---|
| 0 | Day 0–14 | **Manual CPC, Enhanced CPC OFF** | $6 hard cap | None — just collect data |
| 1 | Day 15–30 | Manual CPC continues. Add negatives from search terms. | $6 | 5+ conversions tracked |
| 2 | Day 31–60 | **Maximize Clicks with bid cap** — if < 15 conv in 30 days. This is NOT smart bidding; it's a traffic maximizer with a leash. | $7 max CPC cap | Hit 15+ conv/30d to skip to Stage 3 |
| 3 | Day 31+ | **Maximize Conversions (no tCPA)** — ONLY if you hit ≥15 conv in 30 rolling days | N/A | Monitor 2-week learning window closely |
| 4 | Day 60+ | **Target CPA** at 120% of observed CPL (loose leash) | N/A | Requires ≥30 conv/30d |

**Honest assessment:** If this campaign generates 10–15 leads/month
(realistic), you will spend months 1–2 on Manual CPC and should be
content with that. Manual CPC at a $6 cap keeps you in control. The
cost of premature Smart Bidding at low conversion volume is erratic
pacing, budget front-loading, and zero meaningful optimization. Resist
the UI's constant suggestions to "upgrade your bid strategy."

**Day 0–14 starting bid:** $4.50. Watch impression share. If impression
share is below 30% after 72 hours, raise to $5.50. Do not raise above
$6 in month 1. If impression share is 60%+ and you're burning through
$20 by 11 AM, lower to $3.50.

---

### 5. Geographic Settings

**Target: Entire USA — Presence only.**

**The default trap:** Google's location targeting defaults to **"Presence
or interest"** — meaning your ad can show to someone in India if they
recently searched for "US trucking." For this campaign, that is a
complete waste. This setting is buried and the Google UI actively tries
to keep you on the default.

**Required setting:** Settings → Locations → Location options (small
link below the map) → Target: **"Presence: People in or regularly in
your targeted locations"** (NOT "Presence or interest"). This is the
single most important setting after budget.

**Exclusions — add ALL of these:**

- Hawaii (no meaningful trucking MC market)
- Alaska (same)
- Puerto Rico, Guam, US Virgin Islands, Northern Mariana Islands, American Samoa
  (UI path: Settings → Locations → Excluded → Advanced search → type
  each territory name and exclude)
- Do NOT exclude specific cities as click-fraud hotspots. The Ashburn
  VA datacenter fraud pattern primarily hits display and programmatic,
  not Search-intent campaigns at this budget. Adding city exclusions on
  a national Search campaign at $20/day creates more measurement
  complexity than it solves. Monitor invalid click rate in the billing
  tab instead.

**Bid adjustments — geographic:**

Do NOT set state-level bid adjustments in month 1. You do not have the
data to justify them and you'll be optimizing noise. After 30 days,
look at the geographic performance report and consider +10–15% on the
top 3 states by conversion rate (likely TX, CA, FL based on Campaign 1
data). Do not touch until you have real numbers.

**Mobile bid adjustment:** See Section 6.

**Ad schedule bid adjustment:** See Section 7.

---

### 6. Device + Audience Targeting

**Device bid adjustments:**

The valuation wizard at /get-offer is a 5-step interactive flow with
FMCSA lookup. This works fine on mobile but requires slightly more
patience than a simple form. Trucking owner-operators predominantly
search on phones (in cab, at truck stops), but they are also
methodical — they are researching a major financial decision.

**Recommendation:** Set desktop = baseline (0% adjustment). Set mobile
= -10% initially, not more. You want mobile traffic — these are your
buyers — but you want to slightly prioritize sessions where they have
time to complete the 5-step wizard. Watch the mobile vs. desktop
conversion rate separately in the first 30 days. If mobile converts at
≥60% of desktop rate, remove the adjustment entirely. If it is below
40%, drop to -20%.

Tablet: -20% from day 1. Tablet traffic in this vertical converts
poorly and there is not enough of it to optimize.

**In-market audiences (observation only — NOT targeting):**

Add all of the following in observation mode. This means you are NOT
restricting who sees your ads — you are only adding measurement
intelligence so you can see which audience segments convert. Do not
remove anyone from the auction.

- In-Market: Business Services > Business Financing
- In-Market: Business Services > Business Ownership Change (if available)
- In-Market: Real Estate > Commercial Properties
- Affinity: Business Professionals > Small Business Owners
- Life Events: Retirement (approaching)

UI path: Ad groups → Select your one ad group → Audiences tab →
Add audience segments → Browse → set all to "Observation" (NOT
"Targeting"). This is the critical distinction. "Targeting" means
you only show ads to that audience. "Observation" means you show to
everyone but track performance by audience.

**RLSA — not yet:**

RLSA (Remarketing Lists for Search Ads) requires your audience list to
hit 1,000 cookies before Google activates it. At this traffic volume you
will not hit 1,000 site visitors for 2–4 months. Wire up the audience
list (Site Visitors to /get-offer, 90-day window) now so it starts
accumulating, but do not add it to the campaign until it hits 1,000.
When it does, add it in observation mode first, then consider bid
adjustment of +25–30% for site visitors who came back searching again.

**Custom segments:**

Same URL signals as Campaign 1. Add one custom segment in observation
mode:

- Segment type: People who browse websites similar to: `dat.com`,
  `truckstop.com`, `overdriveonline.com`, `freightwaves.com`,
  `landline.media`, `ccjdigital.com`
- Keyword intent additions: `"trucking company value"`, `"sell trucking
  business"`, `"FMCSA authority transfer"`

This surfaces trucker-adjacent signals in your audience insights without
restricting reach.

---

### 7. Ad Schedule

**Recommendation: 24/7 for the first 30 days. Do not restrict.**

At $20/day you have at most 4–5 clicks per day. If you restrict to
business hours (M–F 8–6), you are asking Google to spend $20 in 50
hours/week instead of 168 hours/week. That creates artificial pressure
that forces Google to bid more aggressively per available auction,
driving your CPCs up. The math does not favor restriction at this spend
level.

More importantly, truckers search at all hours — often early morning
(pre-trip inspections), evenings (after driving), and weekends (when
they have time to research a major financial decision). A 9–5 schedule
would miss a significant portion of your best-qualified traffic.

**Day 14 review:** Pull the Day of Week and Hour of Day performance
reports (Dimensions tab → Day of week / Hour of day). If you see
conversion clustering — e.g., Tuesday/Wednesday 7–11 AM consistently
shows higher conversion rates — add a +15% bid adjustment there. But
make this decision on data, not assumption. Day 1 schedule: 24/7.

---

### 8. Conversion Tracking

**[CODE CHANGE REQUIRED] — Fire a distinct `valuation_completed` event.**

**Do not reuse the `generate_lead` event from Campaign 1.**

Here is why: Campaign 1's `generate_lead` fires on the main site contact
form. Campaign 2's wizard at /get-offer is a fundamentally different
funnel with different completion rates, different lead quality signals
(it's enriched with FMCSA data, has a scheduled call on step 5, etc.),
and different audience behavior. If you import the same event into both
campaigns, your conversion data is blended and you cannot evaluate
either campaign cleanly.

**Code change required:** In `src/components/ValuationWizard.tsx` (or
`src/app/api/valuation/finalize/route.ts`), fire a new GA4 custom event
at wizard completion. The wizard's finalize endpoint already exists —
the event just needs to be added.

The event should fire when step 5 is reached (valuation range revealed
and user has provided contact info). Suggested event:

```typescript
// Fire on step 5 reach (valuation revealed + contact captured)
gtag('event', 'valuation_completed', {
  event_category: 'wizard',
  event_label: 'get-offer',
  value: 1,
  // Optional enrichment (no PII):
  has_amazon_relay: boolean,
  authority_status: 'A' | 'I',
  valuation_low: number,   // fine to pass — it's a range not a name
  valuation_high: number,
})
```

Secondary event (optional, also **[CODE CHANGE REQUIRED]**): Fire
`valuation_scheduled` when the user completes the Cal.com booking on
step 5. This would require listening for the Cal.com iframe's postMessage
callback. Worth implementing — a scheduled call is a higher-quality
signal than a completed form.

**In Google Ads:**

| Role | Event | Import setting |
|---|---|---|
| **Primary conversion** | `valuation_completed` (new GA4 event) | Included in "Conversions" column |
| Secondary | `generate_lead` (existing, Campaign 1 event) | Observation only (NOT in Conversions column for this campaign) |
| Secondary | Phone click on `tel:+12137896878` | Observation only |
| Secondary | `/get-offer` pageview | Observation only (measures top-of-wizard interest) |

If you import `valuation_scheduled` (Cal.com booking): also set as
primary alongside `valuation_completed`. A scheduled call is as good as
a lead or better.

**Attribution model:** Data-driven (same as Campaign 1). Note: at this
low conversion volume, data-driven attribution will lack enough data to
differ meaningfully from last-click. It is still the correct choice
because it will mature as volume grows, and you do not want to have
to re-import conversions later.

**Count:** "One per click." A single user completing the wizard multiple
times in one session is not multiple leads.

**Conversion window:** 30 days (the wizard captures an immediate lead
but the seller may not Google again for weeks after thinking it over).

---

### 9. Negative Keywords and Campaign 1 Overlap

**Create a NEW shared negative list for Campaign 2. Do NOT simply copy
Campaign 1's list wholesale.**

Here is the nuance: Campaign 1 is optimized to capture "sell my MC"
intent. Campaign 2 is optimized to capture "what is my trucking company
worth / valuation / appraisal" intent. There is intentional overlap you
want to keep, and there is contamination you need to block.

**Terms from Campaign 1's list that do NOT belong in Campaign 2's
negatives — keep these OUT of Campaign 2's exclusions:**

These are relevant to the valuation wedge and you should NOT exclude them:
- `trucking company valuation` (was in Campaign 1 positive list)
- `how much is my trucking company worth`
- Any sell-intent term is fine to bid on from Campaign 2 too (if the
  same user who searched "sell my MC" also searches "trucking company
  valuation," you want to be there from both campaigns)

**Terms that must be in Campaign 2's negative list (valuation-specific
contamination to block):**

```
-trucking company for sale           -buy trucking company
-buy trucking llc                    -buy mc number
-buy mc authority                    -buy dot authority
-trucking jobs                       -cdl jobs
-cdl training                        -trucking school
-owner operator jobs                 -lease purchase
-freight broker training             -dispatcher course
-load board                          -sell my truck
-trucking insurance quote            -amazon flex
-free valuation                      -business valuation calculator free
-real estate appraisal               -home appraisal
-car valuation                       -vehicle appraisal
-equipment appraisal                 -blue book truck value
-nada truck value                    -truck trade in value
-how to start a trucking company     -start trucking business
-get mc authority                    -new trucking authority
-trucking company for sale [state]   (add each state variant)
-trucking franchise                  -open trucking company
```

**The "free business valuation" trap:** Valuation-adjacent searches
attract a lot of generic small-business-valuation traffic ("free
business valuation tool," "business valuation calculator," "SBA
business valuation"). These users are not trucking LLCs shopping an
exit. Block `"business valuation calculator"`, `"free business
valuation"`, `"business appraisal calculator"` as negatives from day 1.

**Shared library path:** Tools → Shared Library → Negative keyword
lists → Create new list "Campaign 2 — Valuation Exclusions" → Apply
to Campaign 2. Do NOT apply Campaign 1's negative list to Campaign 2
without reviewing for the overlap exceptions above.

**Campaign 1 cross-negation question:** Should you add Campaign 2's
best keywords (e.g., `"trucking company valuation"`) as negatives in
Campaign 1 to prevent both campaigns from bidding against each other?
Answer: At this budget, probably not. Two campaigns bidding on the same
term at $20/day total across both is not a meaningful auction conflict —
you are not a large advertiser fighting yourself. If the same user
searches "how much is my trucking company worth," having both campaigns
eligible means the better-Quality-Score ad shows. That is fine. Do not
create cross-negation complexity until you have conversion data showing
the same user is entering from both funnels in a way that inflates CPL.

---

## PART B — Step-by-Step Launch Guide

---

### 10. Step-by-Step UI Walkthrough

**Google Ads UI: ads.google.com**

Prerequisite: You are logged into the correct Google Ads account (same
one Campaign 1 is in).

---

**CREATING THE CAMPAIGN**

**Step 1.** Click the blue `+` (New campaign) button in the left sidebar
or the Campaigns overview page.

**Step 2.** On the "What's your campaign goal?" screen, scroll to the
bottom and click **"Create a campaign without a goal's guidance."**
DO NOT select Leads, Sales, or any other goal. The goal-guided wizard
locks in defaults (Smart Bidding, Display Network on, broad match) that
are catastrophic for a $20/day campaign. The "without a goal" path
gives you full manual control of every setting.

**Step 3.** Select campaign type: **Search**. Click Continue.

**Step 4.** On the next screen ("Select the ways you'd like to reach
your goal"), Google shows Website visits, Phone calls, App downloads.
Check **Website visits**. Enter the URL: `https://groupveritor.com/get-offer`.
This is informational only — it does not lock your final URL. Click
Continue.

---

**CAMPAIGN SETTINGS**

**Step 5.** Campaign name: `C2 — Valuation EN — USA — Manual`
(naming convention matches Campaign 1 logic; "C2" disambiguates).

**Step 6.** Networks. THIS IS CRITICAL.
- "Google Search Network" — leave **checked** (you want this)
- "Search Partners" — **UNCHECK**. Search partners include low-quality
  inventory. At $20/day you cannot afford non-Google impressions diluting
  your data.
- "Display Network" — **UNCHECK**. Google checks this by default. It is
  a trap. Uncheck it. If you miss this step, your ads will run on random
  websites and your "conversion" data will be polluted.

These toggles are directly on the campaign settings page, labeled
"Networks." They are checked by default.

**Step 7.** Locations.
- Click "Enter another location" → type "United States" → select it.
- Immediately below the map, click the small blue link: **"Location
  options"** (easy to miss).
- Under "Target," select: **"Presence: People in or regularly in your
  targeted locations."** (NOT the default "Presence or interest.")
- Under "Exclude," add: Hawaii, Alaska, Puerto Rico, Guam, U.S. Virgin
  Islands, Northern Mariana Islands, American Samoa. Type each and
  click Add.

**Step 8.** Languages: **English**. Remove all others if pre-populated.

**Step 9.** Audience segments.
- In the "Audiences" section (on the campaign settings page), click
  "Browse" → add all in-market and custom segments listed in Section 6
  above.
- IMPORTANT: After adding each, confirm the dropdown says "Observation"
  not "Targeting." The column header shows "How they'll be used" —
  all should read "Observation."

---

**BUDGET AND BIDDING**

**Step 10.** Budget: **$20.00/day.** Delivery method: **Standard**
(NOT Accelerated — Accelerated was deprecated but some accounts still
show it; Standard spreads spend throughout the day).

**Step 11.** Bidding. THIS IS THE SECOND BIGGEST TRAP.
- Google defaults to Maximize Clicks or Maximize Conversions.
- Click "Select a bid strategy directly" (small link beneath the
  dropdown — easy to miss).
- Select: **Manual CPC**.
- Uncheck "Help increase conversions with Enhanced CPC" — this toggles
  Smart Bidding back on through a backdoor. Make sure it is UNCHECKED.

**Step 12.** Ad schedule: leave as "All day" (24/7). Do not restrict.

**Step 13.** Campaign URL options (optional but recommended). Add a
tracking template:
`{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign=C2-valuation-en&utm_content={adgroupid}&utm_term={keyword}&gclid={gclid}`

This gives you clean UTM tagging in GA4 and the valuations table already
has `utm_source`, `utm_medium`, `utm_campaign` columns ready to capture it.

**Step 14.** Click **Save and continue**.

---

**CREATING THE AD GROUP**

**Step 15.** Ad group name: `Valuation — English`

**Step 16.** Default bid: **$4.50** (you can adjust per-keyword later).

**Step 17.** Add keywords. Paste in your exact and phrase match keywords
from the keyword agent (GOOGLE_ADS_KW_AGENT.md when available). Format:
- Exact match: `[trucking company valuation]`
- Phrase match: `"how much is my trucking company worth"`

Verify every keyword has the correct brackets/quotes before saving.

**Step 18.** Click **Save and continue**.

---

**CREATING THE AD**

**Step 19.** Ad type is pre-selected as Responsive Search Ad (RSA).

**Step 20.** Final URL: `https://groupveritor.com/get-offer`

**Step 21.** Display path: Field 1: `sell` / Field 2: `trucking-company`
(or `get-offer`). Shows as groupveritor.com/sell/trucking-company in
the ad URL — reinforces intent match.

**Step 22.** Add headlines and descriptions from GOOGLE_ADS_COPY_AGENT.md
when available. Use 15 headlines and 4 descriptions for maximum RSA
permutation coverage. Pin Headline 1 to the strongest identity/value
headline (e.g., "Free Trucking Company Valuation"). Pin Description 1
to the most critical message (offer/CTA).

**Step 23.** Click the "Ad strength" indicator. Aim for "Excellent"
before saving. If it shows "Poor" or "Average," vary your headline
lengths and ensure keywords appear in at least 2 headlines.

**Step 24.** Click **Done**, then **Save and continue**.

---

**AD EXTENSIONS (NOW CALLED ASSETS)**

Google Ads now calls these "Assets." Add them at the campaign level
so they apply to all ad groups.

**Step 25.** Sitelinks (at least 4 required for 2-row display):
- "Get Your Free Valuation" → `https://groupveritor.com/get-offer`
- "How Our Process Works" → `https://groupveritor.com/#how-it-works`
  (or closest section anchor)
- "400+ LLCs Acquired" → `https://groupveritor.com/`
- "Contact Us" → `https://groupveritor.com/contact`

Path: Ads → Assets → Add asset → Sitelink. Add at campaign level.

**Step 26.** Callout assets (short, no URL):
- "Written Offer in 48 Hours"
- "No Broker Fees"
- "Two-Week Close"
- "US-Based Buyer"
- "400+ Deals Closed"
- "100% Confidential"
- "Operator-Led Team"

**Step 27.** Structured snippets:
- Header: "Types" → Values: "Trucking LLC", "MC Authority", "Amazon
  Relay Carrier", "Owner-Operator Business"

**Step 28.** Call asset:
- Phone: 213-789-6878
- Schedule: All hours (same as Campaign 1 — this is a phone-heavy
  audience)
- Call reporting: ON (same as Campaign 1)

**Step 29.** Lead form asset: SKIP. The wizard at /get-offer IS the
lead form. A Google-native lead form would compete with your wizard and
capture lower-quality leads (no FMCSA enrichment, no valuation reveal,
no Cal.com booking). Do not use it.

---

**CONVERSION GOALS**

**Step 30.** Before launching, go to: Tools → Conversions → New
conversion action → Import → Google Analytics 4 → Web.

If `valuation_completed` does not yet appear in the GA4 import list,
the **[CODE CHANGE REQUIRED]** event has not been deployed yet. Do not
launch the campaign until this event is deployed, tested in GA4
DebugView, and visible in the import list. Launching without a firing
conversion action means you are flying blind.

**Step 31.** Import `valuation_completed`:
- Category: Lead
- Count: One per click
- Click-through conversion window: 30 days
- View-through conversion window: 1 day
- Attribution model: Data-driven
- Mark as **Primary** (included in Conversions column)

**Step 32.** Import `generate_lead` (from Campaign 1):
- Mark as **Secondary** for Campaign 2 (change the "Include in
  Conversions" toggle to OFF for this campaign specifically). This
  way it appears in "All conversions" for reference but does not
  pollute your optimization signal.

**Step 33.** Import Phone click (if set up in Campaign 1 — reuse same
action): Secondary / observation only.

---

**NEGATIVE KEYWORDS**

**Step 34.** Go to Tools → Shared Library → Negative keyword lists →
**New list**. Name it: `C2 — Valuation Exclusions`. Paste in the full
list from Section 9 above. Save.

**Step 35.** Go back to your new campaign → Keywords → Negative keywords
tab → "Use negative keyword list" → select `C2 — Valuation Exclusions`.

Do NOT apply the Campaign 1 negative list to this campaign without the
review described in Section 9.

---

**FINAL SAVE**

**Step 36.** Review all settings. Change campaign status to **Paused**
if it defaulted to Enabled. (In the campaign overview, click the green
circle next to the campaign name → Paused.)

**Step 37.** Complete the pre-launch QA checklist (Section 11) before
unpausing.

---

### 11. Pre-Launch QA Checklist

Verify every item before clicking Enable on the campaign.

1. `valuation_completed` GA4 event fires correctly in GA4 DebugView
   when you manually walk through /get-offer to completion. Do not
   skip this — it is the entire measurement foundation.

2. **[CODE CHANGE REQUIRED]** is confirmed deployed to production
   (`groupveritor.com`, not localhost). The Vercel deployment that
   includes the `valuation_completed` event must be live.

3. `valuation_completed` is visible in Google Ads → Tools → Conversions
   and shows status "Recording conversions" (not "No recent
   conversions" — this status appears after the first real event fires).

4. Campaign type is Search. Networks: Search Partners = OFF, Display
   Network = OFF. Verify in campaign Settings → Networks.

5. Location targeting: United States selected. Location option set to
   "Presence: People in or regularly in." HI, AK, PR, territories
   excluded. Verify in Settings → Locations.

6. Bid strategy = Manual CPC. Enhanced CPC = unchecked. Default ad
   group bid = $4.50. Verify in Settings → Bidding.

7. Daily budget = $20.00. Delivery = Standard.

8. All audience segments are set to "Observation," NOT "Targeting."
   Verify in Ad groups → Audiences tab → "How they'll be used" column.

9. Negative keyword list `C2 — Valuation Exclusions` applied. At
   minimum, "business valuation calculator," "free business valuation,"
   "trucking company for sale," "buy trucking llc," "trucking jobs" are
   present.

10. RSA ad has final URL = `https://groupveritor.com/get-offer`. Click
    the preview button to confirm the ad renders correctly on mobile.

11. Sitelinks, callouts, structured snippets, and call asset are all
    attached at campaign level. Verify in Ads → Assets tab.

12. UTM tracking template is set (Step 13). Test by appending the
    template to /get-offer manually in browser — confirm UTM params
    land in the URL and (after a wizard completion) appear in the GA4
    real-time report.

13. Campaign status = **Paused** before you walk away. You should
    consciously unpause it, not accidentally launch it.

14. GA4 property 535770144 is linked to Google Ads and auto-tagging is
    ON. Same as Campaign 1 — verify in Google Ads → Tools → Data
    Manager → Google Analytics 4 → Linked property.

---

### 12. Review Checklists by Day

**DAY 1 CHECKLIST (do this on the morning after launch)**

- [ ] Is the campaign serving? Check Impressions > 0 in the campaign
      overview. If 0 impressions after 4 hours during business hours,
      check: campaign not paused accidentally, billing is active, ads
      are approved (not under review).
- [ ] Is daily spend tracking toward $20? Check hourly pacing in
      Billing → Transaction history. Do not act if you see $3 spent
      by noon — that is normal pacing on a $20/day budget.
- [ ] Check ad approval status. If any RSA headline or description is
      disapproved, fix it immediately — a disapproved RSA means zero
      ads serving.
- [ ] Confirm `valuation_completed` conversions are recording if anyone
      completed the wizard. Check GA4 real-time events AND Google Ads
      → Conversions → All conversions column.
- [ ] DO NOT make bid or keyword changes on Day 1. You have no data yet.

**DAY 7 CHECKLIST**

- [ ] Download the Search Terms report (Keywords → Search terms). Add
      any irrelevant queries as negatives immediately. Common traps:
      "how to value a business" (generic), "truck driver salary"
      (job seeker), "trucking company insurance quote," "FMCSA lookup"
      (not a buyer — they just want to look up their own number).
- [ ] Check impression share. If below 20%, your bids may be too low
      for the auction. Raise by $0.50.
- [ ] Check average CPC. If $7+ (above your $6 cap), your cap is not
      holding — verify manual CPC settings.
- [ ] Count conversions. If 0 after 7 days, re-verify the
      `valuation_completed` event in GA4 DebugView by walking through
      the wizard yourself.
- [ ] Do NOT pause any keywords with 0 clicks after 7 days. Quality
      Score has not stabilized. Low-traffic keywords in a tight niche
      can appear dead for 2 weeks and then receive traffic.
- [ ] Do NOT change match types, bid strategy, or ad copy yet.

**DAY 14 CHECKLIST**

- [ ] Pull the full search terms report for days 1–14. This is your
      most important optimization task. Aggressively add negatives for
      anything that is not explicit seller/valuation intent.
- [ ] Review performance by device (Reports → Dimensions → Device).
      If mobile conversion rate is less than 40% of desktop, apply -20%
      mobile bid adjustment.
- [ ] Review performance by hour-of-day and day-of-week. If there is
      a clear time concentration of conversions, add a +15% bid
      adjustment for that window.
- [ ] How many leads in 14 days? If 0: check conversion tracking,
      check wizard completion flow, check search term relevance. If
      0 conversions after 14 days despite impressions and clicks, the
      funnel is broken somewhere — do not raise bids.
- [ ] If 3–7 leads in 14 days: on track. Stay on Manual CPC.
- [ ] Quality Score check: Keywords tab → add Quality Score column.
      Any keyword below 4/10 should be reviewed — either the ad copy
      doesn't match the keyword's intent or the landing page relevance
      is low.
- [ ] Review the RSA ad strength report. If Google has found winning
      combinations, pin them. If it is "Poor," add 3 more headline
      variants.

**DAY 30 CHECKLIST**

- [ ] Count total conversions in 30 days. If ≥15: consider switching
      to Maximize Conversions (no tCPA cap) per the bid progression in
      Section 4. Run it for 14 days before evaluating.
- [ ] Calculate CPL: total spend ÷ total conversions. Is it within the
      target range in Section 13?
- [ ] Review geographic report (Reports → Dimensions → Geographic).
      Which states are generating leads? If TX/CA/FL are
      disproportionately converting, add +10–15% bid adjustments for
      those states.
- [ ] Add any RLSA audiences that have crossed 1,000 cookies. Set
      to observation first, then apply +25–30% bid adjustment after
      7 days of observation data.
- [ ] Review the campaign against Campaign 1. Are both campaigns
      serving simultaneously without obvious overlap in search terms?
      Cross-check by looking at whether Campaign 1 is showing for
      "trucking company valuation" terms and vice versa. If yes, add
      mutual exclusion negatives.
- [ ] Decision point: is this campaign worth continuing at month 2?
      See Section 13 for criteria.

---

### 13. KPI Targets for $20/Day National US

**Realistic projections — not aspirational:**

| Metric | Month 1 | Month 2 | Month 3 |
|---|---|---|---|
| Clicks/day | 3–5 | 4–6 | 4–6 |
| Leads/month | 8–15 | 10–18 | 12–22 |
| CPL | $40–$75 | $35–$60 | $30–$50 |
| Conversion rate | 10–15% | 11–16% | 12–18% |
| Impression share | 20–40% | 25–45% | 30–50% |

**Why the CPL is lower here than Campaign 1 ($200–$500):**

The wizard is high-converting relative to a contact form because it
delivers immediate value (the valuation range) before asking for
anything. Users who complete the wizard have self-qualified and received
something tangible. Expect 10–15% completion rate on wizard visitors
from paid, which is high for this type of flow. CPL of $40–$75 would
be exceptional for this vertical.

**"Good" outcome definitions:**

- **30 days:** ≥8 wizard completions, CPL ≤$75, ≥1 scheduled call on
  Cal.com, 0 QA failures (all conversions tracked cleanly).
- **60 days:** ≥15 leads/month, CPL ≤$60, conversion rate stabilizing,
  search terms report is clean (negative list working).
- **90 days:** ≥20 leads/month, 1–2 attributable closed deals (at
  Veritor's close rate), CPL data justifies scaling budget.

**When to scale:**

Scale budget when CPL ≤ $60 AND you are generating ≥15 leads/month
consistently. A closed acquisition at $5K–$50K+ value supports a CPL of
up to $300 if close rate is 5%. At $60 CPL, this campaign has
extraordinary return — scale it. Double to $40/day first (before going
to $100/day), let the system re-learn pacing for 2 weeks.

**When to kill:**

Kill (or pause for restructure) if after 60 days you have: fewer than
5 leads, CPL above $120, OR the search terms report shows 70%+ of
matched queries are irrelevant. The latter means your keyword list
needs a rebuild, not just more spend.

---

### 14. Common $20/Day Failure Modes

**Failure mode 1: Smart Bidding turned on too early.**

You have 3 conversions in 30 days. The UI says "Upgrade to Maximize
Conversions." You click it. Google enters a 2-week "learning period"
during which it may spend $20/day on useless signals. Pacing goes
erratic. Your 3-conversion data set is not enough to train anything.
The result: higher CPCs, fewer impressions, zero additional conversions.
How to avoid: Do not touch bid strategy until ≥15 conversions in a
rolling 30-day window.

**Failure mode 2: Display Network left on.**

Missed during setup (Step 6 above). You notice your CPL is $200 and
most of your clicks are coming from mobile apps and unknown placements.
By the time you notice, you've wasted 2 weeks of budget. How to avoid:
Triple-check the Networks settings before unpausing. Verify by going
to Reports → Dimensions → Network (with search partners) — if you see
"Display" in the breakdown, turn it off immediately.

**Failure mode 3: Keyword match type too broad.**

One phrase-match keyword like "business valuation" starts matching
"free business valuation calculator," "restaurant business valuation,"
"real estate business valuation." Each click costs $4–5. At $20/day you
burn through your budget by 10 AM on irrelevant traffic. How to avoid:
Check the search terms report on Day 1, Day 3, Day 7. Any query that is
not explicitly trucking + sell/value/worth gets added as a negative
within 24 hours.

**Failure mode 4: Location targeting set to "Presence or interest."**

You launch nationally but your impressions are dominated by queries
from overseas users "interested" in US trucking (freight brokers in
India, logistics companies in Pakistan looking at US MC numbers).
CPCs are low but conversion rate is 0%. How to avoid: Follow Step 7
exactly. Before the campaign goes live, verify the setting by clicking
back into Settings → Locations → Location options.

**Failure mode 5: No conversion tracking before launch.**

The `valuation_completed` event is not deployed, or it fires but is
not imported into Google Ads. You run for 30 days on Manual CPC with
no conversion data. You have no idea if the campaign is working, cannot
evaluate CPL, and when you try to switch to Smart Bidding, there is
nothing to learn from. How to avoid: Do not unpause the campaign until
you have personally walked through the wizard to completion and confirmed
the event appears in both GA4 DebugView AND Google Ads conversion
tracking status = "Recording conversions."

---

### 15. Recommended Next Move if Campaign 2 Works

**At 30 leads/month (the Smart Bidding threshold):**

1. Switch to Target CPA at 150% of current CPL. Give it 3 weeks.
   If CPL holds or improves, tighten to 120% of CPL.

2. Scale budget incrementally: $20 → $40 → $60/day. Never more than
   double in one step. Each step needs 14 days of learning.

3. Add RLSA overlay: by this point your /get-offer audience list should
   have 1,000+ cookies. Add it in observation, confirm the bid
   adjustment, then layer at +30% for people who visited /get-offer
   but did not complete (remarketing to search).

**At 50+ leads/month (scale inflection point):**

4. Launch a YouTube companion campaign: 15-second non-skippable
   "Sell your trucking LLC" video targeting Custom Segments (dat.com,
   truckstop.com URLs) + In-Market: Business Ownership Change.
   Budget: $15–20/day on YouTube. This is awareness, not direct
   response — it pre-warms the audience before they search.

5. Launch Display Remarketing: Custom combination list (visited
   /get-offer, did NOT complete wizard, visited in last 14 days).
   Banner ads with the valuation offer. $10/day max. This is cheap
   and keeps Veritor top-of-mind during the seller's decision period.

6. Customer Match: Upload Veritor's existing ~400 closed-deal contact
   list to Google Audiences → Customer Match. Use as:
   - RLSA exclusion (don't waste budget re-showing ads to people who
     already closed)
   - Lookalike seed for YouTube and Display expansion
   - This is Veritor's single strongest differentiator in audience
     targeting — 400 real completed deals is a powerful signal set.

7. Meta lookalikes: Upload the same 400-deal contact list to Meta
   Business Manager → Audiences → Custom Audience → Customer list →
   Create 1% and 3% lookalikes. Target with a lead gen campaign.
   Trucking owner-operators over-index on Facebook vs. Google.
   Meta CPL in this audience is likely $25–$50 — potentially lower
   than Google at scale. This is the single biggest unlock for volume
   beyond what Google Search can generate in this niche.

8. Performance Max (conditional): Only after both Campaign 1 AND
   Campaign 2 collectively exceed 50 conversions/month, Google Ads
   has enough signal to run PMax effectively. Use Campaign 1 and
   Campaign 2 audience signals as PMax audience signals. Add brand
   campaign negatives to prevent PMax from cannibalizing branded
   search at zero marginal cost.

---

## IMPORTANT NOTES FOR COORDINATION

### For the keyword agent (GOOGLE_ADS_KW_AGENT.md)

The keyword list for this campaign should focus on:
- **Head terms**: trucking company valuation, trucking company appraisal,
  trucking business valuation, owner operator business valuation
- **Question-form terms**: how much is my trucking company worth, what
  is my MC authority worth, how much can I sell my trucking LLC for,
  trucking company valuation calculator
- **FMCSA-adjacent intent**: MC authority value, DOT number value,
  sell trucking authority price
- **Avoid**: generic business valuation terms without "trucking" modifier
  (these will match irrelevant small-business sellers)

Target: 15–25 exact-match keywords + 3–5 phrase-match keywords.
Do not exceed 30 total. Signal density matters more than coverage.

### For the copy agent (GOOGLE_ADS_COPY_AGENT.md)

The landing page (`/get-offer`) delivers a FMCSA-powered valuation
range in 90 seconds. The ad copy should:
- Lead with the tool/offer, not the buy pitch ("Get Your Trucking Company
  Valuation in 90 Seconds" > "We Buy Trucking LLCs")
- Use "free" if legally accurate (the valuation is free — this is a
  legitimate hook)
- Include the time signal: "90-Second Valuation," "Instant Value Range"
- Include trust signals: "FMCSA-powered," "400+ LLCs acquired"
- Include urgency signal: "See What Your LLC Is Worth Today"
- CTAs: "Get Free Valuation," "See Your Value Range," "Get Your Offer"
  (stronger than generic "Learn More")

The wizard's value proposition is differentiated from Campaign 1:
Campaign 1 asks for a direct sale; Campaign 2 offers information first
(the valuation) and lets the seller self-qualify. Ad copy should reflect
this — it is less of a pitch and more of a utility offer.

---

*Campaign 2 / Valuation Wedge playbook complete.*
*Sibling agents: keyword list → GOOGLE_ADS_KW_AGENT.md,*
*copy → GOOGLE_ADS_COPY_AGENT.md.*
*Code change required before launch: deploy `valuation_completed`*
*GA4 event in ValuationWizard.tsx or finalize route.*
