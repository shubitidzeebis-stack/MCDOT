"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AgentActionRow,
  AgentPulse,
  FailedSendCounts,
  HotProspect,
  MonitorCompanyDetail,
  MonitorCursor,
  MonitorExportRow,
  OutreachDraftRow,
  OutreachEmailDetail,
  OutreachSentRow,
  ReadyStats,
  SenderStatsRow,
} from "@/lib/db/monitor";
import {
  parseSenders,
  type OutreachSender,
} from "@/lib/outreach/senders";
import {
  DISQUALIFY_LABEL,
  ELIGIBILITY_LABEL,
  INSURANCE_LABEL,
  OUTCOME_LABEL,
  SAFETY_LABEL,
  STAGE_LABEL,
  labelFor,
} from "@/lib/monitor/labels";

// Agent operations dashboard. All data is computed server-side and passed in;
// this component renders it and offers manual + 30s auto-refresh (router.refresh).

export type AgentDashboardData = {
  stageCounts: Record<string, number>;
  eligibilityCounts: Record<string, number>;
  insuranceCounts: Record<string, number>;
  safetyCounts: Record<string, number>;
  outreachCounts: Record<string, number>;
  actions: AgentActionRow[];
  cursors: MonitorCursor[];
  hot: HotProspect[];
  sentEmails: OutreachSentRow[];
  outreachControl: { paused: boolean; reason: string | null; updated_at: string | null };
  healthToday: { sent: number; bounced: number; complained: number };
  health7d: { sent: number; bounced: number; complained: number };
  ready: ReadyStats;
  pulse: AgentPulse;
  failedSends: FailedSendCounts;
  dataOk: boolean;
  outcomes: Record<string, number>;
  senderStats: SenderStatsRow[];
  legacyAddress: string;
  flags: {
    monitorEnabled: boolean;
    discoveryEnabled: boolean;
    outreachDraftEnabled: boolean;
    outreachSendEnabled: boolean;
    autoSendEnabled: boolean;
    followUpEnabled: boolean;
    windingDownEnabled: boolean;
    smsOutreachEnabled: boolean;
    monitorDays: string;
    autoSendPersonas: string;
    outreachDailyCap: string;
    outreachSenders: string;
    outreachTemplate: string;
  };
  readiness: {
    database: boolean;
    fmcsaSocrataToken: boolean;
    fmcsaApiKey: boolean;
    cronSecret: boolean;
    outreachSender: boolean;
    webhookSecret: boolean;
    anthropicOutreach: boolean;
  };
  adminKey: string | null;
  generatedAt: string;
};

// What the drill-down modal is currently showing.
type DrillView =
  | { type: "list"; kind: "hot" | "phone" | "disqualified" | "review"; title: string }
  | { type: "drafts" }
  | { type: "sent" }
  | { type: "company"; id: number }
  | { type: "email"; id: number };

function sum(rec: Record<string, number>): number {
  return Object.values(rec).reduce((a, b) => a + b, 0);
}

// Postgres ::text timestamps look like "2026-06-07 12:34:56.123+00"; ISO uses
// "T" + "Z". Normalize a bare "+00" offset to "+00:00", and assume UTC when no
// zone is present, so Date.parse succeeds either way.
function parseTs(iso: string | null): number | null {
  if (!iso) return null;
  let norm = iso.trim().replace(" ", "T");
  if (/[+-]\d{2}$/.test(norm)) norm += ":00";
  else if (!/(z|[+-]\d{2}:?\d{2})$/i.test(norm)) norm += "Z";
  const t = new Date(norm).getTime();
  return Number.isNaN(t) ? null : t;
}

