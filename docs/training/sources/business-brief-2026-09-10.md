# Veritor Group — business brief (source for the new-employee course)

Compiled 2026-09-10 from the live site copy, i18n dictionary, valuation/FMCSA code, and internal risk/legal docs. File paths point into this repo so every claim can be re-checked.

## 1. Entity, contact, team, positioning

- Veritor Group LLC, Ohio LLC. Articles of Organization Document #202614100848, effective May 21, 2026. Ohio SoS entity 5616277. 1918 Brownell Rd, Dayton, OH 45403. Registrant of record: Kakha Shubitidze. (`src/app/(en)/verification/page.tsx`)
- Phone +1 (326) 222-5444, WhatsApp 13264670388, info@groupveritor.com. Tagline: "Sell your US trucking company. Closed in 3–5 business days." (`src/lib/site.ts`)
- Trust numbers used in marketing: 150+ valuations monthly, 3–5 business days average close, 10+ companies sold, seller keeps 100%. The earlier "400+ sales / 5+ years" claim was removed because the entity dates to May 2026. (`src/lib/site.ts`)
- Public team: Luka S. (Founder), Temuka K. (Managing Partner), Lisa K. (Customer Relations). (`src/app/(en)/about/page.tsx`)
- Positioning: Veritor facilitates the sale of the seller's LLC to a separate buyer. Never the buyer, never on ownership documents. Buyers pay Veritor separately; sellers keep 100% of the accepted number. (`~/.claude/skills/veritor-legal/SKILL.md`)
- House language rule (`src/lib/outreach/templates.ts`, `src/lib/chat/system-prompt.ts`): describe Veritor only through process verbs (value, verify, prepare, coordinate, handle, close). Never "we buy / we acquire / we're the buyer". Never the words broker, middleman, agent, agency about Veritor, not even to deny them. If asked who buys: "the structure is walked through on the call with Luka."

## 2. What qualifies, what does not

Profile A — already on Amazon Relay: active Relay contract on the LLC; insurance may be lapsed (re-binds at closing); MC active and in good standing; safety rating Satisfactory or unrated.
Profile B — no Relay: MC authority and insurance continuously active 180+ days; insurance in force now; MC active; rating Satisfactory or unrated, clean history. (`src/app/(en)/requirements/page.tsx`)

Transfers with the LLC: all federal/state filings, company phone, company email, company bank account, MC/DOT records, EIN, vehicle titles if included, Relay contract, IFTA/IRP/2290/drug-consortium registrations, at-will drivers.

Hard floors (flat $8,000): no active for-hire authority; not allowed to operate; driver OOS >= 50%; vehicle OOS >= 50%. (`src/lib/valuation.ts`, `src/lib/fmcsa.ts`)

Not a fit: sole proprietor / SSN-registered authority (legally cannot transfer); authority inactive 12+ months without Relay; Conditional/Unsatisfactory rating; Amazon DSP (non-transferable, out of scope). Relay's own thresholds are stricter than FMCSA: Unsafe Driving and HOS under 60%, Vehicle Maintenance/Controlled Substances/Driver Fitness under 75%, driver violation rate <= 35%, vehicle violation rate <= 50%.

Loans, liens, factoring are not disqualifying; payoff is structured into closing. Multiple LLCs can be sold separately.

## 3. The seller process as published

1. Enter MC/DOT at /get-offer. FMCSA record pulled; no signup.
2. Written offer with a dollar figure plus a short Letter of Intent. "No verbal commitments."
3. Membership Interest Purchase Agreement; diligence 2–3 business days; legal costs not deducted from the seller's number.
4. Closing at the seller's bank (or remote); funds through a closing attorney's escrow account, released on signature; bank updates signatories; phone/email/bank/portal credentials hand over per a closing checklist. (`src/app/(en)/how-it-works/page.tsx`)

Timelines: hero says 3–5 business days; FAQ says 7–14 days, clean LLCs nearer 7, loans/liens nearer 14; Relay blog says 7–10 days. Lead with 3–5, set expectations at 7–14 once loans/liens appear.

Never required before closing per the site: LLC documents, EIN letter, bank/portal logins, FMCSA PIN, Relay credentials. Post-close filings (state updates, drug consortium, FMCSA) are Veritor's job; no FMCSA fee for an ownership change since 2013.

## 4. Valuation engine (`src/lib/valuation.ts`)

Floor $8,000; ceiling $22,000; $25,000 ceiling only with active Relay AND Satisfactory rating. Output always a range with ±$1,500 padding.

| Factor | Effect |
|---|---|
| Active Amazon Relay | +0.30 (biggest single driver) |
| Authority age 180–365 days | +0.25 (sweet spot) |
| Authority age 366–730 days | +0.10 |
| Authority age > 730 days | −0.10 |
| Authority age < 180 days | 0 |
| Vehicle OOS better than national average | +0.15 |
| Driver OOS better than national average | +0.15 |
| Crashes (24 mo) > 5 | −0.15 |
| Crashes (24 mo) 3–5 | −0.10 |
| No insurance on file when required | −0.20 |
| MCS-150 outdated | −0.05 |

