# Session log — 2026-09-10 (Sona setup, call handbook, Donnie login, ads audit)

Continuation of the 09-09 security session (see `2026-09-09-security-pass.md`).

## Shipped / done
- **Test rows deleted**: 15 valuations from the Windows IP 176.221.177.213 and 17 from the
  Mac IP 104.28.200.68 hard-deleted by Lukas via a one-off script (script removed).
  `?test=1` rows are flagged `is_test`; no IP filtering needed any more.
- **New-employee course**: `docs/training/veritor-call-handbook.html` + PDF
  `docs/training/Veritor-Call-Handbook.pdf` (52 pages, 14 modules), built from 148 Quo
  call transcripts + 1,159 texts (Aug 9 – Sep 9) and the site/legal file. Source brief in
  `docs/training/sources/business-brief-2026-09-10.md`. Internal only — contains real
  quotes, mistakes and open legal items. NOT to be fed to Sona.
- **Sona (Quo AI receptionist) configured and live** on (326) 222-5444:
  - Call flow: Incoming → Business hours (Mon–Fri 3 PM–11:59 PM Spain = 9 AM–6 PM ET) →
    during hours Ring users 30s → if missed Sona → voicemail; after hours Sona → voicemail.
  - Both Sona blocks: Veritor greeting, knowledge page "Veritor Group - what Sona should
    know (Sep 2026)" shared (the two Aug 9 pages are OFF and should be deleted), job
    "Message taking" (10-question intake + never-say rules + live-deal escalation),
    caller history ON, tone Neutral, voice 1, US English. Vocabulary: 25 terms (max).
  - Gotcha: any NEW Sona block added in the flow builder starts blank — re-attach
    greeting, knowledge, job and caller history per block before publishing.
  - Messaging Sona was already active ("Reply to new conversations: Always") with the
    corrected business profile; it sends the missed-call auto-texts.
  - Paste-ready prompt pack: `docs/training/sona-prompt.md`; knowledge text:
    `docs/training/sona-knowledge.txt`.
  - Test calls: Lukas 03:58 ET (all 9 fields, price deflected); Donnie 16:15 Spain
    (2:22, all 10 fields incl. the reworded "other offers" question). A blank-Sona call at
    14:00 and a missed call at 16:14 were explained (rebuilt blocks / simultaneous calls).
- **Donnie admin login recreated**: donnie@groupveritor.com, role `agent`, password set by
  Lukas (see chat), login verified on prod. Only luka@ (admin) and donnie@ (agent) exist.
- **Ads audit 2026-09-10** written to `.claude/skills/ads-audit/history/2026-09-10.md`
  (+5 FACTS entries). Headlines: 30d $2.75K / 373 clicks / 93 raw leads; DB 170 completed
  / 129 paid; new win BigWrench (Sell, Relay, 1-day close); 7d completed 25 vs 43 (holiday
  week + Sell learning + Sep 8 pauses; C2 fell equally with no changes); tracking PASS;
  Clarity + GSC pulled after Lukas unblocked the domains; Ads canvas tables still unread
  (hidden tab).
- **Wizard end-to-end test on prod (?test=1, MC 1724232)**: all steps render and save;
  $8,000 floor for an inactive carrier; no 500/429 in Vercel logs since the Sep 9 deploy.

## Open decisions (Lukas)
1. "revert" → re-enable the 4 Sell broad keywords paused Sep 8 (data says the dip is
   account-wide and started Sep 3–4, before the pauses; reverting costs ~$12/day of
   junk-heavy clicks).
2. "raise" → per-IP daily valuation cap 3 → 8 (nobody blocked yet; 2–3 sellers/week run
   the wizard 3–4 times; one caller owns three companies).
3. Negatives batch #2 appears scoped to the Amazon Relay ad group only — re-add at Sell
   campaign level / master list. Needs a visible Ads tab to confirm.
4. C2 RSA description still says "No broker … US-based buyer" — rewrite.
5. JZMA (won Sep 6): buyer hadn't completed LLC/bank transfer; seller's insurance due —
   Lukas to call the buyer.
6. SEO: URL-inspect + Request indexing the three /sell-* pages; add in-body links.
7. Delete the two Aug 9 Sona knowledge pages; give Donnie his own Quo seat.
8. Owner-operators page: still uncommitted (7 files), 404 on prod, no
   `driver_applications` table.

## Rules learned (saved to memory)
- When an audit source is blocked (Clarity, GSC, Ads tables), STOP and ask Lukas to
  unblock; never report around it.
- Power cuts: commit finished units promptly; leave a session log.

## Files added this session (uncommitted unless noted)
- docs/training/{veritor-call-handbook.html, Veritor-Call-Handbook.pdf, sona-prompt.md,
  sona-knowledge.txt, sources/business-brief-2026-09-10.md}
- docs/session-logs/2026-09-10-sona-handbook-audit.md (this file)
- .claude/skills/ads-audit/history/2026-09-10.md, FACTS.md (appended)
- Raw call exports left in `C:\Users\Nitropc\Veritor_Group\` (calls-rendered/,
  texts-rendered.txt) — contain seller PII; delete when no longer needed.