function relTime(iso: string | null): string {
  const t = parseTs(iso);
  if (t == null) return iso ?? "never";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Absolute local time for hover titles — "2h ago" can't answer "did it stop
// this afternoon?", so every relative timestamp carries the real one.
function absTime(iso: string | null): string {
  const t = parseTs(iso);
  if (t == null) return iso ?? "";
  return new Date(t).toLocaleString();
}

// Relative timestamp with the absolute local time on hover.
function Rel({ iso }: { iso: string | null }) {
  return <span title={absTime(iso)}>{relTime(iso)}</span>;
}

// Stale when the last heartbeat is more than ~one missed daily window old.
function isSweepStale(iso: string | null): boolean {
  const t = parseTs(iso);
  return t == null || Date.now() - t > 26 * 3600_000;
}

// ── Per-sender account stats ────────────────────────────────────────────────
// Fold DB per-identity stats into the configured senders: '' (rows queued
// before the multi-domain split) counts toward the env identity, mirroring
// send.ts cap accounting. Configured senders always show, even at zero sends;
// stats for identities no longer in the config still surface as extra rows.

type MergedSender = SenderStatsRow & {
  name: string;
  address: string;
  cap: number | null;
};

function laterTs(a: string | null, b: string | null): string | null {
  const ta = parseTs(a);
  const tb = parseTs(b);
  if (ta == null) return b;
  if (tb == null) return a;
  return ta >= tb ? a : b;
}

function addStats(a: SenderStatsRow, b: SenderStatsRow): SenderStatsRow {
  return {
    sender: a.sender,
    sent24h: a.sent24h + b.sent24h,
    sent7d: a.sent7d + b.sent7d,
    sentTotal: a.sentTotal + b.sentTotal,
    queued: a.queued + b.queued,
    bounced7d: a.bounced7d + b.bounced7d,
    complained7d: a.complained7d + b.complained7d,
    lastSentAt: laterTs(a.lastSentAt, b.lastSentAt),
  };
}

const ZERO_STATS: SenderStatsRow = {
  sender: "",
  sent24h: 0,
  sent7d: 0,
  sentTotal: 0,
  queued: 0,
  bounced7d: 0,
  complained7d: 0,
  lastSentAt: null,
};

function mergeSenderStats(
  stats: SenderStatsRow[],
  cfg: OutreachSender[],
  legacyAddress: string,
  globalCap: number,
): MergedSender[] {
  const byAddr = new Map(stats.map((s) => [s.sender, s]));
  const used = new Set<string>();
  const rows: MergedSender[] = [];
  for (const s of cfg) {
    let agg: SenderStatsRow = { ...ZERO_STATS, sender: s.address };
    const own = byAddr.get(s.address);
    if (own) {
      agg = addStats(agg, own);
      used.add(s.address);
    }
    if (s.address === legacyAddress) {
      const legacy = byAddr.get("");
      if (legacy) {
        agg = addStats(agg, legacy);
        used.add("");
      }
    }
    rows.push({ ...agg, name: s.name, address: s.address, cap: s.cap });
  }
  for (const s of stats) {
    if (used.has(s.sender)) continue;
    const address = s.sender || legacyAddress || "default sender";
    const existing = rows.find((r) => r.address === address);
    if (existing) {
      Object.assign(existing, addStats(existing, s), {
        name: existing.name,
        address: existing.address,
        cap: existing.cap,
      });
      continue;
    }
    rows.push({
      ...s,
      name: address.includes("@") ? address.split("@")[0] : address,
      address,
      // With no sender split configured, the global daily cap is the throttle.
      cap: cfg.length === 0 ? globalCap : null,
    });
  }
  return rows;
}

// When the next 15-minute send slot fires — the cron runs 14:00–21:45 UTC
// (10:00am–5:45pm ET), one batch per quarter hour.
function nextSlotText(now = new Date()): string {
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const open = 14 * 60;
  const lastSlot = 21 * 60 + 45;
  if (mins < open) {
    return `next batch when the send window opens at 10:00am ET (~${Math.ceil((open - mins) / 60)}h)`;
  }
  if (mins >= lastSlot) {
    return "send window closed for today — resumes 10:00am ET tomorrow";
  }
  const wait = 15 - (mins % 15);
  return `next batch in ~${wait} min`;
}

const RATING_COLOR: Record<string, string> = {
  green: "#34d399",
  amber: "#fbbf24",
  red: "#f87171",
  eligible_now: "#34d399",
  approaching: "#ff8a1a",
  too_new: "#60a5fa",
  aged_out: "#9ca3af",
  awaiting_authority: "#6b7280",
  authority_inactive: "#f87171",
  continuity_broken: "#fbbf24",
  not_in_fmcsa: "#9ca3af",
  "(unassessed)": "#6b7280",
  pass: "#34d399",
  review: "#fbbf24",
  fail: "#f87171",
  interested: "#34d399",
  replied: "#60a5fa",
  not_interested: "#9ca3af",
  do_not_contact: "#f87171",
};

function colorFor(key: string): string {
  return RATING_COLOR[key] ?? "#8b8b90";
}

export function AgentDashboard({ data }: { data: AgentDashboardData }) {
  const router = useRouter();
  const [auto, setAuto] = useState(true);
  const [tick, setTick] = useState(0);
  const [resuming, setResuming] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  // Re-render the "updated Xs ago" label every second.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-refresh the server data every 30s when enabled.
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [auto, router]);

  async function resumeSending() {
    setResuming(true);
    try {
      await fetch("/api/admin/outreach/resume", { method: "POST" });
      router.refresh();
    } finally {
      setResuming(false);
    }
  }

  // The "Stop sending" control — trips the same breaker the webhook uses, so
  // the sender refuses every send until Resume is pressed. Two-click confirm.
  async function stopSending() {
    setStopping(true);
    try {
      await fetch("/api/admin/outreach/pause", { method: "POST" });
      router.refresh();
    } finally {
      setStopping(false);
      setConfirmStop(false);
    }
  }

  // ── Drill-down modal state ────────────────────────────────────────────────
  // A small history stack so list → company navigation has a Back button.
  const [drillStack, setDrillStack] = useState<DrillView[]>([]);
  const drill = drillStack[drillStack.length - 1] ?? null;
  const openDrill = (v: DrillView) => setDrillStack((s) => [...s, v]);
  const backDrill = () => setDrillStack((s) => s.slice(0, -1));
  const closeDrill = () => setDrillStack([]);

  const stage = data.stageCounts;
  const totalMonitored = sum(stage);
  const draftsPending =
    (data.outreachCounts.draft ?? 0) + (data.outreachCounts.approved ?? 0);
  const sentCount = data.outreachCounts.sent ?? 0;
  const phoneQueue = stage.outreach_phone ?? 0;
  const disqualified = stage.disqualified ?? 0;
  const dailyCap = Number(data.flags.outreachDailyCap) || 20;

  // Sends that need a human look — deliberate discards/suppressions excluded.
  const failedSendsN = data.failedSends.failed + data.failedSends.deadAfterRetries;
  const paused = data.outreachControl.paused;
  const personaCount = data.flags.autoSendPersonas
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;
  const bounceRate7d =
    data.health7d.sent > 0 ? data.health7d.bounced / data.health7d.sent : 0;
  const senderCfg = parseSenders(data.flags.outreachSenders);
  const senderRows = mergeSenderStats(
    data.senderStats,
    senderCfg,
    data.legacyAddress,
    dailyCap,
  );
  // Short label for a sent row's identity (NULL = legacy env sender).
  const senderLabel = (addr: string | null): { name: string; full: string } => {
    const a = addr ?? data.legacyAddress;
    if (!a) return { name: "—", full: "default sender" };
    const cfg = senderCfg.find((s) => s.address === a);
    return { name: cfg?.name ?? a.split("@")[0], full: a };
  };
  const readyEmail = data.ready.readyEmail;
  const runwayDays = dailyCap > 0 ? Math.round(readyEmail / dailyCap) : 0;
  const safetyTotal = sum(data.safetyCounts);
  const sweepStale = isSweepStale(data.pulse.lastSweepAt);

  // ── The "Right now" strip: every owner question, one sentence each. ────────
  type Tone = "good" | "warn" | "bad";
  const now: Array<{ tone: Tone; text: string }> = [
    !data.flags.monitorEnabled
      ? { tone: "bad", text: "Agent is switched OFF (monitorEnabled) — nothing runs." }
      : sweepStale
        ? {
            tone: "warn",
            text: `Agent enabled but quiet — last activity ${relTime(data.pulse.lastSweepAt)}.`,
          }
        : {
            tone: "good",
            text: `Agent running — last activity ${relTime(data.pulse.lastSweepAt)}.`,
          },
    paused
      ? {
          tone: "bad",
          text: `Sending STOPPED — ${data.outreachControl.reason ?? "manually paused"}. Press Resume when investigated.`,
        }
      : !data.flags.outreachSendEnabled
        ? { tone: "bad", text: "Sending is switched OFF (outreachSendEnabled) — approved emails will NOT go out." }
        : !data.readiness.outreachSender
          ? { tone: "bad", text: "Email sender not configured — nothing can send." }
          : {
              tone: "good",
              text: `Sending on — ${data.healthToday.sent} of ${dailyCap} in the last 24h · ${nextSlotText()}.`,
            },
    {
      tone:
        bounceRate7d >= 0.04 || data.health7d.complained > 0
          ? "bad"
          : bounceRate7d >= 0.025
            ? "warn"
            : "good",
      text: `Deliverability — bounce rate ${(bounceRate7d * 100).toFixed(1)}% (auto-stop at 5%) · spam complaints ${data.health7d.complained} this week (auto-stop at 3).`,
    },
    data.flags.discoveryEnabled
      ? {
          tone: data.pulse.discovered7d > 0 ? "good" : "warn",
          text:
            data.pulse.discovered7d > 0
              ? `Discovery ON — ${data.pulse.discovered7d.toLocaleString("en-US")} new companies found this week.`
              : "Discovery ON — no new companies found yet this week (first scan runs in the 10am–6pm ET window).",
        }
      : { tone: "warn", text: "Discovery OFF — no new companies are being added to the pipeline." },
    {
      tone: runwayDays > 21 ? "good" : runwayDays > 7 ? "warn" : "bad",
      text: `${readyEmail.toLocaleString("en-US")} companies ready to email ≈ ${runwayDays} days of sending at ${dailyCap}/day.`,
    },
  ];

  // tick is read so the lint/compiler keeps the 1s re-render effect meaningful.
  void tick;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agent operations</h1>
          <p className="text-[13px] text-white/50">
            FMCSA new-authority monitoring &amp; acquisition pipeline · updated{" "}
            <Rel iso={data.generatedAt} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill on={data.flags.monitorEnabled} label="Monitor" />
          <StatusPill on={data.flags.discoveryEnabled} label="Discovery" />
          <StatusPill on={data.flags.outreachDraftEnabled} label="Drafting" />
          {paused ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-300 ring-1 ring-red-400/25">
              ⛔ Sending paused
            </span>
          ) : (
            <StatusPill on={data.flags.outreachSendEnabled} label="Sending" />
          )}
          {data.flags.autoSendEnabled && personaCount === 0 ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-300 ring-1 ring-red-400/25"
              title="autoSendEnabled is on but autoSendPersonas is empty — nothing will ever auto-send"
            >
              Auto-send on — no personas!
            </span>
          ) : (
            <StatusPill
              on={data.flags.autoSendEnabled}
              label="Auto-send"
              detail={data.flags.autoSendEnabled ? `(${personaCount})` : undefined}
              warn
            />
          )}
          <StatusPill on={data.readiness.outreachSender} label="Sender" />
          {failedSendsN > 0 && (
            <button
              type="button"
              onClick={() => openDrill({ type: "drafts" })}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-300 ring-1 ring-red-400/25 hover:bg-red-500/25"
              title="Sends that errored or were stranded mid-send — the email MAY have gone out; check Resend before re-approving"
            >
              ⚠ {failedSendsN} failed send{failedSendsN === 1 ? "" : "s"}
            </button>
          )}
          {!paused &&
            (confirmStop ? (
              <span className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={stopping}
                  onClick={stopSending}
                  className="rounded-lg bg-red-500/25 px-3 py-1.5 text-[12px] font-semibold text-red-100 ring-1 ring-red-300/40 hover:bg-red-500/35 disabled:opacity-50"
                >
                  {stopping ? "Stopping…" : "Confirm stop"}
                </button>
                <button
                  type="button"
                  disabled={stopping}
                  onClick={() => setConfirmStop(false)}
                  className="rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[12px] text-white/70 ring-1 ring-white/10 hover:bg-white/[0.08]"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmStop(true)}
                title="Trips the safety breaker — every send halts instantly until you press Resume"
                className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[12px] font-semibold text-red-300 ring-1 ring-red-400/25 hover:bg-red-500/20"
              >
                ■ Stop sending
              </button>
            ))}
          <label className="ml-1 flex cursor-pointer items-center gap-1.5 text-[12px] text-white/55">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-lg bg-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-white/80 ring-1 ring-white/10 hover:bg-white/[0.08]"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Data-outage strip — a dead DB must not render as a healthy page of zeros. */}
      {!data.dataOk && (
        <div className="rounded-xl bg-amber-500/15 px-4 py-3 text-[13px] text-amber-200 ring-1 ring-amber-400/30">
          ⚠ Live data unavailable — the database didn&apos;t respond, so the numbers
          below may be stale or zero. This is a data problem, not the agent
          stopping. Refresh in a minute.
        </div>
      )}

      {/* Right now — the whole system in plain English, one line per question. */}
      <div className="rounded-xl bg-white/[0.025] px-4 py-3.5 ring-1 ring-white/10">
        <div className="space-y-2">
          {now.map((l, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[13.5px] leading-snug">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  l.tone === "good"
                    ? "bg-emerald-400"
                    : l.tone === "warn"
                      ? "bg-amber-400"
                      : "bg-red-400"
                }`}
              />
              <span className={l.tone === "bad" ? "text-red-200" : "text-white/85"}>
                {l.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-pause breaker banner — the most important state on the page. */}
      {data.outreachControl.paused && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-500/15 px-4 py-3 ring-1 ring-red-400/30">
          <div className="text-[13px] text-red-200">
            <span className="font-semibold">⛔ SENDING STOPPED</span>
            {data.outreachControl.reason && <> — {data.outreachControl.reason}</>}
            <span className="text-red-300/70">
              {" "}
              (<Rel iso={data.outreachControl.updated_at} />)
            </span>
          </div>
          <button
            type="button"
            disabled={resuming}
            onClick={resumeSending}
            className="rounded-lg bg-red-400/20 px-3 py-1.5 text-[12px] font-semibold text-red-100 ring-1 ring-red-300/40 hover:bg-red-400/30 disabled:opacity-50"
          >
            {resuming ? "Resuming…" : "Resume sending"}
          </button>
        </div>
      )}

      {/* KPI tiles — click to drill into the underlying list. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Kpi label="Monitored" value={totalMonitored} title="Every company the agent tracks, in any stage" />
        <Kpi
          label="Ready to email"
          value={readyEmail}
          accent
          title="Passes every gate: in the 180-day window, insured now, clean safety, has a usable email. The same number the runway line uses."
          onClick={() => openDrill({ type: "list", kind: "hot", title: `Ready to email — passes every gate (${data.ready.ready.toLocaleString("en-US")} qualified)` })}
        />
        <Kpi
          label="Drafts queued"
          value={draftsPending}
          title="Intentionally holds about 2 days of sends (2× the daily cap) so timing lines stay fresh — a full queue is by design, not a stall"
          onClick={() => openDrill({ type: "drafts" })}
        />
        <Kpi
          label={`Sent (24h) / ${dailyCap}`}
          value={data.healthToday.sent}
          accent
          title="Rolling 24 hours — the same window the sender's cap uses, so at 9am this still counts yesterday afternoon"
          onClick={() => openDrill({ type: "sent" })}
        />
        <Kpi label="Sent total" value={sentCount} onClick={() => openDrill({ type: "sent" })} />
        <Kpi
          label="Phone queue"
          value={phoneQueue}
          title="Qualified but no usable email — call list"
          onClick={() => openDrill({ type: "list", kind: "phone", title: "Phone queue — qualified, no usable email" })}
        />
        <Kpi
          label="Disqualified"
          value={disqualified}
          muted
          onClick={() => openDrill({ type: "list", kind: "disqualified", title: "Disqualified — with reasons" })}
        />
      </div>

      {/* Per-account numbers — how each sending identity/domain is performing. */}
      {senderRows.length > 0 && (
        <Card
          title={`Sender accounts · template: ${data.flags.outreachTemplate === "branded" ? "branded" : "plain"}`}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-[13px]">
              <thead className="text-left text-[10px] uppercase tracking-[0.16em] text-white/45">
                <tr>
                  <th className="py-1.5 pr-3">Account</th>
                  <th className="py-1.5 pr-3">Today / cap</th>
                  <th className="py-1.5 pr-3" aria-hidden="true" />
                  <th className="py-1.5 pr-3">7 days</th>
                  <th className="py-1.5 pr-3">Total</th>
                  <th className="py-1.5 pr-3">Queued</th>
                  <th className="py-1.5 pr-3">Bounced 7d</th>
                  <th className="py-1.5 pr-3">Complaints 7d</th>
                  <th className="py-1.5">Last sent</th>
                </tr>
              </thead>
              <tbody>
                {senderRows.map((r) => (
                  <tr key={r.address} className="border-t border-white/8">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-white/90">{r.name}</div>
                      <div className="text-[11px] text-white/40">{r.address}</div>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3">
                      <span className="font-semibold text-[#ffb371]">{r.sent24h}</span>
                      <span className="text-white/40"> / {r.cap ?? "—"}</span>
                    </td>
                    <td className="py-2 pr-3">
                      {r.cap != null && r.cap > 0 && (
                        <div
                          className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10"
                          title={`${r.sent24h} of ${r.cap} in the rolling 24h window`}
                        >
                          <div
                            className="h-full rounded-full bg-[#ff8a1a]"
                            style={{
                              width: `${Math.min(100, Math.round((r.sent24h / r.cap) * 100))}%`,
                            }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-white/70">{r.sent7d}</td>
                    <td className="py-2 pr-3 text-white/70">
                      {r.sentTotal.toLocaleString("en-US")}
                    </td>
                    <td className="py-2 pr-3 text-white/70">{r.queued}</td>
                    <td
                      className={`py-2 pr-3 ${r.bounced7d > 0 ? "font-semibold text-red-300" : "text-white/35"}`}
                    >
                      {r.bounced7d}
                    </td>
                    <td
                      className={`py-2 pr-3 ${r.complained7d > 0 ? "font-semibold text-red-300" : "text-white/35"}`}
                    >
                      {r.complained7d}
                    </td>
                    <td className="whitespace-nowrap py-2 text-white/55">
                      <Rel iso={r.lastSentAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-white/40">
            Caps use the same rolling 24-hour window as the sender; warm-up bumps are
            edited in Edge Config (outreachSenders) — no deploy needed.
            {senderCfg.length === 0 &&
              " Sender split not configured yet — everything sends as the default account."}
          </p>
        </Card>
      )}

      {/* Sent emails — the live send log (what actually went out, to whom). */}
      <Card
        title={`Sent emails (${sentCount} total · last 7d: ${data.health7d.sent} sent, ${data.health7d.bounced} bounced = ${(bounceRate7d * 100).toFixed(1)}%, ${data.health7d.complained} complaints)`}
      >
        {data.sentEmails.length === 0 ? (
          <Empty>
            Nothing sent yet — emails fire every 15 minutes, 10am–6pm ET, once
            Sending is on.
          </Empty>
        ) : (
          <div className="max-h-96 overflow-x-auto overflow-y-auto">
            <table className="min-w-full text-[13px]">
              <thead className="sticky top-0 bg-[#101012] text-left text-[10px] uppercase tracking-[0.16em] text-white/45">
                <tr>
                  <th className="py-1.5 pr-3">Sent</th>
                  <th className="py-1.5 pr-3">From</th>
                  <th className="py-1.5 pr-3">Company</th>
                  <th className="py-1.5 pr-3">To</th>
                  <th className="py-1.5 pr-3">Subject</th>
                  <th className="py-1.5">Persona</th>
                </tr>
              </thead>
              <tbody>
                {data.sentEmails.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => openDrill({ type: "email", id: s.id })}
                    className="cursor-pointer border-t border-white/8 hover:bg-white/[0.04]"
                    title="Click for the full email + company audit"
                  >
                    <td className="whitespace-nowrap py-1.5 pr-3 text-white/55">
                      <Rel iso={s.sent_at} />
                    </td>
                    <td
                      className="whitespace-nowrap py-1.5 pr-3 text-white/70"
                      title={senderLabel(s.sender).full}
                    >
                      {senderLabel(s.sender).name}
                    </td>
                    <td className="py-1.5 pr-3 text-white/90">
                      {s.dba_name ?? s.legal_name ?? "—"}
                      <span className="text-white/35"> · {s.dot_number ?? "—"}</span>
                    </td>
                    <td className="py-1.5 pr-3 text-white/70">{s.recipient_email ?? "—"}</td>
                    <td className="max-w-[26rem] truncate py-1.5 pr-3 text-white/70">
                      {s.draft_subject ?? "—"}
                    </td>
                    <td className="py-1.5 text-white/55">{s.persona ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.sentEmails.length >= 50 && (
              <p className="mt-2 text-[11px] text-white/40">
                Showing the latest 50 — click &quot;Sent total&quot; for more.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Pipeline + distributions. Each card names its own denominator — the
          four cards count DIFFERENT populations and used to look contradictory. */}
      <div className="grid gap-4 lg:grid-cols-4">
        <Card title={`Pipeline (all ${totalMonitored.toLocaleString("en-US")})`} className="lg:col-span-1">
          <BarList
            counts={stage}
            order={[
              "discovered",
              "verified",
              "drafted",
              "sent",
              "outreach_phone",
              "suppressed",
              "disqualified",
              "(unprocessed)",
            ]}
            max={totalMonitored}
            labels={STAGE_LABEL}
          />
        </Card>
        <Card title={`180-day clock (all ${totalMonitored.toLocaleString("en-US")})`} className="lg:col-span-1">
          <BarList
            counts={data.eligibilityCounts}
            order={[
              "eligible_now",
              "approaching",
              "too_new",
              "(unassessed)",
              "awaiting_authority",
              "aged_out",
              "continuity_broken",
              "authority_inactive",
              "not_in_fmcsa",
              "(pending)",
            ]}
            colorByKey
            labels={ELIGIBILITY_LABEL}
          />
        </Card>
        <Card title={`Insurance history (all ${totalMonitored.toLocaleString("en-US")})`} className="lg:col-span-1">
          <BarList
            counts={data.insuranceCounts}
            order={["green", "amber", "red", "unknown", "(pending)"]}
            colorByKey
            labels={INSURANCE_LABEL}
          />
        </Card>
        <Card title={`Safety (${safetyTotal.toLocaleString("en-US")} in-window only)`} className="lg:col-span-1">
          <BarList
            counts={data.safetyCounts}
            order={["pass", "review", "fail", "(pending)"]}
            colorByKey
            labels={SAFETY_LABEL}
          />
          {(data.safetyCounts.review ?? 0) > 0 && (
            <button
              type="button"
              onClick={() =>
                openDrill({
                  type: "list",
                  kind: "review",
                  title: "Needs review — conditional rating or elevated crashes, human look",
                })
              }
              className="mt-3 text-[12px] font-medium text-amber-300 hover:text-amber-200"
            >
              Open needs-review list →
            </button>
          )}
        </Card>
      </div>

      {/* Hot prospects + activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Top prospects (best ${data.hot.length} of ${data.ready.ready.toLocaleString("en-US")} qualified)`}>
          {data.hot.length === 0 ? (
            <Empty>No carriers in the pre-warm / eligible window yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[13px]">
                <thead className="text-left text-[10px] uppercase tracking-[0.16em] text-white/45">
                  <tr>
                    <th className="py-1.5 pr-3">Company</th>
                    <th className="py-1.5 pr-3">→180</th>
                    <th className="py-1.5 pr-3">Ins.</th>
                    <th className="py-1.5 pr-3">Score</th>
                    <th className="py-1.5">Ch.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hot.map((h) => (
                    <tr
                      key={h.id}
                      onClick={() => openDrill({ type: "company", id: h.id })}
                      className="cursor-pointer border-t border-white/8 hover:bg-white/[0.04]"
                      title="Click for the full company audit"
                    >
                      <td className="py-1.5 pr-3 text-white/90">
                        {h.legal_name ?? h.dba_name ?? `#${h.id}`}
                        <span className="text-white/35"> · {h.dot_number ?? "—"}</span>
                      </td>
                      <td className="py-1.5 pr-3 text-white/70">
                        {h.days_to_180 == null
                          ? "—"
                          : h.days_to_180 <= 0
                            ? "eligible"
                            : `${h.days_to_180}d`}
                      </td>
                      <td className="py-1.5 pr-3">
                        <Dot color={colorFor(h.insurance_rating ?? "")} />
                      </td>
                      <td className="py-1.5 pr-3 font-semibold text-white/90">
                        {h.acquisition_score ?? "—"}
                      </td>
                      <td className="py-1.5 text-white/55">{h.outreach_channel ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Recent activity">
          {data.actions.length === 0 ? (
            <Empty>No agent activity recorded yet.</Empty>
          ) : (
            <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {data.actions.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-[13px]">
                  <span className="text-white/80">{actionLabel(a.action)}</span>
                  <span className="truncate text-white/45">
                    {sweepDetail(a) ?? a.legal_name ?? (a.valuation_id ? `#${a.valuation_id}` : "")}
                  </span>
                  <span className="ml-auto whitespace-nowrap text-[11px] text-white/35">
                    <span title={a.actor.startsWith("admin:") ? `human (${a.actor.slice(6)})` : "the agent"}>
                      {a.actor.startsWith("admin:") ? "👤" : "🤖"}
                    </span>{" "}
                    <Rel iso={a.created_at} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Agent work log + results + system health */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Results — outcomes you've recorded">
          {sum(data.outcomes) === 0 ? (
            <Empty>
              Nothing recorded yet. Open any company (click a sent email or a
              prospect row) and use the Replied / Interested / Not interested /
              Do-not-contact buttons — recorded companies are automatically
              excluded from follow-ups.
            </Empty>
          ) : (
            <>
              <BarList
                counts={data.outcomes}
                order={["interested", "replied", "not_interested", "do_not_contact"]}
                labels={OUTCOME_LABEL}
                colorByKey
              />
              <p className="mt-3 text-[11px] text-white/40">
                {sum(data.outcomes).toLocaleString("en-US")} outcomes recorded
                across {sentCount.toLocaleString("en-US")} companies emailed (
                {sentCount > 0
                  ? ((sum(data.outcomes) / sentCount) * 100).toFixed(1)
                  : "0"}
                % response recorded so far).
              </p>
            </>
          )}
        </Card>

        <Card title="Agent work — what it actually did">
          <ul className="space-y-2 text-[13px] text-white/80">
            <li>
              <span className="text-white/45">Last 24h:</span>{" "}
              re-checked {data.pulse.verified24h.toLocaleString("en-US")} companies ·{" "}
              {data.pulse.enriched24h.toLocaleString("en-US")} safety checks ·{" "}
              {data.pulse.drafted24h.toLocaleString("en-US")} emails drafted
            </li>
            <li>
              <span className="text-white/45">This week:</span>{" "}
              {data.pulse.discovered7d.toLocaleString("en-US")} new companies discovered
              {data.pulse.newRows7d > 0 &&
                ` (${data.pulse.newRows7d.toLocaleString("en-US")} added to the pipeline)`}
            </li>
            {data.cursors.map((c) => (
              <li key={c.id}>
                <span className="text-white/45">
                  {c.id === "discover" ? "New-company scan:" : `${c.id}:`}
                </span>{" "}
                last ran <Rel iso={c.last_run_at} /> · caught up through{" "}
                {c.last_processed_day ?? "—"}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-white/40">
            Emails go out every 15 minutes, 10am–5:45pm ET, up to {dailyCap}/day.
            Auto-send personas: {data.flags.autoSendPersonas || "none"}.
          </p>
        </Card>

        <Card title="System health">
          <div className="space-y-1.5">
            <ReadyRow ok={data.readiness.database} label="Database connected" />
            <ReadyRow
              ok={data.readiness.fmcsaSocrataToken}
              label="FMCSA data feed (discovery + verification)"
            />
            <ReadyRow ok={data.readiness.fmcsaApiKey} label="FMCSA safety-check access" />
            <ReadyRow ok={data.readiness.cronSecret} label="Scheduled runs secured" />
            <ReadyRow
              ok={data.readiness.outreachSender}
              label="Outreach email sender"
              hint="separate domain — required to send"
            />
            <ReadyRow
              ok={data.readiness.webhookSecret}
              label="Bounce/complaint protection"
              hint="auto-pause breaker armed"
            />
            <ReadyRow
              ok={data.readiness.anthropicOutreach}
              label="AI drafting key"
              hint="optional — emails use your approved template"
            />
            <div className="my-2 border-t border-white/10" />
            <ReadyRow on label="Agent (monitorEnabled)" value={data.flags.monitorEnabled} />
            <ReadyRow on label="Discovery of new companies (discoveryEnabled)" value={data.flags.discoveryEnabled} />
            <ReadyRow on label="Email drafting (outreachDraftEnabled)" value={data.flags.outreachDraftEnabled} />
            <ReadyRow on label="Sending (outreachSendEnabled)" value={data.flags.outreachSendEnabled} />
            <ReadyRow on label="Auto-send without approval (autoSendEnabled)" value={data.flags.autoSendEnabled} />
            <ReadyRow on label="Follow-up touch (followUpEnabled)" value={data.flags.followUpEnabled} />
            <ReadyRow on label="Winding-down track (windingDownEnabled)" value={data.flags.windingDownEnabled} />
          </div>
          <p className="mt-3 text-[11px] text-white/40">
            The switches above and the daily cap ({dailyCap}) are changed in
            Vercel → Storage → Edge Config — not from this page. The Stop
            sending button up top works instantly from here.
          </p>
        </Card>
      </div>

      {/* Drill-down modal — keyed per view so each navigation remounts fresh. */}
      {drill && (
        <DrillModal
          key={`${drillStack.length}:${JSON.stringify(drill)}`}
          view={drill}
          adminKey={data.adminKey}
          onClose={closeDrill}
          onBack={drillStack.length > 1 ? backDrill : null}
          onOpen={openDrill}
        />
      )}
    </div>
  );
}

// ── small presentational helpers ──────────────────────────────────────────

function StatusPill({
  on,
  label,
  warn,
  detail,
}: {
  on: boolean;
  label: string;
  warn?: boolean;
  detail?: string;
}) {
  const tone = on
    ? warn
      ? "bg-amber-500/15 text-amber-300 ring-amber-400/25"
      : "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25"
    : "bg-white/[0.05] text-white/45 ring-white/10";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-current" : "bg-white/30"}`} />
      {label} {on ? "on" : "off"}
      {detail ? ` ${detail}` : ""}
    </span>
  );
}

function Kpi({
  label,
  value,
  accent,
  muted,
  title,
  onClick,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
  title?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold ${accent ? "text-[#ffb371]" : muted ? "text-white/55" : "text-white"}`}
      >
        {value.toLocaleString("en-US")}
      </div>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title ? `${title} — click to open the list` : "Click to open the list"}
        className="rounded-xl bg-white/[0.025] px-4 py-3 text-left ring-1 ring-white/10 transition hover:bg-white/[0.06] hover:ring-white/20"
      >
        {inner}
      </button>
    );
  }
  return (
    <div title={title} className="rounded-xl bg-white/[0.025] px-4 py-3 ring-1 ring-white/10">{inner}</div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/10 ${className}`}>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
        {title}
      </h3>
      {children}
    </div>
  );
}

function BarList({
  counts,
  order,
  max,
  colorByKey,
  labels,
}: {
  counts: Record<string, number>;
  order: string[];
  max?: number;
  colorByKey?: boolean;
  labels?: Record<string, string>;
}) {
  const keys = [
    ...order.filter((k) => counts[k] != null),
    ...Object.keys(counts).filter((k) => !order.includes(k)),
  ];
  const peak = max ?? Math.max(1, ...keys.map((k) => counts[k] ?? 0));
  if (keys.length === 0) return <Empty>No data yet.</Empty>;
  return (
    <div className="space-y-2">
      {keys.map((k) => {
        const n = counts[k] ?? 0;
        const pct = peak > 0 ? Math.round((n / peak) * 100) : 0;
        const color = colorByKey ? colorFor(k) : "#ff8a1a";
        const label = labels ? labelFor(labels, k) : prettyKey(k);
        return (
          <div key={k} className="flex items-center gap-2 text-[12px]">
            <span title={label} className="w-36 shrink-0 truncate text-white/60">
              {label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-medium text-white/80">{n}</span>
          </div>
        );
      })}
    </div>
  );
}

function ReadyRow({
  ok,
  on,
  value,
  label,
  hint,
}: {
  ok?: boolean;
  on?: boolean;
  value?: boolean;
  label: string;
  hint?: string;
}) {
  const good = on ? value : ok;
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className={good ? "text-emerald-400" : "text-white/30"}>{good ? "✓" : "○"}</span>
      <span className={good ? "text-white/80" : "text-white/50"}>{label}</span>
      {hint && <span className="text-[11px] text-white/35">— {hint}</span>}
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-[13px] text-white/40">{children}</p>;
}

function prettyKey(k: string): string {
  return k.replace(/_/g, " ").replace(/\(|\)/g, "");
}

// ── drill-down modal ────────────────────────────────────────────────────────

type DetailPayload = {
  rows?: unknown[];
  company?: MonitorCompanyDetail;
  email?: OutreachEmailDetail | null;
  error?: string;
};

function DrillModal({
  view,
  adminKey,
  onClose,
  onBack,
  onOpen,
}: {
  view: DrillView;
  adminKey: string | null;
  onClose: () => void;
  onBack: (() => void) | null;
  onOpen: (v: DrillView) => void;
}) {
  const [payload, setPayload] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);

  // The parent remounts this component per view (key prop), so initial state
  // already reflects "loading" — the effect only fetches (no sync setState).
  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams();
    if (view.type === "list") {
      qs.set("view", "list");
      qs.set("kind", view.kind);
    } else if (view.type === "drafts") {
      qs.set("view", "drafts");
    } else if (view.type === "sent") {
      qs.set("view", "sent");
      qs.set("limit", "300");
    } else {
      qs.set("view", view.type);
      qs.set("id", String(view.id));
    }
    if (adminKey) qs.set("key", adminKey);
    fetch(`/api/admin/agent/detail?${qs.toString()}`)
      .then((r) => r.json())
      .then((j: DetailPayload) => {
        if (!cancelled) setPayload(j);
      })
      .catch(() => {
        if (!cancelled) setPayload({ error: "Failed to load." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, adminKey]);

  const title =
    view.type === "list"
      ? view.title
      : view.type === "drafts"
        ? "Drafts pending approval / send"
        : view.type === "sent"
          ? "Sent emails"
          : view.type === "email"
            ? "Email + company audit"
            : "Company audit";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-[#121214] p-5 ring-1 ring-white/15 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[12px] text-white/70 ring-1 ring-white/10 hover:bg-white/[0.1]"
              >
                ← Back
              </button>
            )}
            <h2 className="text-[15px] font-semibold text-white/90">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[12px] text-white/70 ring-1 ring-white/10 hover:bg-white/[0.1]"
          >
            ✕ Close
          </button>
        </div>

        {loading ? (
          <Empty>Loading…</Empty>
        ) : payload?.error ? (
          <Empty>{payload.error}</Empty>
        ) : view.type === "company" || view.type === "email" ? (
          <CompanyAndEmail
            company={payload?.company ?? null}
            email={payload?.email ?? null}
          />
        ) : view.type === "drafts" ? (
          <DraftRows
            rows={(payload?.rows ?? []) as unknown as OutreachDraftRow[]}
            onOpen={onOpen}
          />
        ) : view.type === "sent" ? (
          <SentRows
            rows={(payload?.rows ?? []) as unknown as OutreachSentRow[]}
            onOpen={onOpen}
          />
        ) : (
          <CompanyRows
            rows={(payload?.rows ?? []) as unknown as MonitorExportRow[]}
            kind={view.kind}
            onOpen={onOpen}
          />
        )}
      </div>
    </div>
  );
}

// Full audit picture + the exact email (used for both company and email views).
function CompanyAndEmail({
  company,
  email,
}: {
  company: MonitorCompanyDetail | null;
  email: OutreachEmailDetail | null;
}) {
  if (!company) return <Empty>Company not found.</Empty>;
  const addr = company.phy_address as
    | { street?: string; city?: string; state?: string; zip?: string }
    | null;
  const findings = Array.isArray(company.safety_findings)
    ? (company.safety_findings as string[])
    : [];
  const gaps = Array.isArray(company.insurance_gaps)
    ? (company.insurance_gaps as unknown[])
    : [];
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="text-lg font-semibold text-white">
          {company.dba_name ?? company.legal_name ?? "(unnamed)"}
          {company.dba_name && company.legal_name && (
            <span className="ml-2 text-[13px] font-normal text-white/45">
              ({company.legal_name})
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[13px] text-white/55">
          DOT {company.dot_number ?? "—"}
          {company.mc_number ? ` · MC ${company.mc_number}` : ""}
          {addr
            ? ` · ${[addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(", ")}`
            : ""}
        </div>
        <div className="mt-0.5 text-[13px] text-white/55">
          {company.census_email ?? "no email"} · {company.telephone ?? "no phone"}
        </div>
        <OutcomeButtons id={company.id} initial={company.status ?? null} />
      </div>

      {/* Audit results grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <AuditStat label="Stage" value={labelFor(STAGE_LABEL, company.monitor_stage)} />
        <AuditStat
          label="Authority"
          value={prettyKey(company.authority_status ?? "—")}
          tone={company.authority_status === "active" ? "good" : "bad"}
        />
        <AuditStat
          label="Eligibility"
          value={labelFor(ELIGIBILITY_LABEL, company.eligibility_state)}
          tone={
            company.eligibility_state === "eligible_now"
              ? "good"
              : company.eligibility_state === "approaching"
                ? "warn"
                : undefined
          }
        />
        <AuditStat
          label="Days to 180"
          value={
            company.days_to_180 == null
              ? "—"
              : company.days_to_180 <= 0
                ? `eligible (${-company.days_to_180}d past)`
                : `${company.days_to_180}d`
          }
        />
        <AuditStat
          label="Insured now"
          value={company.insurance_current == null ? "—" : company.insurance_current ? "YES" : "NO"}
          tone={company.insurance_current ? "good" : "bad"}
        />
        <AuditStat
          label="Insurance history"
          value={labelFor(INSURANCE_LABEL, company.insurance_rating)}
          tone={
            company.insurance_rating === "green"
              ? "good"
              : company.insurance_rating === "red"
                ? "bad"
                : company.insurance_rating === "amber"
                  ? "warn"
                  : undefined
          }
        />
        <AuditStat
          label="Insurance gaps"
          value={gaps.length === 0 ? "none on record" : `${gaps.length} gap(s)`}
          tone={gaps.length === 0 ? "good" : "warn"}
        />
        <AuditStat
          label="Safety"
          value={company.safety_status ?? "pending"}
          tone={
            company.safety_status === "pass"
              ? "good"
              : company.safety_status === "fail"
                ? "bad"
                : company.safety_status === "review"
                  ? "warn"
                  : undefined
          }
        />
        <AuditStat
          label="Driver OOS"
          value={company.driver_oos_rate == null ? "no inspections" : `${company.driver_oos_rate}% (avg 5.5%)`}
        />
        <AuditStat
          label="Vehicle OOS"
          value={company.vehicle_oos_rate == null ? "no inspections" : `${company.vehicle_oos_rate}% (avg 20.7%)`}
        />
        <AuditStat
          label="Crashes (24mo)"
          value={company.crash_total == null ? "0 on record" : String(company.crash_total)}
        />
        <AuditStat label="FMCSA rating" value={company.safety_rating ?? "none (unrated)"} />
        <AuditStat label="Trucks" value={company.power_units == null ? "—" : String(company.power_units)} />
        <AuditStat
          label="Authority age"
          value={company.age_days == null ? "—" : `${company.age_days}d (since ${company.add_date ?? "?"})`}
        />
        <AuditStat label="Score" value={String(company.acquisition_score ?? "—")} />
        <AuditStat label="UCC" value={`${company.ucc_status ?? "pending"} / ${company.ucc_rating ?? "unknown"}`} />
      </div>

      {(findings.length > 0 || company.disqualify_reason) && (
        <div className="rounded-lg bg-white/[0.03] p-3 text-[13px] text-white/70 ring-1 ring-white/10">
          {company.disqualify_reason && (
            <div className="mb-1 font-semibold text-red-300">
              Disqualified: {labelFor(DISQUALIFY_LABEL, company.disqualify_reason)}
            </div>
          )}
          {findings.map((f, i) => (
            <div key={i}>• {f}</div>
          ))}
        </div>
      )}

      {/* The email itself */}
      {email ? (
        <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[12px] text-white/50">
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${
                email.stage === "sent"
                  ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25"
                  : "bg-white/[0.06] text-white/60 ring-white/15"
              }`}
            >
              {email.stage.toUpperCase()}
            </span>
            <span>to {email.recipient_email ?? "—"}</span>
            <span>· persona {email.persona ?? "—"}</span>
            <span>· {email.sent_at ? `sent ${relTime(email.sent_at)}` : `created ${relTime(email.created_at)}`}</span>
          </div>
          <div className="mb-2 text-[14px] font-semibold text-white/90">
            {email.draft_subject ?? "(no subject)"}
          </div>
          <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-white/80">
            {email.draft_body_text ?? "(empty body)"}
          </pre>
          <p className="mt-3 text-[11px] text-white/35">
            + the standard footer is appended on send: why they received it, the
            postal address, and the one-click unsubscribe link.
          </p>
          {email.last_error && (
            <p className="mt-2 text-[12px] text-red-300">Last error: {email.last_error}</p>
          )}
        </div>
      ) : (
        <Empty>No email drafted for this company yet.</Empty>
      )}
    </div>
  );
}

// Record what happened after the email — feeds the Results card and pulls the
// company out of the follow-up pool. "Do not contact" also suppresses the
// address forever.
const OUTCOME_CHOICES: Array<{ key: string; tone: string }> = [
  { key: "replied", tone: "bg-blue-500/15 text-blue-300 ring-blue-400/25 hover:bg-blue-500/25" },
  { key: "interested", tone: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25 hover:bg-emerald-500/25" },
  { key: "not_interested", tone: "bg-white/[0.06] text-white/70 ring-white/15 hover:bg-white/[0.1]" },
  { key: "do_not_contact", tone: "bg-red-500/10 text-red-300 ring-red-400/25 hover:bg-red-500/20" },
];

function OutcomeButtons({ id, initial }: { id: number; initial: string | null }) {
  const [status, setStatus] = useState<string | null>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hasOutcome = status != null && status in OUTCOME_LABEL;

  async function set(outcome: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/monitor/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, outcome }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? "Failed.");
        return;
      }
      setStatus(outcome === "clear" ? "offer_sent" : outcome);
    } catch {
      setErr("Failed — check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.14em] text-white/40">
        Outcome:
      </span>
      {OUTCOME_CHOICES.map((c) => (
        <button
          key={c.key}
          type="button"
          disabled={busy}
          onClick={() => void set(c.key)}
          title={
            c.key === "do_not_contact"
              ? "Also suppresses the address forever — no email of any kind again"
              : "Excludes this company from follow-ups"
          }
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 disabled:opacity-50 ${c.tone} ${
            status === c.key ? "ring-2 ring-white/60" : ""
          }`}
        >
          {OUTCOME_LABEL[c.key]}
        </button>
      ))}
      {hasOutcome && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void set("clear")}
          className="rounded-full px-2.5 py-1 text-[11px] text-white/50 ring-1 ring-white/10 hover:bg-white/[0.06] disabled:opacity-50"
        >
          Clear
        </button>
      )}
      {err && <span className="text-[11px] text-red-300">{err}</span>}
    </div>
  );
}

function AuditStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
        ? "text-red-300"
        : tone === "warn"
          ? "text-amber-300"
          : "text-white/85";
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2 ring-1 ring-white/10">
      <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">{label}</div>
      <div className={`mt-0.5 text-[13px] font-medium ${color}`}>{value}</div>
    </div>
  );
}

function CompanyRows({
  rows,
  kind,
  onOpen,
}: {
  rows: MonitorExportRow[];
  kind: "hot" | "phone" | "disqualified" | "review";
  onOpen: (v: DrillView) => void;
}) {
  if (rows.length === 0) return <Empty>Nothing here right now.</Empty>;
  return (
    <div className="max-h-[70vh] overflow-y-auto">
      <table className="min-w-full text-[13px]">
        <thead className="sticky top-0 bg-[#121214] text-left text-[10px] uppercase tracking-[0.16em] text-white/45">
          <tr>
            <th className="py-1.5 pr-3">Company</th>
            <th className="py-1.5 pr-3">ST</th>
            <th className="py-1.5 pr-3">Trucks</th>
            <th className="py-1.5 pr-3">→180</th>
            <th className="py-1.5 pr-3">Ins.</th>
            <th className="py-1.5 pr-3">Safety</th>
            <th className="py-1.5 pr-3">Score</th>
            <th className="py-1.5">{kind === "disqualified" ? "Reason" : "Contact"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const st =
              (r.phy_address as { state?: string } | null)?.state ?? "—";
            return (
              <tr
                key={r.id}
                onClick={() => onOpen({ type: "company", id: r.id })}
                className="cursor-pointer border-t border-white/8 hover:bg-white/[0.04]"
                title="Click for the full company audit"
              >
                <td className="py-1.5 pr-3 text-white/90">
                  {r.dba_name ?? r.legal_name ?? "—"}
                  <span className="text-white/35"> · {r.dot_number ?? "—"}</span>
                </td>
                <td className="py-1.5 pr-3 text-white/60">{st}</td>
                <td className="py-1.5 pr-3 text-white/60">{r.power_units ?? "—"}</td>
                <td className="py-1.5 pr-3 text-white/70">
                  {r.days_to_180 == null
                    ? "—"
                    : r.days_to_180 <= 0
                      ? "eligible"
                      : `${r.days_to_180}d`}
                </td>
                <td className="py-1.5 pr-3">
                  <Dot color={colorFor(r.insurance_rating ?? "")} />
                </td>
                <td className="py-1.5 pr-3">
                  <Dot color={colorFor(r.safety_status ?? "")} />
                </td>
                <td className="py-1.5 pr-3 font-semibold text-white/90">
                  {r.acquisition_score ?? "—"}
                </td>
                <td className="max-w-[14rem] truncate py-1.5 text-white/55">
                  {kind === "disqualified"
                    ? labelFor(DISQUALIFY_LABEL, r.disqualify_reason)
                    : (r.census_email ?? r.telephone ?? "—")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length >= 200 && (
        <p className="mt-2 text-[11px] text-white/40">
          Showing the first 200 rows of the full list, hottest first.
        </p>
      )}
    </div>
  );
}

const DRAFT_STAGE_LABEL: Record<string, string> = {
  draft: "Awaiting approval",
  approved: "Approved — queued",
  failed: "FAILED — check",
};

function DraftRows({
  rows: initialRows,
  onOpen,
}: {
  rows: OutreachDraftRow[];
  onOpen: (v: DrillView) => void;
}) {
  // Local copy so Approve/Discard update the list without a full reload.
  const [rows, setRows] = useState<OutreachDraftRow[]>(initialRows);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function act(row: OutreachDraftRow, action: "approve" | "discard") {
    setBusyId(row.id);
    setNote(null);
    try {
      const res = await fetch("/api/admin/outreach/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setNote(data.error ?? "Action failed.");
        return;
      }
      if (action === "discard") {
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        setNote("Draft discarded — the company goes back to the pool and can be re-drafted later.");
      } else {
        setRows((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, stage: "approved" } : r)),
        );
        setNote("Approved — it goes out in an upcoming 15-minute slot inside the 10am–6pm ET window.");
      }
    } catch {
      setNote("Action failed — check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) return <Empty>No drafts pending.</Empty>;
  return (
    <div className="max-h-[70vh] overflow-y-auto">
      {note && (
        <p className="mb-2 rounded-lg bg-white/[0.04] px-3 py-2 text-[12px] text-white/75 ring-1 ring-white/10">
          {note}
        </p>
      )}
      <table className="min-w-full text-[13px]">
        <thead className="sticky top-0 bg-[#121214] text-left text-[10px] uppercase tracking-[0.16em] text-white/45">
          <tr>
            <th className="py-1.5 pr-3">Status</th>
            <th className="py-1.5 pr-3">Company</th>
            <th className="py-1.5 pr-3">To</th>
            <th className="py-1.5 pr-3">Subject</th>
            <th className="py-1.5">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => onOpen({ type: "email", id: r.id })}
              className="cursor-pointer border-t border-white/8 hover:bg-white/[0.04]"
              title="Click for the full email + company audit"
            >
              <td
                className={`whitespace-nowrap py-1.5 pr-3 ${
                  r.stage === "failed" ? "font-semibold text-red-300" : "text-white/60"
                }`}
              >
                {DRAFT_STAGE_LABEL[r.stage] ?? r.stage}
              </td>
              <td className="py-1.5 pr-3 text-white/90">
                {r.dba_name ?? r.legal_name ?? `#${r.valuation_id}`}
              </td>
              <td className="py-1.5 pr-3 text-white/70">{r.recipient_email ?? "—"}</td>
              <td className="max-w-[16rem] truncate py-1.5 pr-3 text-white/70">
                {r.draft_subject ?? "—"}
              </td>
              <td className="whitespace-nowrap py-1.5">
                <span className="flex items-center gap-1.5">
                  {r.stage !== "approved" && (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void act(r, "approve");
                      }}
                      className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/25 hover:bg-emerald-500/25 disabled:opacity-50"
                    >
                      {r.stage === "failed" ? "Re-approve" : "Approve"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      void act(r, "discard");
                    }}
                    className="rounded-md bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300 ring-1 ring-red-400/20 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Discard
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-white/40">
        {rows.length >= 200 ? "Showing the first 200. " : ""}
        To edit an email&apos;s text before approving, use the Outreach drafts
        section on the main admin page. Failed rows: the email MAY have gone out
        — check the Resend dashboard before re-approving.
      </p>
    </div>
  );
}

function SentRows({
  rows,
  onOpen,
}: {
  rows: OutreachSentRow[];
  onOpen: (v: DrillView) => void;
}) {
  if (rows.length === 0) return <Empty>Nothing sent yet.</Empty>;
  return (
    <div className="max-h-[70vh] overflow-y-auto">
      <table className="min-w-full text-[13px]">
        <thead className="sticky top-0 bg-[#121214] text-left text-[10px] uppercase tracking-[0.16em] text-white/45">
          <tr>
            <th className="py-1.5 pr-3">Sent</th>
            <th className="py-1.5 pr-3">Company</th>
            <th className="py-1.5 pr-3">To</th>
            <th className="py-1.5">Subject</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr
              key={s.id}
              onClick={() => onOpen({ type: "email", id: s.id })}
              className="cursor-pointer border-t border-white/8 hover:bg-white/[0.04]"
              title="Click for the full email + company audit"
            >
              <td className="whitespace-nowrap py-1.5 pr-3 text-white/55">
                <Rel iso={s.sent_at} />
              </td>
              <td className="py-1.5 pr-3 text-white/90">
                {s.dba_name ?? s.legal_name ?? "—"}
                <span className="text-white/35"> · {s.dot_number ?? "—"}</span>
              </td>
              <td className="py-1.5 pr-3 text-white/70">{s.recipient_email ?? "—"}</td>
              <td className="max-w-[22rem] truncate py-1.5 text-white/70">{s.draft_subject ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length >= 300 && (
        <p className="mt-2 text-[11px] text-white/40">Showing the latest 300 sends.</p>
      )}
    </div>
  );
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    sweep_completed: "Sweep completed",
    ucc_captured: "UCC findings saved",
    outreach_sent: "Offer email sent",
    outreach_approved: "Draft approved",
    outreach_auto_approved: "Auto-approved",
    outreach_discarded: "Draft discarded",
    outreach_bounced: "Email bounced",
    outreach_complained: "⚠ Spam complaint",
    outreach_resumed: "Sending resumed",
    outreach_paused: "⛔ Sending stopped",
    followup_drafted: "Follow-up drafted",
    winding_down_drafted: "Winding-down email drafted",
    outcome_set: "Outcome recorded",
  };
  return map[action] ?? action;
}

// The per-pass work a sweep heartbeat carries — previously logged and never
// shown, which made the feed twenty identical "Sweep completed" lines.
function sweepDetail(a: AgentActionRow): string | null {
  if (a.action !== "sweep_completed") return null;
  const d = a.detail as {
    discovered?: number;
    verified?: number;
    enriched?: number;
    drafted?: number;
    followups?: number;
    winding?: number;
  } | null;
  if (!d) return null;
  const parts = [
    d.discovered ? `${d.discovered} found` : null,
    d.verified ? `${d.verified} checked` : null,
    d.enriched ? `${d.enriched} safety` : null,
    d.drafted ? `${d.drafted} drafted` : null,
    d.followups ? `${d.followups} follow-ups` : null,
    d.winding ? `${d.winding} winding-down` : null,
  ].filter(Boolean);
  return parts.length > 0 ? `— ${parts.join(" · ")}` : null;
}
