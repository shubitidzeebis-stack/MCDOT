"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AgentActionRow,
  HotProspect,
  MonitorCursor,
  OutreachSentRow,
} from "@/lib/db/monitor";

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
  flags: {
    monitorEnabled: boolean;
    discoveryEnabled: boolean;
    outreachDraftEnabled: boolean;
    outreachSendEnabled: boolean;
    autoSendEnabled: boolean;
    smsOutreachEnabled: boolean;
    monitorDays: string;
    autoSendPersonas: string;
    outreachDailyCap: string;
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
  generatedAt: string;
};

function sum(rec: Record<string, number>): number {
  return Object.values(rec).reduce((a, b) => a + b, 0);
}

function relTime(iso: string | null): string {
  if (!iso) return "never";
  // Postgres ::text timestamps look like "2026-06-07 12:34:56.123+00"; ISO uses
  // "T" + "Z". Normalize a bare "+00" offset to "+00:00", and assume UTC when no
  // zone is present, so Date.parse succeeds either way.
  let norm = iso.trim().replace(" ", "T");
  if (/[+-]\d{2}$/.test(norm)) norm += ":00";
  else if (!/(z|[+-]\d{2}:?\d{2})$/i.test(norm)) norm += "Z";
  const t = new Date(norm).getTime();
  if (Number.isNaN(t)) return iso;
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
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
};

function colorFor(key: string): string {
  return RATING_COLOR[key] ?? "#8b8b90";
}

