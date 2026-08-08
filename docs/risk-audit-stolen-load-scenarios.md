# Risk audit: buyer steals loads after buying a company through Veritor

**Date:** 2026-08-05 · **Status:** draft for discussion — not legal advice; final contracts need a transportation attorney.

## The scenario we're auditing

Veritor connects a seller and a buyer. The deal closes (bill of sale, money moves). The buyer deliberately does **not** update the FMCSA record — the seller's name, address, and phone stay on file. The buyer then uses the company's clean reputation to book loads and steals them (picks up freight and disappears, or double-brokers it). In the industry this is called a **chameleon carrier** — it's the #1 reason fraudsters pay $20k–$40k for aged authorities, and it's the exact pattern FMCSA is cracking down on.

Key insight up front: **the whole fraud depends on the FMCSA record NOT being updated.** A buyer who updates the record immediately gains nothing from the scheme — brokers would see the new name/address anyway. That means the single strongest protection Veritor can build is making the record update a mandatory, verified part of closing. Everything else is secondary.

## Scenario 1 (main): how it actually plays out, step by step

1. **Weeks 1–4 after closing.** Buyer books loads through freight brokers using the company's MC, old name, old contact info (or slightly-changed contact info). Loads go missing. Typical run: 4–12 loads over 2–6 weeks, then the entity is abandoned.
2. **Brokers start chasing.** The carrier packet on file has the *seller's* old phone and email. The seller starts getting angry calls from brokers, shippers, and eventually investigators. This is where the seller's nightmare begins even though they did nothing wrong.
3. **Insurance angle.** If the seller's insurance filings (BMC-91) were never swapped at closing, the *seller's insurer* receives cargo claims with the seller as named insured. Even after cancellation, the seller spends months untangling it. If the buyer filed their own insurance, that insurer denies the claims anyway — cargo policies exclude dishonest/criminal acts by the insured. **Deliberate theft by the carrier is essentially never covered by the carrier's own insurance.**
4. **Reports get filed.** Brokers file police reports, FMCSA complaints (NCCDB database), CargoNet alerts. If the pattern is big enough: FBI or DOT Office of Inspector General. The MC gets flagged; brokers' vetting tools (Carrier411, Highway, CarrierAssure) mark it — these tools already flag "recently sold" MCs as high risk.
5. **Investigators trace the entity.** FMCSA record → seller's name. State corporate registry → whoever is listed. The seller's first and only useful answer is: **"I sold the company on [date] through Group Veritor — here are the documents."**
6. **Veritor gets a subpoena or records request.** This is near-certain in this scenario, and it is *not* the bad outcome — it's the moment that decides everything. If Veritor hands over a clean file (buyer's verified ID, EIN docs, bill of sale, payment trail, communications), Veritor is a cooperative witness and the investigation moves to the buyer. If Veritor has nothing — no verified buyer identity, cash/crypto payment, anonymous Telegram contact — Veritor looks like a fraud conduit, and that's where real exposure starts.

## Who actually pays for the stolen load

Nobody in the sale "covers" it — it turns into litigation and criminal referral. The money chain in practice:

