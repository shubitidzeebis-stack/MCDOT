# Meta Ads — creative playbook (message, image prompts, overlay spec)

Target: US owner-operators / small fleet owners who own a trucking LLC, priority on carriers
holding an **active Amazon Relay contract**. Destination: `groupveritor.com/get-offer`.

Brand: near-black `#0a0a0b`, amber `#ff8a1a`, gold `#c9a662`, Inter. Reference frame is
`/public/hero/hero1.webp`. Logo file for overlays: `/public/brand/logo-on-dark.png`.

---

## Delivered set (2026-08-05)

36 finished files at `Desktop/veritor meta ads creatives/` — 12 creatives × 3 sizes,
with `READ ME FIRST.txt` mapping each to its message, primary text, Meta headline, CTA
button and destination URL.

Generator preserved at `docs/ad-tooling/adgen-route.tsx`. To re-render or add creatives:
copy it back to `src/app/api/adgen/route.tsx`, `npm run dev`, then
`curl "http://localhost:3100/api/adgen?i=<0-11>&size=<4x5|1x1|9x16>"`. It lives outside
`src/` so it can't be swept into a commit or deployed by accident. Inter TTFs it needs
are in `docs/ad-samples/fonts/`.

**Stock photography finding:** ~150 free-stock candidates reviewed across Pexels
(Unsplash blocks unauthenticated access). Rejected wholesale. Free libraries have
almost no American Class-8 conventional tractors in premium light — the inventory is
mostly European cab-overs (DAF, MAN), which a US owner-operator identifies instantly as
foreign, plus port containers carrying visible third-party branding. The 12 shipped
creatives use Veritor's own images. New plates should come from the ChatGPT prompts in
§2 below.

## 0. How these get made

**Two layers, always:**

| Layer | Made by | Contains |
|---|---|---|
| Base plate | ChatGPT (GPT Image) | Photograph only. No text, no logo, no signage. |
| Overlay | Canva / Meta editor / repo generator | Real logo PNG, headline, subhead, CTA pill, trust strip |

ChatGPT cannot reproduce the Veritor wordmark — it will invent a close-but-wrong version,
and AI-rendered small type is full of artifacts. Both are fatal in a paid ad. The plate/overlay
split also means one $0.04 photo carries five headline tests.

### Blockers before launch

1. **No Meta Pixel on the site.** Nothing in `src/` loads `fbq`. Without it: no conversion
   optimization, no retargeting, no lookalikes from converters.
2. **The CSP will silently block the pixel** once added — `next.config.ts:38,42` needs
   `connect.facebook.net` in `script-src` and `www.facebook.com` in `connect-src`.

---

## 1. Message architecture

Every creative carries the same six slots. One ad = one idea; never stack two.

```
┌─────────────────────────────────────┐
│  [LOGO]                             │  top-left, always
│                                     │
│         (photograph)                │
│                                     │
│  EYEBROW — who this is for          │  amber, 24px, letterspaced
│  Headline — the promise             │  86px, two lines max
│  Subhead — the proof / mechanism    │  30px, one line
│  [ CTA pill ]                       │  amber pill, one verb
│  400+ closed · 3–5 days · Operators │  trust strip, 22px
└─────────────────────────────────────┘
```

### The five message sets

**M1 — Relay carrier** *(primary target, highest-value lead)*
- Eyebrow: `AMAZON RELAY CARRIERS`
- Headline: **Your Relay contract outweighs your trucks.**
- Subhead: It's the single biggest thing that moves your number — more than fleet size or age of authority.
- CTA pill: `Get your free valuation →`  ·  Meta button: **Learn More**
- Plate: D (dock line) or B (owner)
- *TM-safe eyebrow variant if a set gets rejected: `RUNNING RELAY FREIGHT?`*

**M2 — Speed and certainty** *(broadest appeal, best cold-traffic workhorse)*
- Eyebrow: `US LOGISTICS LLC ACQUISITIONS`
- Headline: **Sell your trucking LLC. Closed in 3–5 days.**
- Subhead: Written offer. Wire through attorney escrow — at your bank or online.
- CTA pill: `Get a free valuation →`  ·  Meta button: **Get Quote**
- Plate: A (keys) or F (highway)

