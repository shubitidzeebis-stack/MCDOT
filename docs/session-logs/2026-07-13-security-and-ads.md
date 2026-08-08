# Session log — 2026-07-12/13 (fired-worker lockout, security hardening, ads skill)

## 1. Donnie lockout (COMPLETE, live in prod)
- Fired worker = Donnie, `donnie@groupveritor.com` (admin_users #5). Account DELETED.
- Rotated on Vercel + redeployed 2026-07-12: `ADMIN_KEY` (now `luka2002!`) and
  `ADMIN_SESSION_SECRET` (random). Old `?key=Luka20Gio22` backdoor verified dead
  (307 → /admin/login); every old session cookie invalidated.
- Luka's personal admin password set to `luka2002!` (DB, scrypt-hashed).
- Remaining admin accounts: #1 luka@, #4 giorgi@ (never logged in — consider removing).

## 2. Security audit + hardening (CODE DONE, **NOT DEPLOYED**)
Full read-only audit found no critical holes. Then fixed in code:
- New central guard `src/lib/auth/require-admin.ts`: session cookie AND user
  still exists in DB → deleting a user now revokes access instantly.
- Removed the `?key=ADMIN_KEY` legacy bypass from ALL admin pages + /api/admin/*
  routes (17 files). ADMIN_KEY now only seeds initial accounts.
- Rate limiter rewritten: Neon-Postgres shared fixed-window store (table
  `rate_limits`, auto-creates) with in-memory fallback; `rateLimit()` now async,
  all 9 call sites await it.
- Deleted temp endpoint `/api/dryrun-stats`; scrubbed old password from
  `VALUATION_WIZARD_LOG.md`.
- `npm run build` passes clean.
Still open (low): spoofable x-forwarded-for IP for rate-limit keys; Turnstile
fails open if secret unset (currently set).

## 3. ⚠️ PENDING DEPLOY (the big one for next session)
Prod is still the **Jun 11 build**. Deploying ships a month of commits
(dashboard drill-down, outreach copy rewrite, …) PLUS all security work above.
Deploy = `vercel redeploy` won't work for new code — use `vercel --prod` or the
proper git flow. After deploy verify: admin login works, a form submission
works, admin pages reject logged-out access.

## 4. Outreach daily cap (⚠️ PENDING USER ACTION)
- Goal: 45/day (= exactly 2 emails per 15-min cron slot). Config lives in
  Vercel Edge Config store `ecfg_sjsrwuz8ztz1vkuhowks1trpanue`, key
  `outreachDailyCap`, MUST be a quoted string ("45" not 45).
- Lukas's edit did NOT save — store still returns "32". He must redo:
  Vercel → Storage → Edge Config → Items → "32" → "45" → Save.
- Verify by re-reading the store (pull EDGE_CONFIG conn string via
  `vercel env pull`, curl the /item endpoint).
- Noticed in Edge Config: `chatWidgetEnabled:false` (was live per memory — ask
  Lukas if intentional); `autoSendEnabled:true` with personas
  owner_operator,small_fleet,default (cold email auto-sends without approval).

## 5. Ads audit skill (CREATED — needs Claude Code restart to register)
- `.claude/skills/ads-audit/` = SKILL.md (playbook), FACTS.md (ground truth +
  false-alarm log), history/2026-07-13.md (seeded with extension audit).
- Invoke with `/ads-audit` after restart.
- Key finding from the extension audit, RE-DIAGNOSED against repo code: the
  "5× page-load conversion firing" is NOT a site bug — site code is
  event-driven only. Cause ≈ 5 duplicate page-load "Submit lead form"
  conversion actions in the Google Ads UI (Goals → Conversions). **Next
  action: clean those up in the Ads UI (~10 min) — biggest money item.**
  503 beacons possibly consent-mode; re-test after accepting cookie banner.

## 6. Env/access notes
- Vercel CLI is logged in (this machine). Vercel project:
  shubitidzeebis-stacks-projects/veritor.
- Passwords/secrets: `luka2002!` chosen by Lukas for both ADMIN_KEY and his
  login (he declined stronger); session secret is random.