| Party | What happens |
|---|---|
| **Shipper** | Their own cargo/inland-marine insurance often pays first, then the insurer subrogates (sues whoever it can). |
| **Freight broker** | Usually eats the loss in practice — shipper contracts make brokers responsible, and brokers pay to keep the customer. Their contingent cargo insurance typically **denies** fraud/double-brokering claims. Brokers increasingly sue anyone whose negligence let the fraudster in. |
| **Carrier entity (now buyer's)** | Legally liable, practically judgment-proof — the fraudster abandons it. Its cargo insurance denies (criminal-acts exclusion) or was cancelled. |
| **Seller** | Not liable for post-closing acts **if** the sale was a documented, legitimate entity sale and records/insurance were updated. But they absorb the harassment, and if records were never updated, FMCSA guidance says the person on record **"can be held legally liable for fraudulent activities carried out using your MC number."** |
| **Veritor** | No liability for the load itself. Exposure is indirect — see below. |

Important for Lukas's mental model: there is no insurance product anywhere in this chain that "covers stolen loads by a fraudulent carrier." That's why brokers are paranoid and why prevention (not coverage) is the only real mechanism.

## The seller's question: "can they point at Veritor?"

Yes — they will, immediately, and **that's actually good for everyone if Veritor's file is clean.** The seller pointing at Veritor is not an accusation that sticks; it's them handing investigators the paper trail. The risk inversion to understand:

- Seller with a clean closing file + updated FMCSA record → a few unpleasant weeks, then cleared.
- Seller who did a handshake deal, never updated records, insurance still on file → months of hell, possible personal liability, possible FMCSA revocation proceedings naming them.

So the seller-protection story and the Veritor-protection story are the same story: **a closing process that leaves a timestamped, verifiable trail and changes the government record.** Veritor can honestly market this to sellers as "we make sure the sale is legally clean so nothing that happens afterward comes back to you" — that's a selling point, not fine print.

## Veritor's own exposure — four vectors

1. **Subpoena/records burden** (near-certain eventually): cheap if files are organized per deal; expensive and scary if not.
2. **Civil negligence claims** from defrauded brokers/shippers ("Veritor negligently facilitated the sale to an obvious fraudster"): weak claims against a marketplace **unless** Veritor ignored red flags or did zero verification. KYC + terms + no-red-flag-ignoring = strong defense.
3. **Criminal/willful-blindness theory** (worst case, avoidable): only if the platform becomes known as a place fraudsters buy clean MCs and Veritor keeps closing deals with anonymous buyers paying in crypto. One bad deal is survivable; a *pattern* of bad deals with no vetting is what prosecutors call willful blindness.
4. **FMCSA/regulatory perception** — the big strategic one, see next section.

## Regulatory backdrop (this changed recently and matters a lot)

- **Oct 1, 2025:** FMCSA stopped issuing new MC numbers (URS rollout). Existing aged authorities became scarcer/more valuable — good for the marketplace, but also more attractive to fraudsters.
- **March 13, 2026 FMCSA bulletin:** "DO NOT Sell, Purchase, or Lease a USDOT Number or Operating Authority (MC Number)… outside of a legitimate corporate transaction." Consequences of unauthorized transfers: USDOT number deactivated, all registrations and operating authority revoked.
- **What stays legal:** selling the **company** (the LLC/corp that holds the authority) as a legitimate corporate transaction, with FMCSA records updated immediately after the ownership change. Sole proprietor authorities effectively **cannot** transfer at all.
- **Business-model implication:** Veritor must be — in contracts, on the website, and in practice — a marketplace for **trucking business acquisitions** (entity sales with compliant transfers), never an "MC number shop." FMCSA is actively hunting the latter.

### Finding in our own repo

The site currently uses **"sell MC authority [city]"** as SEO keywords hundreds of times across `src/content/areas/*.ts`, plus blog framing like "why we buy MC authorities." The substance of the site (entity/LLC sales, bill of sale, transfer docs) is on the right side of the line, but the *wording* pattern-matches to exactly what the March 2026 bulletin warns about. Worth a deliberate pass later: keep the SEO reach but shift phrasing toward "sell your trucking company / LLC with MC authority" and add a compliance page explaining that Veritor only facilitates legitimate corporate transactions with FMCSA record updates. That page is both a legal shield and a trust signal.

## Other scenarios worth running

- **Scenario 2 — it wasn't even the buyer.** A third party spoofs the MC (identity theft against carriers is rampant; no purchase needed). Buyer gets wrongly accused, seller gets dragged in. Veritor's dated records help *both* clients prove the timeline. Same protection mechanism works.
- **Scenario 3 — dirty seller, clean buyer.** Seller committed fraud *before* the sale and later claims "that was after I sold it." Veritor's timestamped closing file protects the **buyer** this time. The record cuts both ways — that's why it's the core asset.
- **Scenario 4 — FMCSA kills the authority post-sale.** Deal was structured badly (sole prop seller, or records never updated) and FMCSA deactivates the number. Buyer demands a refund and sues the seller — and names Veritor. This is why the closing checklist and the facilitation agreement both matter even when nobody steals anything.

## Protection architecture (five layers)

1. **Buyer verification (KYC).** Government ID + match to a live video call, EIN/formation documents, beneficial-owner names, payment only from a US bank account matching the buyer's name (no crypto, no third-party payments). Red flags that pause a deal: buyer wants multiple MCs quickly, refuses ID, VOIP-only contact, extreme rush, someone else's money.
2. **Compliant-closing checklist (the fraud-killer).** At/immediately after closing, as a standard Veritor service: FMCSA record update filed (company officials, address, contact), insurance cut-over (buyer's BMC-91 filed, seller's cancelled with written confirmation), state registry update. Proof collected into the deal file. Optionally tie final escrow release to the FMCSA filing. A legitimate buyer loses nothing (updating officers/address does **not** reset the authority's age or safety score). A chameleon fraudster loses everything — they'll walk away, which is the goal.
3. **Contracts.**
   - *Facilitation agreement* (each party ↔ Veritor): Veritor is an introducer/facilitator, not a party to the sale, not an agent, makes no representations about either counterparty; each side does its own due diligence; indemnification and limitation of liability; obligation to complete the compliant-closing steps.
   - *Purchase agreement template* (buyer ↔ seller, provided by Veritor): buyer covenants to update FMCSA records within X days and operate lawfully; buyer indemnifies seller for post-closing acts; seller indemnifies buyer for pre-closing acts. Clean liability timeline anchored to the closing date.
   - Both need a transportation attorney's review before use.
4. **Deal file + retention.** One folder per deal: KYC, agreements, bill of sale, payment records, filing confirmations, key communications. Retained ~5 years. This is the subpoena-ready file that turns Veritor from suspect into witness.
5. **Veritor's own coverage.** Professional liability (E&O) policy for the facilitation business; attorney on call for the first subpoena.

## How to say all this without scaring buyers

Never frame it as fraud prevention. Frame it as **the secure closing process** — the thing that makes buying through Veritor safer than buying off Facebook:

- To buyers: "Verified sellers, clean title, escrow, and a compliant FMCSA transfer — so the authority you buy can't be revoked later and the old owner can't claw anything back." (The revocation risk is real — see the March 2026 bulletin — so this is honest.)
- To sellers: "We verify every buyer and file the ownership change with FMCSA at closing, so whatever happens to the company afterward is legally not your problem."
- ID verification is normal marketplace behavior now (escrow services, Airbnb, even Facebook Marketplace for vehicles). Serious buyers expect it; the only people it repels are the ones you want repelled.

## Protocol: suspected repeat buyer (added 2026-08-05)

Situation: Lukas suspects one of his regular repeat buyers may be running the stolen-load scheme with authorities bought through Veritor. This changes the legal posture completely — see below.

**Why suspicion changes everything.** Before suspicion, the worst realistic claim against a marketplace is negligence, and contracts/KYC defend against it. After suspicion, continuing to close deals with that buyer converts the theory to *knowing facilitation / willful blindness* — and **no contract, disclaimer, or bill-of-sale clause protects against that**. The protection now is behavior, not paperwork.

**The playbook:**
1. **Pause deals with that buyer** — no accusation needed. Cover story is real: the March 2026 FMCSA bulletin. "New compliance process, every buyer now goes through verification + FMCSA record update at closing." Legit buyers comply; a chameleon operator walks away — which is both the answer and the fix.
2. **Do not accuse or tip off.** No confrontation, no hints. Just the new process, applied to everyone.
3. **Verify quietly.** Pull the FMCSA public records (SAFER + Licensing & Insurance) for every MC this buyer previously bought: Was the record ever updated to the buyer? Is the authority now revoked/deactivated? Insurance cancelled right after sale? Old seller info still on file months later = the pattern confirmed.
4. **Write a dated note** (this doc + deal notes): what raised suspicion, when, what was changed in response. If investigators ever come, "we noticed X on [date] and did Y" is the good-faith story that keeps Veritor a witness, not a target.
5. **If the pattern is confirmed, report it** — FMCSA NCCDB complaint, FBI IC3, or DOT OIG hotline. Voluntary reporting is the strongest "keep Veritor out of it" move that exists: it makes Veritor the source of the investigation instead of a subject of it. Not reporting while continuing to sell is the exact opposite.
6. **Clean up past deals.** For prior sales to this buyer where the FMCSA record was never updated: contact those sellers and help them file the ownership-change update now. Protects the sellers (their name is the one on the record), and is further evidence of good faith.

**Expectation to manage:** if this buyer has been stealing loads, Veritor cannot avoid being *contacted* — subpoenas follow the paper trail regardless. What Veritor controls is whether that contact is one afternoon of handing over a clean file, or months of being investigated. Everything above is aimed at the first outcome.

## Suggested next steps (in order)

1. Draft the facilitation agreement + purchase-agreement post-closing covenants (working drafts for attorney review).
2. Turn the compliant-closing checklist into a real ops artifact (and later an admin-tool feature next to the BoS generator).
3. Wording pass on site copy: "sell your trucking company (with MC authority)" framing + a compliance/how-transfers-work page.
4. Define the KYC standard (what we collect, where it's stored, retention).
5. Lukas: get one consult with a transportation attorney to bless the structure and the two documents.

## Sources

- FMCSA newsroom bulletin (2026-03-13): "DO NOT Sell, Purchase, or Lease a USDOT or MC Number" — fmcsa.dot.gov/newsroom/do-not-sell-purchase-or-lease-usdot-or-mc-number
- FMCSA FAQ: "Can I sell my USDOT# or MC# (operating authority)?" — fmcsa.dot.gov/faq/can-i-sell-my-usdot-or-mc-ie-operating-authority
- CDLLife summary of the bulletin: cdllife.com/2026/fmcsa-warns-truckers-not-to-buy-sell-or-lease-a-usdot-or-mc-number
- Seubert alert summary: seubert.com/blog/fmcsa-alert-do-not-buy-sell-or-lease-usdot-or-mc-numbers
- Overdrive: "Your authority might be worth $30,000 to freight fraudsters" — overdriveonline.com/channel-19/article/15704468
- CarrierAssure: "Beware of carriers selling their MC number" — carrierassure.com/blog/alert-beware-of-carriers-selling-their-mc-number
- FreightWaves: "Strategic cargo theft leaves drivers, brokers liable for massive losses" — freightwaves.com/news/strategic-cargo-theft-leaves-drivers-brokers-liable-for-massive-losses
- WTW: fraudulent load booking & insurance response — wtwco.com/en-us/insights/2023/09/under-the-current-economic-climate-fraudulent-load-booking-by-bad-actors-is-a-common-occurrence