Public "5 variables": Relay, authority age (180-day gate), insurance continuity, violation record, active loans (net, not gross). Niche freight premium is qualitative, not coded. No public price grid by policy. Internal lead priority: high = Relay; medium = no Relay but MC >= 180 days with insurance; else low. The "$20K–$30K aged authority" figures in the market are flagged on-site as fraud-ring bait (Overdrive).

## 5. Seller Protection Standard (`src/app/(en)/seller-protection/page.tsx`)

1. The valuation is free, always. 2. A written offer before any commitment. 3. The purchase agreement comes before sensitive documents. 4. Your own attorney is welcome, always. 5. Escrow arrangements in writing, verifiable independently. 6. Money moves before ownership. 7. No credentials before closing. 8. A corporate acquisition, never an MC-number sale. 9. You keep the closing documentation. 10. Post-closing responsibilities in writing.

Also promised: 100% of the accepted number; "we've never had an authority deactivated post-close"; release of seller liability for post-close events with a clear effective date; escrow releases on signature.

## 6. Legal and compliance facts (`~/.claude/skills/veritor-legal/references/*`, `docs/risk-audit-stolen-load-scenarios.md`)

- FMCSA (March 2026 bulletin): do not sell, purchase, or lease a USDOT number or MC number outside a legitimate corporate transaction. Sole-proprietor authority never transfers. LLC/corporation authority goes with the company. Failure to file correctly leads to inactivation/revocation "despite the intent of the parties".
- The claim that the person left on record "can be held legally liable for fraud using the MC" is NOT in the bulletin. Do not repeat it.
- MC numbers are not phased out; the URS portal was replaced by Motus on May 14, 2026. Filings: MCSA-1, MCSA-5889 (ownership/control change), MCS-150, insurer-filed BMC-91/91X.
- Chameleon-carrier risk: new entities sharing owners/addresses with sold or revoked ones get extra scrutiny. Re-entering sellers should use a different address.
- Internal tension, unresolved with counsel: current deal practice leaves the FMCSA record unchanged after sale to preserve Relay continuity, which conflicts with FMCSA's instruction to update immediately and with the site's "FMCSA records updated after closing". Route to Luka/legal; do not assert either way to a seller.
- Fraud pattern to recognise: buyer leaves the record unchanged, books and steals 4–12 loads over 2–6 weeks, abandons the entity. No cargo policy covers deliberate theft. A clean deal file (verified buyer ID, EIN docs, bill of sale, payment trail) is the protection.
- Willful-blindness rule: when suspicion about a counterparty reaches high probability, pause, verify via public records, document, report if confirmed (FMCSA NCCDB, DOT OIG hotline, FBI IC3). This outranks revenue.
- Unresolved: whether the fee structure triggers state business-broker licensing (e.g. CA B&P §10131, FL ch. 475). Safe posture: introduce, do not negotiate price/terms, do not custody funds. Buyer KYC is not yet real; do not claim it.

Hard refusals for staff (`src/lib/chat/system-prompt.ts`): no dollar valuations outside the written process; no binding offers except Luka; no legal, tax, accounting, or financial advice; no timeline tighter than "typically 3–5 days after an offer is accepted"; no details of other sellers' deals; no naming competitors; no "we buy" and no broker/middleman/agent words.

## 7. FAQ objections and official answers (`src/lib/i18n.ts` faq)

- Sole prop → not a fit. Single truck → qualifies, lower price. Inactive authority → only with active Relay. "Sell only the MC number?" → no, FMCSA prohibits it; the entity is sold. Multiple LLCs → each separately.
- "How much?" → five variables; a written number after the FMCSA pull. "$20K–$30K offers real?" → often fraud bait; real pricing sits well below.
- Equity sale, not asset sale. Niche freight premium.
- Timeline → 7–14 days typical. Seller files nothing with FMCSA; no fee since 2013.
- Transfers: DOT/MC, EIN, phone/email/Relay/ELD, trucks only if titled to the LLC and included.
- Loans: payoff splits the price at closing; factoring/UCC handled at closing; insurance re-bound within 24 hours of closing.
- Relay: entity-bound; scorecard bound to carrier ID; Relay is not DSP.
- Drivers continue at-will; consortium, IFTA/IRP/2290 carry over.
- After sale: taxes are a CPA question; NDA on request; re-entry = chameleon flag; "don't qualify" told same day with the reason.

## 8. Buyers

Site is seller-facing only. Buyers want aged, clean, Relay-attached authorities to skip Relay's 180-day wait and inherit a clean record. The same asset is wanted by fraud rings, which is why $20K–$40K cash offers exist. A "suspected repeat buyer" protocol exists (pause, verify, document, report). The owner-operators page is a separate line of business (leasing drivers onto a Relay carrier).

## Inconsistencies to keep out of training

1. "400+ closings" survives in three blog posts; the verified figure is 10+ since June 2026.
2. 3–5 business days (hero) vs 7–14 days (FAQ).
3. /operators-vs-brokers is a fraud checklist, not a positioning page.
4. The FMCSA record-update tension is the most sensitive open legal item.
5. Public name "Luka S." vs filing registrant "Kakha Shubitidze".
