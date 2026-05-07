# Google Ads Work Log

Running log of what's been done, what's pending, and what's blocked.
Strategic plan lives in `GOOGLE_ADS_LAUNCH.md` (static reference); this
file tracks dynamic state across sessions.

---

## Status (2026-05-04)

- ✅ Google Ads account created: `shubitidzeebis@gmail.com`
- ✅ Account phone shown in UI: `422-810-5468` (this is the Google Ads
  account contact phone, NOT Veritor's customer-facing number)
- ✅ Currency: USD · Time zone: Eastern Time · Country: United States
- ✅ Campaign created: **Sell — High Intent (US Search)**
- ⚠️ **Campaign live + serving = uncertain.** Last screenshot showed ad
  status "Eligible" but 0 impressions. Could be paused at the campaign
  level, or just normal ramp. **User needs to verify status.**
- ❌ GA4 not yet linked in Google Ads (planned via Tools → Data Manager)
- ❌ `generate_lead` conversion not yet imported as Primary

## Campaign config (current)

| Setting | Value |
|---|---|
| Campaign type | Search |
| Goal | Leads → Form submissions from website + Phone calls from ads |
| Networks | Search only (Search partners + Display **off**) |
| Bid strategy | Manual CPC (or "Clicks" with max CPC cap if Manual unavailable) |
| Max CPC | **$4** (recommended raise to $6 — see Pending) |
| Daily budget | $17 (~$510/mo) |
| Locations | 5 states: TX, CA, FL, GA, OH (recommended expand to 10 — see Pending) |
| Targeting type | Presence: People in or regularly in |
| Languages | English |
| Ad schedule | Mon–Sat 6am–9pm Eastern (Sunday off) — recommended drop to 24/7 |
| Ad rotation | Optimize: Prefer best performing ads |

### Audience segments (Observation mode — doesn't narrow reach)

- Affinity: Vehicles & Transportation
- In-Market: Commercial Vehicles
- Detailed Demographics: Employment > Transportation & Utilities Jobs
- Affinity: Small Business Owners (added)
- In-Market: Business Insurance (added)
- (Possibly) In-Market: Loans / Heavy Trucks — depends on what was
  available in account taxonomy

Removed: Real Estate > Moving & Relocation (wrong intent)

### Keywords (12 total at last check)

**Eligible** ✓
- `how much can i sell my trucking company for` — Broad
- `sell my mc number` — Broad
- `[sell my mc number]` — Exact
- `[sell my mc authority]` — Exact
- `"who buys trucking companies"` — Phrase
- `"mc llc for sale"` — Phrase

**Not eligible: Low search volume**
- `[sell my trucking llc]` — Exact
- `[sell my amazon relay account]` — Exact
- `[sell my dot authority]` — Exact
- `[sell my motor carrier authority]` — Exact
- `"selling amazon relay account"` — Phrase

Note: Google auto-reactivates "Low search volume" keywords once volume
picks up. **Do not delete them.**

### Negative keywords (40 applied)

Mix of broad + phrase match. Broad = strongest negative protection.
Full list in `GOOGLE_ADS_LAUNCH.md` § 5.

Critical exclusions: all `[state] for sale` variants, `sell my truck`
+ pickup-truck-consumer terms, `cdl jobs` / `trucking jobs` cluster,
all `buy mc/dot/llc` buyer-intent terms, `start trucking business`
cluster.

### Ad assets (Responsive Search Ad)

- Final URL: `https://groupveritor.com`
- Display path: `sell-llc/48-hour-offer`
- Headlines: 12+ populated (full list in `GOOGLE_ADS_LAUNCH.md` § 6)
- Descriptions: 4 populated
- Sitelinks: 4 (How It Works, Case Studies, FAQ, About Us)
- Callouts: 6 (400+ LLCs Closed, Operator-Led, Two-Week Close,
  Confidential NDA-Backed, Written Offer in 48h, Amazon Relay
  Specialists)
- Structured snippets: Services header (MC Acquisition, DOT Authority
  Transfer, LLC Buyout, Amazon Relay Carrier Acquisition, Fresh MC
  Authority Purchase)
- ⚠️ **Call extension phone number — verify it's `(213) 789-6878`,
  NOT the auto-pulled `(248) 557-0207` from earlier.** This was
  flagged but I don't have confirmation it was fixed.

---

## Pending actions (user-side)

In recommended priority order:

1. **Verify campaign is Enabled** (not Paused at campaign level — green
   circle in Campaigns view). The ad shows Eligible but campaign could
   be paused.
2. **Verify call extension phone** is `(213) 789-6878` — not the wrong
   `(248) 557-0207` Google auto-pulled. Fix in Campaign → Assets →
   Calls if needed.
3. **Add 12 phrase-match keywords** to broaden reach for the dead exact-
   match terms:
   ```
   "sell my trucking llc"
   "sell my amazon relay account"
   "sell my dot authority"
   "sell my motor carrier authority"
   "sell my trucking company"
   "sell my trucking business"
   "sell trucking authority"
   "sell my logistics company"
   "who buys trucking llc"
   "selling my mc"
   "selling my trucking llc"
   "cash for trucking llc"
   ```
4. **Expand geo from 5 states to 10**: add Illinois, New Jersey,
   Pennsylvania, North Carolina, Arizona.
5. **Raise max CPC** from $4 to $6 (auction floor likely $5–$7 for these
   exact-match terms).
6. **Consider dropping ad schedule restriction** — go to 24/7. At $17/
   day every search counts; truckers DO search at odd hours.
7. **Link GA4** in Tools → Data Manager → Google Analytics → Manage →
   pick `Veritor Group (535770144)` → Link. Toggle on metrics + audiences
   import. Auto-tagging ON.
8. **Import `generate_lead` as Primary conversion**: Goals → Conversions
   → New → Import → GA4 → Web → check `generate_lead` → mark Primary,
   count One per click, attribution Data-driven.
9. **Wait 24–48h** after applying 1-7 before assessing impressions.

## Blocked / Waiting on user

- Whether call extension was fixed to `(213) 789-6878` — needs verify.
- Confirmation campaign is at "Enabled" status, not paused at campaign
  level.

## Decisions / rationale

- **Phrase + exact mix (not all exact)** — niche has very low search
  volume; pure exact starves the campaign. Hybrid balances precision +
  reach.
- **Manual CPC, not Smart Bidding** — zero conversion history at
  launch; Smart Bidding has nothing to learn from. Switch to Maximize
  Conversions at 15+ conv, Target CPA at 30+ conv.
- **5 ad groups planned, but launched with 1** — at $500/mo, splitting
  audiences starves all of them. Single ad group "Sell — High Intent"
  bundles Amazon Relay + Fresh MC + General LLC. Spanish + Russian
  deferred to Phase 2 once English is converting.
- **Negative keywords broad-match, NOT bracketed** — opposite of
  positive keywords; broad-match negatives block more variations,
  brackets weaken protection. Educated user on this 2026-05-03.
- **Skipped Google AI Max** — auto-generated keywords/headlines would
  pollute precise targeting; high-budget feature, anti-precision at $500.
- **Custom Segment deferred** — "+ New segment" UI only exposes first-
  party data segments (customer list / GA4 / website visitors). True
  Custom Segment (URL/keyword-based for prospecting) lives in Audience
  Manager. Worth adding in Phase 2 once campaign has data.
- **Audience layers in Observation mode only** — at this budget,
  "Targeting" mode would shrink reach to nothing. Observation = free
  intel for later.

## History

### 2026-05-03
- Account created.
- 3 research agents run (keyword research, competitor analysis,
  campaign blueprint). Results consolidated in `GOOGLE_ADS_LAUNCH.md`.
- $500/mo budget set; plan re-tightened from $4.5K-$6K original.
- Campaign built end-to-end through forced first-campaign flow.
- Bidding configured (Manual CPC / Clicks-with-cap), settings,
  audiences (4-5 segments observation), keywords (12), negatives (40),
  RSA (12 headlines + 4 desc + 4 sitelinks + 6 callouts + structured
  snippets).
- Wrong phone number `(248) 557-0207` flagged on call extension —
  needs verify Veritor's `(213) 789-6878` was substituted.
- Campaign published; per current screenshot status = Eligible / 0
  impressions, 6 keywords "Low search volume."

### 2026-05-04
- User established per-topic logging rule.
- This log file created.
- (Continuing — pending actions in queue.)
