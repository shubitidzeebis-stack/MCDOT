// Build the markdown carrier roster from the live export API.
// Usage: MCDOT_CRON_SECRET=... node scripts/build-roster.mjs
// Output: reports/carrier-roster-YYYY-MM-DD.md

import { mkdirSync, writeFileSync } from "node:fs";

const SECRET = process.env.MCDOT_CRON_SECRET;
if (!SECRET) throw new Error("MCDOT_CRON_SECRET not set");
const BASE = "https://groupveritor.com/api/admin/monitor/export";
const H = { Authorization: `Bearer ${SECRET}` };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function getJson(url) {
  const res = await fetch(url, { headers: H });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

const summary = (await getJson(BASE)).summary;

const rows = [];
for (let offset = 0; ; offset += 5000) {
  const page = await getJson(`${BASE}?rows=1&limit=5000&offset=${offset}`);
  rows.push(...page.rows);
  process.stdout.write(`fetched ${rows.length} rows...\n`);
  if (page.rowCount < 5000) break;
}

const st = (r) => r.phy_address?.state ?? "";
const name = (r) => (r.dba_name || r.legal_name || "(unnamed)").trim();
const inWindow = (r) =>
  r.eligibility_state === "approaching" || r.eligibility_state === "eligible_now";
const okIns = (r) =>
  r.insurance_current === true &&
  ["green", "amber", "unknown"].includes(r.insurance_rating ?? "unknown");
const validEmail = (r) => EMAIL_RE.test((r.census_email ?? "").trim());

const verified = rows.filter((r) => r.monitor_stage === "verified");
const readyEmail = verified.filter(
  (r) => inWindow(r) && okIns(r) && r.safety_status === "pass" && validEmail(r),
);
const readyPhone = verified.filter(
  (r) => inWindow(r) && okIns(r) && r.safety_status === "pass" && !validEmail(r),
);
const awaitingSafety = verified.filter(
  (r) => inWindow(r) && okIns(r) && r.safety_status == null,
);
const review = verified.filter((r) => inWindow(r) && r.safety_status === "review");
const parkedAssessed = verified.filter((r) => r.eligibility_state === "too_new");
const parkedRaw = rows.filter((r) => r.monitor_stage === "discovered");
const disqualified = rows.filter((r) => r.monitor_stage === "disqualified");
const uninsuredNow = verified.filter((r) => r.eligibility_state === "continuity_broken");
const agedOut = verified.filter((r) => r.eligibility_state === "aged_out");

const byDays = (a, b) => (a.days_to_180 ?? 999) - (b.days_to_180 ?? 999);
readyEmail.sort(byDays);
readyPhone.sort(byDays);
awaitingSafety.sort(byDays);
review.sort(byDays);

const dqReasons = {};
for (const r of disqualified) {
  const k = r.disqualify_reason ?? "(no reason recorded)";
  dqReasons[k] = (dqReasons[k] ?? 0) + 1;
}

// Parked: when do they enter the contact window (window opens at days_to_180=30)?
const monthBuckets = {};
for (const r of parkedAssessed) {
  if (r.days_to_180 == null) continue;
  const daysUntilWindow = r.days_to_180 - 30;
  const d = new Date(Date.now() + Math.max(0, daysUntilWindow) * 86400000);
  const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  monthBuckets[k] = (monthBuckets[k] ?? 0) + 1;
}

const esc = (s) => String(s ?? "").replace(/\|/g, "/").trim();
const fmt = (r) =>
  `| ${r.dot_number} | ${esc(name(r))} | ${st(r)} | ${r.power_units ?? "?"} | ` +
  `${r.days_to_180 == null ? "—" : r.days_to_180 <= 0 ? `eligible (${-r.days_to_180}d past)` : `${r.days_to_180}d`} | ` +
  `${r.insurance_rating ?? "—"} | ${r.safety_status ?? "pending"} | ${r.acquisition_score ?? "—"} | ` +
  `${esc(r.census_email ?? "")} | ${esc(r.telephone ?? "")} |`;

const TABLE_HEAD =
  "| DOT | Company | ST | Trucks | Days→180 | Ins | Safety | Score | Email | Phone |\n" +
  "|---|---|---|---|---|---|---|---|---|---|";

const today = new Date().toISOString().slice(0, 10);
const lines = [];
lines.push(`# Carrier Acquisition Roster — ${today}`);
lines.push("");
lines.push(`> Generated from the live qualification engine (post line-audit hardening, commit de171a8).`);
lines.push(`> Gates: active for-hire property authority · insured NOW (BIPD on file) · safety pass`);
lines.push(`> (OOS ≤30%, no Unsatisfactory rating, ≤3 crashes) · in the 180-day window (150–365d) ·`);
lines.push(`> ≥4 months old (younger carriers parked + age-tracked). Timing is conservative:`);
lines.push(`> registration-dated clocks carry a +30d lag so eligibility is never overstated.`);
lines.push("");
lines.push(`## Summary`);
lines.push("");
lines.push(`| Bucket | Count |`);
lines.push(`|---|---|`);
lines.push(`| **✅ READY — EMAIL** (qualified, has email) | **${readyEmail.length}** |`);
lines.push(`| **📞 READY — PHONE ONLY** (qualified, no usable email) | **${readyPhone.length}** |`);
lines.push(`| 🕐 Awaiting safety check (in-window, insured — flowing into READY ~daily) | ${awaitingSafety.length} |`);
lines.push(`| 🔎 Review (conditional rating / elevated crashes — human look) | ${review.length} |`);
lines.push(`| ⏳ Parked: assessed, pre-window (120d+, not yet at day 150) | ${parkedAssessed.length} |`);
lines.push(`| ⏳ Parked: under 4 months (auto-assessed when they reach 120d) | ${parkedRaw.length} |`);
lines.push(`| 💔 Currently uninsured (tracked, re-checked every 2 weeks) | ${uninsuredNow.length} |`);
lines.push(`| 🪦 Aged out (>365d) | ${agedOut.length} |`);
lines.push(`| ❌ Disqualified | ${disqualified.length} |`);
lines.push(`| **Total monitored** | **${rows.length}** |`);
lines.push("");
lines.push(`Disqualification reasons: ${Object.entries(dqReasons)
  .map(([k, v]) => `${k}: ${v}`)
  .join(" · ")}`);
lines.push("");
lines.push(`In-window safety progress: pass ${summary.safety?.pass ?? 0} · pending ${summary.safety?.["(pending)"] ?? 0} (FMCSA quota ≈5k checks/day — pending drains automatically)`);
lines.push("");

lines.push(`## 📬 Safe send pace (deliverability warm-up)`);
lines.push("");
lines.push(`Fresh domain (acquisitiongroupveritor.com) — ramp slowly, watch the auto-pause breaker:`);
lines.push("");
lines.push(`| Week | Per day | Cumulative/wk |`);
lines.push(`|---|---|---|`);
lines.push(`| 1 | 20 | 140 |`);
lines.push(`| 2 | 40 | 280 |`);
lines.push(`| 3 | 70 | 490 |`);
lines.push(`| 4 | 100 | 700 |`);
lines.push(`| 5+ | 120–150 (hold) | ~900–1,050 |`);
lines.push("");
lines.push(`Order: send top-of-list first (closest to / just past the 180-day mark = hottest).`);
lines.push(`Every email is drafted by the agent and ONLY sent after human approval; bounce/complaint`);
lines.push(`auto-pause guards the domain. At this pace the current ready list clears in ~3–5 weeks`);
lines.push(`while safety checks + aging carriers keep refilling it.`);
lines.push("");

lines.push(`## ✅ READY — EMAIL (${readyEmail.length}) — sorted hottest first`);
lines.push("");
lines.push(TABLE_HEAD);
for (const r of readyEmail) lines.push(fmt(r));
lines.push("");

lines.push(`## 📞 READY — PHONE ONLY (${readyPhone.length}) — for the SMS/call queue`);
lines.push("");
lines.push(TABLE_HEAD);
for (const r of readyPhone) lines.push(fmt(r));
lines.push("");

lines.push(`## 🔎 REVIEW (${review.length}) — passed everything except a clean safety record`);
lines.push("");
lines.push(TABLE_HEAD);
for (const r of review) lines.push(fmt(r));
lines.push("");

lines.push(`## 🕐 AWAITING SAFETY CHECK (${awaitingSafety.length}) — in-window + insured; checks run daily`);
lines.push("");
lines.push(`Top 50 hottest shown (full set flows into READY automatically as checks complete):`);
lines.push("");
lines.push(TABLE_HEAD);
for (const r of awaitingSafety.slice(0, 50)) lines.push(fmt(r));
lines.push("");

lines.push(`## ⏳ PARKED — when they enter the contact window`);
lines.push("");
lines.push(`Assessed pre-window carriers (${parkedAssessed.length}) by month they reach day 150:`);
lines.push("");
lines.push(`| Month | Carriers entering window |`);
lines.push(`|---|---|`);
for (const [k, v] of Object.entries(monthBuckets).sort()) lines.push(`| ${k} | ${v} |`);
lines.push("");
lines.push(`Plus ${parkedRaw.length} under-4-month carriers (tracked; auto-assessed at 120 days,`);
lines.push(`auto-contactable at 150+ if they pass every gate). Nothing is lost — the engine`);
lines.push(`re-buckets everyone daily off their registration clock.`);
lines.push("");
lines.push(`---`);
lines.push(`*Regenerate anytime: \`node scripts/build-roster.mjs\` (needs MCDOT_CRON_SECRET).*`);

mkdirSync("reports", { recursive: true });
const out = `reports/carrier-roster-${today}.md`;
writeFileSync(out, lines.join("\n"), "utf8");
console.log(`WROTE ${out}`);
console.log(
  `readyEmail=${readyEmail.length} readyPhone=${readyPhone.length} awaitingSafety=${awaitingSafety.length} review=${review.length} parkedAssessed=${parkedAssessed.length} parkedRaw=${parkedRaw.length} dq=${disqualified.length}`,
);