**M3 — How closing works** *(kills the scam objection — your #1 buyer fear — through process, not comparison)*
- Eyebrow: `HOW WE CLOSE`
- Headline: **Written agreement. Never a handshake.**
- Subhead: Funds move through attorney escrow. You sign in person, at your own bank.
- CTA pill: `See how we close →`  ·  Meta button: **Learn More**
- Plate: E (bank close)

**M4 — Valuation curiosity** *(top of funnel — expect the cheapest clicks)*
- Eyebrow: `FREE FMCSA LOOKUP`
- Headline: **What is your MC number worth?**
- Subhead: Enter your MC or DOT. Indicative range in 60 seconds. No signup, no obligation.
- CTA pill: `Check your company →`  ·  Meta button: **Get Quote**
- Plate: C (phone in hand)

**M5 — Objection kill** *(retargeting + Relay carriers who think lapsed insurance disqualifies them)*
- Eyebrow: `AMAZON RELAY CARRIERS`
- Headline: **Lapsed insurance? Still sellable.**
- Subhead: Coverage gets re-bound at closing — the lapse doesn't disqualify you. A loan on the truck is paid off in the wire either way.
- CTA pill: `Ask about your case →`  ·  Meta button: **Contact Us**
- Plate: G (flat lay)

### Localized sets

Do **not** machine-translate. Lift the phrasing already shipped in `src/lib/i18n.ts`:

- **ES:** "Venda su LLC de transporte. / Cerramos en 3–5 días hábiles." → CTA `Valuación gratis →` → lands `/es/get-offer`
- **RU:** use the `ru` hero strings → lands `/ru/get-offer`

Match the person in plate B to the audience. Nobody else in this niche runs Russian-language
Meta creative at Slavic-American carriers — that's the cheapest arbitrage available to you.

### Primary text (the copy above the image, ~125 chars visible)

1. Selling your trucking company? Amazon Relay carriers get priority review. Written offer in 24 hours, wire at your own bank in 3–5 business days. 400+ sales closed.
2. An active Amazon Relay contract is the single biggest thing that moves your number — ahead of fleet size or age of authority. Free FMCSA-based valuation, no obligation.
3. Written agreement, never a handshake. Funds move through attorney escrow and you sign in person, at your own bank. Average close: 3–5 business days.
4. Enter your MC or DOT number and get an indicative value range in under a minute. No signup, no pushy calls.
5. Insurance lapsed? If your LLC holds an active Relay contract, that's not a dealbreaker — coverage gets re-bound at closing. Send your MC number to get started.

---

## 2. Base plate prompts

### Master style block — paste above every concept

```
Photorealistic editorial photograph — cinematic, premium, restrained. Looks like a Ford
or Bloomberg brand campaign, NOT stock photography. Deep near-black shadows (#0a0a0b),
warm amber-orange highlights (#ff8a1a), golden-hour or blue-hour light. Shallow depth of
field, natural light only, subtle film grain, no HDR, no oversaturation. Real texture:
worn asphalt, dust, scuffed leather, honest skin.

This image is a BACKGROUND PLATE for an advertisement. Branding and headlines will be
added in post-production, so:
- The bottom 45% of the frame must be visually quiet and fall into deep shadow, so white
  text laid over it stays legible. No busy detail, no bright highlights down there.
- Keep a clear, uncluttered dark area in the top-left corner for a logo.
- The subject sits in the upper-middle of the frame.

Hard constraints:
- NO text, letters, numbers, logos, decals, or signage anywhere in the image.
- All cabs and trailers plain white / unmarked — no fleet livery.
- NO Amazon branding: no smile arrow, no Prime blue, no Relay app UI.
- No watermarks, no borders, no frames.

Aspect ratio: portrait 2:3 (1024x1536).
```

### Plate A — Keys on the signed folder  *(the exit metaphor)*

```
A set of semi-truck keys on a worn brown leather fob resting on a closed manila document
folder, on a dark walnut desk. A heavy fountain pen beside them, cap off. One warm desk
lamp from the upper left; everything else falls to near-black. Low 30-degree angle, 50mm,
f/2.0 — keys tack sharp, the desk melting into bokeh. Deep in the blurred background,
through a window, the silhouette of a white sleeper-cab semi in a yard at dusk with amber
light along its side. The keys sit in the upper-middle third of the frame; the foreground
desk surface below them is pure shadow. Mood: quiet, final, dignified — a decision already
made, not a sales pitch.
```

### Plate B — The owner beside his truck  *(generate 3 ethnic variants)*

```
A man in his late 30s, short dark beard, plain navy work jacket over a t-shirt, standing
calmly beside the front fender of a clean white sleeper-cab semi in a large trailer yard
at sunrise. Weight on one leg, hands loose, faint confident half-smile, looking slightly
off-camera toward the light — not posing. He reads as a real owner-operator with ten years
on him: weathered hands, stubble, real jacket creases. Warm rim light on his shoulder from
the low sun, cool blue shadow fill. Rows of plain white dry-van trailers recede in soft
focus behind him. 85mm, f/2.0. He occupies the right half of the frame from the waist up;
the lower-left quadrant is deep shadowed asphalt.
```
- **ES variant:** "A Latino man in his early 40s, clean-shaven, dark hair…"
- **RU variant:** "A Slavic man in his early 40s, light brown close-cropped hair…"

### Plate C — Phone in hand, MC lookup on screen  *(direct response)*

```
Close-up of a man's weathered hand holding a smartphone at chest height. The screen shows
a minimal dark interface: near-black background, one rounded input field, one bright
amber-orange pill-shaped button below it — abstract and softly out of focus so nothing is
legible, shapes and colour only. Behind the hand, a truck yard at golden hour dissolves
into warm bokeh; a white semi's chrome catches the sun. 50mm, f/1.8, focus on the screen.
The phone sits in the upper-right of the frame; the lower-left third is dark bokeh.
```

### Plate D — Blue-hour dock line  *(speaks straight to Relay carriers)*

```
Wide shot of a long row of plain white 53-foot dry-van trailers backed into loading dock
doors at a large distribution warehouse, at blue hour. Overhead sodium lights throw warm
amber pools onto wet asphalt; the sky is deep navy fading to a thin orange band at the
horizon. One tractor pulls away at the far left, headlights on, slight motion blur.
Absolutely no signage, logos, or dock numbering. 24mm, deep focus. The dock line sits
across the upper-middle of the frame; the wet asphalt foreground below is dark and empty.
```

### Plate E — The bank close  *(the closing scene — signed in person, nothing remote)*

```
Over-the-shoulder view inside a small-town American bank branch. Two men at a wooden desk;
the near man's shoulder frames the left edge, out of focus. The far man — mid-40s, plain
button-down, no tie — slides a signed document folder across the desk. Neither face fully
visible; this is about hands and paper. Warm afternoon daylight through venetian blinds,
dust in the light, brass desk lamp. 35mm, f/2.2. Action in the upper-middle; the desk
surface in the lower third is in shadow. Institutional, calm — a community bank, not a
glass tower.
```

### Plate F — The clean exit  *(brand / retargeting)*

```
A single white sleeper-cab semi driving away from camera down an empty two-lane highway at
sunrise, seen from a low position on the centerline. Vast open sky fills the top two-thirds
— deep blue overhead grading to gold at the horizon. Long shadows, wet road reflecting the
sun, mist in the distance. The truck is small, centered, about one-third down from the top.
The road surface across the bottom of the frame is dark and empty. 35mm, deep focus, no
other vehicles, no road signs, no billboards.
```

### Plate G — Requirements flat-lay  *(qualification)*

```
Top-down flat lay on a warm walnut desk: an open manila folder of crisp official-looking
documents (all text blurred and illegible), an insurance card, semi-truck keys on a leather
fob, a black fountain pen, a smartphone face-down. All objects clustered in the upper half;
the lower half of the frame is empty dark wood. Single soft window light from the upper
left, deep natural shadows, matte paper texture. No legible words on anything. Editorial,
Kinfolk-magazine restraint.
```

### Plate H — Typographic backdrop  *(copy-only ads)*

```
Abstract background: brushed dark charcoal metal, almost black (#0a0a0b), raked by a single
soft warm amber light from the upper right fading to pure black at the lower left. Faint
diagonal grain and micro-scratches. No objects, no subject, no text. An uncluttered backdrop
for typography.
```

---

## 3. Overlay spec — exact numbers

Canvas **1080 × 1350** (4:5 feed). All coordinates from top-left.

| Element | Position | Style |
|---|---|---|
| Photo plate | fill, center-crop | — |
| Bottom scrim | y 470 → 1350 | linear-gradient transparent → `#0a0a0b` (solid by y=1080) |
| Top scrim | y 0 → 280 | linear-gradient `rgba(10,10,11,.55)` → transparent |
| **Logo** | x 72, y 64 | `logo-on-dark.png`, width 300px |
| Eyebrow | x 72, y 838 | Inter SemiBold 24, tracking `.40em`, UPPERCASE, `#ff8a1a` |
| Headline L1 | x 72, y 890 | Inter SemiBold 86, line-height .98, tracking `-.04em`, `#fff` |
| Headline L2 | x 72, +88 | Inter Light **Italic** 86, `rgba(255,255,255,.85)` |
| Subhead | x 72, +40 below headline | Inter Regular 30, `rgba(255,255,255,.75)`, max-width 820 |
| CTA pill | x 72, y 1190 | bg `#ff8a1a`, text `#0a0a0b` Inter SemiBold 28, padding 22×40, radius 999 |
| Trust strip | x 72, y 1272 | Inter Medium 22, `rgba(255,255,255,.6)`, `·` separators in `#ff8a1a` |

Trust strip text: `400+ sales closed · 3–5 day close · No commission · Nationwide US`

**Two-line italic headline is the site's own treatment** (`Hero.tsx` — line 1 semibold, line 2
italic light at 85% white). Keeping it makes the ad and the landing page feel like one thing,
which measurably lifts conversion.

