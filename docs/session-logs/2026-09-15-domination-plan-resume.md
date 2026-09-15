# 2026-09-15 — Domination Plan review → resume point

Lukas restarted the PC mid-session. When he says **"proceed"**, do the "Week 1 code fixes"
below in order, commit each as its own commit, push, verify on production. Do NOT touch
his uncommitted work (owner-operators, driver-apply, DriverApplyForm, driver-applications,
and his one-line hunks in Footer.tsx / sitemap.ts) — stage files by name only.

## State at restart (all pushed, all verified live)
- 9980079 — sell-my-mc-authority retitled "MC number for sale by owner? …"; outreach
  emails carry tagged /llc-transfer + /insurance-status answer links.
- 30649ea — permanent redirect /blog/what-transfers-selling-trucking-llc →
  /blog/what-transfers-when-selling-trucking-llc (308 verified).
- Blog indexing: all 10 posts indexed (recorded in .claude/skills/ads-audit/history/2026-09-15.md
  + FACTS.md).
- Analysis of the "Veritor Group Domination Plan" PDF delivered in chat (summary below).

## Plan review — findings that drive the work
- Site contradicts itself: 21 of 50 `src/content/areas/*.ts` say "entirely remote / no
  in-person closing"; core pages (how-it-works, llc-transfer) say in person at the seller's
  bank via closing-attorney escrow (remote only if impractical). 9 area lines claim "our
  legal team / our office / genuinely regional". Testimonials say 9/11/13 days; homepage
  title says "closed in 3–5 days".
- GSC 3 months: core 13 pages 48 clicks/6,406 impr; blog 12 pages 39/3,423; state hubs 37
  pages 11/238; city pages 136 pages 8/1,047; 53 city pages "Crawled – not indexed"; 331
  area URLs in sitemap.
- Brand SERP: no Google Business Profile, no reviews, Bizapedia only. "sell my trucking
  company": Veritor absent from top 10. "sell amazon relay account": Veritor #2 organic.
- DB: 15 closed_won (14 companies, 11 Relay) since June — the case-study/review pool.
  Monthly completed valuations: May 21 · Jun 31 · Jul 47 · Aug 173 · Sep 68 (to the 15th).
- Rejected from the plan: "buyer you can verify" / "Veritor Group acquires…" — house rule:
  Veritor is never the buyer. Already built (skip): verification page, Organization +
  LocalBusiness schema, founder/team block, case-studies page, no "400+" left in code.

## Week 1 code fixes (do on "proceed")
1. Areas content consistency: in `src/content/areas/*.ts` replace remote-only closing
   claims with the core-page truth (in person at the seller's bank through a closing
   attorney's escrow; remote if a branch is impractical; same escrow). Remove "our legal
   team", "our office", "our team is in the same corridor", "genuinely regional". Keep the
   FMCSA/company-sale framing. Grep patterns: `no in-person|entirely remote|handled remotely`
   and `our legal team|our office|our team is in|genuinely regional`.
2. Timeline claim, one wording everywhere. ASSUMPTION until Lukas confirms: "3–5 business
   days from signed agreement; about two weeks from first contact." Touch the homepage
   `<title>`/hero, how-it-works, llc-transfer, testimonials copy where they conflict.
3. Blog posts: add `author`, `updatedAt`, and a `sources` list to each `meta` in
   `src/content/blog/*.mdx`; render byline + "Updated" date + sources in the post layout;
   feed author/dateModified into the BlogPosting schema (Schema.tsx ~line 365 defaults
   author to the founder).
4. City pages with zero GSC impressions: `robots: { index: false }` + link to the state
   hub (do NOT delete; keep the 37 state hubs indexed). Data source: GSC Pages table
   (3 months, unfiltered, rows-per-page 100 via pointer events; `page=*blog*` filters
   return "No data").
5. Footer: legal identity line "Veritor Group LLC · Ohio LLC · Entity #5616277" linking to
   /verification (SITE.legalName in src/lib/site.ts; check Footer.tsx has Lukas's
   uncommitted /owner-operators hunk — commit only the new lines).
6. Google Ads: pause the old "We buy… 400+ closings" RSA and the "400+ LLCs Closed"
   callout — needs an active Ads tab; if the classifier blocks, hand Lukas the clicks.

## Only Lukas can do (remind him)
- Google Business Profile for the Dayton address; ask the 14 closed sellers for Google
  reviews + written consent to be named; confirm the true timeline wording.
- Still open: budgets reversed (Sell $85 → $60, C2 $20 → $40); call the three Relay
  sellers from Sep 14 evening (Elevate Solutions, Block Hauling, Jackson Truck Lines).

## Gotchas carried forward
- Bash heredocs with quotes fail here — use the Write tool for scratch files.
- Classifier blocks are inconsistent (push, Edge Config, budgets): try once, then hand
  Lukas the `!` command.
- GSC/Ads tables render only in an ACTIVE tab (drilldowns work hidden); URL Inspection deep
  links 404.