export function AgentDashboard({ data }: { data: AgentDashboardData }) {
  const router = useRouter();
  const [auto, setAuto] = useState(true);
  const [tick, setTick] = useState(0);
  const [resuming, setResuming] = useState(false);

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

  const stage = data.stageCounts;
  const totalMonitored = sum(stage);
  const draftsPending =
    (data.outreachCounts.draft ?? 0) + (data.outreachCounts.approved ?? 0);
  const sentCount = data.outreachCounts.sent ?? 0;
  const dlq = data.outreachCounts.dead ?? 0;
  const phoneQueue = stage.outreach_phone ?? 0;
  const disqualified = stage.disqualified ?? 0;
  const hotCount = (data.eligibilityCounts.approaching ?? 0) +
    (data.eligibilityCounts.eligible_now ?? 0);
  const dailyCap = Number(data.flags.outreachDailyCap) || 20;

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
            {relTime(data.generatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill on={data.flags.monitorEnabled} label="Monitor" />
          <StatusPill on={data.flags.discoveryEnabled} label="Discovery" />
          <StatusPill on={data.flags.outreachDraftEnabled} label="Drafting" />
          <StatusPill on={data.flags.outreachSendEnabled} label="Sending" />
          <StatusPill on={data.flags.autoSendEnabled} label="Auto-send" warn />
          <StatusPill on={data.readiness.outreachSender} label="Sender" />
          {dlq > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-300 ring-1 ring-red-400/25">
              ⚠ {dlq} dead-letter
            </span>
          )}
          <label className="ml-1 flex cursor-pointer items-center gap-1.5 text-[12px] text-white/55">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
            />
            Auto
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

      {/* Auto-pause breaker banner — the most important state on the page. */}
      {data.outreachControl.paused && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-500/15 px-4 py-3 ring-1 ring-red-400/30">
          <div className="text-[13px] text-red-200">
            <span className="font-semibold">⛔ SENDING AUTO-PAUSED</span>
            {data.outreachControl.reason && <> — {data.outreachControl.reason}</>}
            <span className="text-red-300/70">
              {" "}
              ({relTime(data.outreachControl.updated_at)})
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

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Kpi label="Monitored" value={totalMonitored} />
        <Kpi label="Hot prospects" value={hotCount} accent />
        <Kpi label="Drafts pending" value={draftsPending} />
        <Kpi label={`Sent today / ${dailyCap}`} value={data.healthToday.sent} accent />
        <Kpi label="Sent total" value={sentCount} />
        <Kpi label="Phone queue" value={phoneQueue} />
        <Kpi label="Disqualified" value={disqualified} muted />
      </div>

      {/* Sent emails — the live send log (what actually went out, to whom). */}
      <Card
        title={`Sent emails (${sentCount} total · last 7d: ${data.health7d.sent} sent, ${data.health7d.bounced} bounced, ${data.health7d.complained} complaints)`}
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
                  <th className="py-1.5 pr-3">Company</th>
                  <th className="py-1.5 pr-3">To</th>
                  <th className="py-1.5 pr-3">Subject</th>
                  <th className="py-1.5">Persona</th>
                </tr>
              </thead>
              <tbody>
                {data.sentEmails.map((s) => (
                  <tr key={s.id} className="border-t border-white/8">
                    <td className="whitespace-nowrap py-1.5 pr-3 text-white/55">
                      {relTime(s.sent_at)}
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
          </div>
        )}
      </Card>

      {/* Pipeline + distributions */}
      <div className="grid gap-4 lg:grid-cols-4">
        <Card title="Pipeline" className="lg:col-span-1">
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
          />
        </Card>
        <Card title="Eligibility (180-day clock)" className="lg:col-span-1">
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
          />
        </Card>
        <Card title="Insurance quality" className="lg:col-span-1">
          <BarList
            counts={data.insuranceCounts}
            order={["green", "amber", "red", "unknown", "(pending)"]}
            colorByKey
          />
        </Card>
        <Card title="Safety (in-window)" className="lg:col-span-1">
          <BarList
            counts={data.safetyCounts}
            order={["pass", "review", "fail", "(pending)"]}
            colorByKey
          />
        </Card>
      </div>

      {/* Hot prospects + activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Hot prospects (${data.hot.length})`}>
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
                    <tr key={h.id} className="border-t border-white/8">
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
                  <span className="text-white/45">
                    {a.legal_name ?? (a.valuation_id ? `#${a.valuation_id}` : "")}
                  </span>
                  <span className="ml-auto whitespace-nowrap text-[11px] text-white/35">
                    {a.actor.startsWith("admin:") ? "👤" : "🤖"} {relTime(a.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Last sweep + readiness */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Sweep runs">
          {data.cursors.length === 0 ? (
            <Empty>The sweep hasn&apos;t run yet (or monitorEnabled is off).</Empty>
          ) : (
            <ul className="space-y-2 text-[13px]">
              {data.cursors.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <span className="font-medium text-white/85">{c.id}</span>
                  <span className="text-white/55">
                    last run {relTime(c.last_run_at)} · cursor{" "}
                    {c.last_processed_day ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-white/40">
            Cadence: every 15 min, 10am–6pm ET · daily cap {dailyCap} (Edge
            Config <code>outreachDailyCap</code>). Days: [
            {data.flags.monitorDays || "all"}] (UTC, 0=Sun). Auto-send personas:{" "}
            {data.flags.autoSendPersonas || "none"}.
          </p>
        </Card>

        <Card title="Readiness — what's needed to go live">
          <div className="space-y-1.5">
            <ReadyRow ok={data.readiness.database} label="Database (DATABASE_URL)" />
            <ReadyRow
              ok={data.readiness.fmcsaSocrataToken}
              label="FMCSA Socrata token (FMCSA_SOCRATA_TOKEN)"
              hint="discovery rate limit"
            />
            <ReadyRow ok={data.readiness.fmcsaApiKey} label="FMCSA API key (on-demand audit)" />
            <ReadyRow ok={data.readiness.cronSecret} label="Cron secret (scheduled runs)" />
            <ReadyRow
              ok={data.readiness.outreachSender}
              label="Outreach sender (OUTREACH_EMAIL_FROM + RESEND_OUTREACH_API_KEY)"
              hint="separate domain — required to SEND"
            />
            <ReadyRow
              ok={data.readiness.webhookSecret}
              label="Bounce/complaint webhook (RESEND_WEBHOOK_SECRET)"
              hint="auto-pause protection"
            />
            <ReadyRow
              ok={data.readiness.anthropicOutreach}
              label="Outreach LLM key (ANTHROPIC_API_KEY_OUTREACH)"
              hint="optional — falls back to template"
            />
            <ReadyRow on label="Master switch: monitorEnabled" value={data.flags.monitorEnabled} />
            <ReadyRow on label="Drafting: outreachDraftEnabled" value={data.flags.outreachDraftEnabled} />
            <ReadyRow on label="Sending: outreachSendEnabled" value={data.flags.outreachSendEnabled} />
            <ReadyRow on label="Auto-send: autoSendEnabled" value={data.flags.autoSendEnabled} />
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── small presentational helpers ──────────────────────────────────────────

function StatusPill({ on, label, warn }: { on: boolean; label: string; warn?: boolean }) {
  const tone = on
    ? warn
      ? "bg-amber-500/15 text-amber-300 ring-amber-400/25"
      : "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25"
    : "bg-white/[0.05] text-white/45 ring-white/10";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-current" : "bg-white/30"}`} />
      {label} {on ? "on" : "off"}
    </span>
  );
}

function Kpi({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.025] px-4 py-3 ring-1 ring-white/10">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold ${accent ? "text-[#ffb371]" : muted ? "text-white/55" : "text-white"}`}
      >
        {value.toLocaleString("en-US")}
      </div>
    </div>
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
}: {
  counts: Record<string, number>;
  order: string[];
  max?: number;
  colorByKey?: boolean;
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
        return (
          <div key={k} className="flex items-center gap-2 text-[12px]">
            <span className="w-36 shrink-0 truncate text-white/60">{prettyKey(k)}</span>
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
  };
  return map[action] ?? action;
}
