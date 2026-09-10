# Session log — 2026-09-10 handbook: Bill of Sale + calls modules, Call Desk tool

Ask: "add calls section and Bill of sale section and tool for donnie".

## Shipped (local commit only — nothing pushed, nothing deployed)
- `docs/training/veritor-call-handbook.html`: 14 → 16 modules.
  - Module 07 "The Bill of Sale": every section of the generated document in
    print order (checked against `src/lib/bos/bill-of-sale-pdf.ts`: three
    payment terms, five insurance options, six-clause library, nine
    deliverables, wire panel), the Aug 19 line-by-line walk-through, the
    clauses real deals needed that are not in the library, the deal sheet
    the front office needs.
  - Module 08 "One deal, eleven calls": the Florida deal (valuation 59076),
    Aug 18–19, all 11 calls + the 330-text thread, timeline table with
    copy/fix grades, annotated excerpts. Times converted UTC → Eastern.
    Names removed, as elsewhere in the handbook.
  - Old modules 7–14 renumbered 9–16; every in-text cross-reference,
    id, TOC link and the hero count updated by script
    (scratchpad `splice.mjs`). Module 06 step 3 now points at Module 07.
  - Two new open items for Lukas: payment terms on paper contradict the
    ladder (every generator term pays after access is delivered; a seller
    read that aloud on Aug 19), and blank documents leaving the front office.
- `docs/training/Veritor-Call-Handbook.pdf` regenerated: headless Chrome,
  `--print-to-pdf --no-pdf-header-footer`, letter, 52 → 65 pages.
- `docs/training/veritor-call-desk.html`: standalone tool for Donnie
  (no build, no libraries, saves per deal in localStorage). Tabs: Qualify
  (verdict, 180-day date, engine-range mirror of `src/lib/valuation.ts`,
  flags, next asks, copyable call summary), Talk tracks (40 searchable
  say / not-this cards), Ladder (11 rungs with order warnings), Deal sheet
  (message to the front office for the BoS generator, with pending /
  mismatch checks), Texts (templates with name/company fill-in).
  Opens on an anonymized example deal.
  Published as an artifact: https://claude.ai/code/artifact/466cb9d5-f027-4936-a07c-e744c789843f
  (private until Lukas shares it with Donnie).

## Verified
- Splice script reports sections 1–16 and refs 01–16 only.
- PDF page size unchanged (612×792); page count 65.
- Tool rendered once in headless Chrome (dark theme), all five tabs wired.

## Facts worth keeping
- Generator rules (phone/email line names the real value; staged terms)
  date to commit e2128fe on 2026-08-12, before the Florida deal; the deal
  is used as an illustration, not the cause.
- Quo call timestamps are UTC.
- Call dumps live outside the repo: `C:\Users\Nitropc\Veritor_Group\calls-rendered\`.

## Still open
- Owner-operators feature (schemas.ts, sitemap.ts, Footer.tsx, 4 untracked
  files) still uncommitted, Lukas's call.
- The handbook's Sona prompt and business brief were already in
  docs/training uncommitted; committed here with the rest of the folder.