### Safe zones

- Meta center-crops 4:5 → 1:1 for some placements: **nothing critical above y=135 or below
  y=1215.** The trust strip is expendable; the CTA pill is not — keep it at y≤1190.
- For 9:16 Reels/Stories: don't regenerate. Take the 1080×1350, pad top and bottom with solid
  `#0a0a0b` to 1080×1920, move the logo into the top band.
- Keep overlay text under ~12 words total. Text-heavy creatives still get throttled delivery
  even though the old 20% rule is retired.

### Canva recipe

1. New design → 1080×1350. Background `#0a0a0b`.
2. Upload the ChatGPT plate → fill the frame.
3. Upload `public/brand/logo-on-dark.png` → top-left, 300px wide.
4. Rectangle over the bottom half → gradient black → transparent, 100% at the bottom.
5. Text boxes per the table. Font: **Inter** (in Canva's font list).
6. CTA pill: rounded rectangle `#ff8a1a`, text `#0a0a0b`.
7. Save as a Brand Template → then every new ad is swap-photo + swap-headline.

---

## 4. Policy notes

- **Never put Amazon's logo, smile arrow, Prime-blue livery, or a Relay app screenshot in an
  image.** Trademark use in imagery is what gets accounts flagged.
- **"Amazon Relay" in body text is fine** — descriptive, referential, no implied endorsement.
  Keep it out of the *Headline* field (harshest automated review) and never phrase it as a
  partnership ("Amazon-approved", "official Relay buyer").
- In-image, the eyebrow is the only place "Amazon Relay" appears, at small size. If a set gets
  rejected, swap to the TM-free eyebrow variant listed under M1 rather than appealing.
- **Avoid implying financial hardship.** "Behind on your truck note?" asserts financial status
  — a real personal-attributes rejection. "Own a trucking LLC?" is fine.
- **No hard price promises.** "Get $75,000 for your MC" invites policy trouble and bad leads.

---

## 5. Targeting

Meta has **no "Amazon Relay" interest**. Three layers, in order of value:

1. **Customer-list Custom Audience — by far the strongest.** The MC monitor already pulls FMCSA
   carrier records with contact info. Export buy-box-fitting MC holders, upload phones + emails,
   build a 1% Lookalike. Phone match rates on this population are high, and nobody else in the
   niche has this data.
2. **Website Custom Audience / retargeting** — needs the pixel (§0). Retarget `/get-offer`
   abandoners with M5 on plate F.
3. **Broad interests (cold prospecting):** Truck driver, Owner-operator, Trucking industry,
   Semi-trailer truck, Freight transport, CDL; layer Behaviors → Small business owners.
   Age 28–60, US. Language targeting RU / ES for the localized sets.

**Geo concentration:** Chicago, Sacramento, Portland, Seattle, Charlotte, Atlanta, Dallas,
Houston, Miami, Philadelphia, Cleveland, Minneapolis, Spokane.

**Launch shape:** one campaign, one ad set, 5 creatives (M1–M5 on their matched plates).
Advantage+ placements on. Don't hand-split budget across concepts on day one.

---

## 6. Production checklist

- Generate plates at **portrait 1024×1536**, crop to **1080×1350**.
- 3 variants per plate — ChatGPT drifts; pick the least "AI" one. Reject garbled text,
  six-fingered hands, impossible trailer axles.
- Overlay after generation, never before.
- File naming: `veritor_meta_<plate>_<message>_<lang>.png` → e.g. `veritor_meta_D_M1_en.png`,
  so ad-level reporting is readable at a glance.
