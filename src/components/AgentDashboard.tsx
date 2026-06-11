"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AgentActionRow,
  HotProspect,
  MonitorCompanyDetail,
  MonitorCursor,
  MonitorExportRow,
  OutreachDraftRow,
  OutreachEmailDetail,
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

      {/* KPI tiles — click to drill into the underlying list. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Kpi label="Monitored" value={totalMonitored} />
        <Kpi
          label="Hot prospects"
          value={hotCount}
          accent
          onClick={() => openDrill({ type: "list", kind: "hot", title: "Hot prospects — qualified, in the 180-day window" })}
        />
        <Kpi
          label="Drafts pending"
          value={draftsPending}
          onClick={() => openDrill({ type: "drafts" })}
        />
        <Kpi
          label={`Sent today / ${dailyCap}`}
          value={data.healthToday.sent}
          accent
          onClick={() => openDrill({ type: "sent" })}
        />
        <Kpi label="Sent total" value={sentCount} onClick={() => openDrill({ type: "sent" })} />
        <Kpi
          label="Phone queue"
          value={phoneQueue}
          onClick={() => openDrill({ type: "list", kind: "phone", title: "Phone queue — qualified, no usable email" })}
        />
        <Kpi
          label="Disqualified"
          value={disqualified}
          muted
          onClick={() => openDrill({ type: "list", kind: "disqualified", title: "Disqualified — with reasons" })}
        />
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
                  <tr
                    key={s.id}
                    onClick={() => openDrill({ type: "email", id: s.id })}
                    className="cursor-pointer border-t border-white/8 hover:bg-white/[0.04]"
                    title="Click for the full email + company audit"
                  >
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
  onClick,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
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
        title="Click to open the list"
        className="rounded-xl bg-white/[0.025] px-4 py-3 text-left ring-1 ring-white/10 transition hover:bg-white/[0.06] hover:ring-white/20"
      >
        {inner}
      </button>
    );
  }
  return (
    <div className="rounded-xl bg-white/[0.025] px-4 py-3 ring-1 ring-white/10">{inner}</div>
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
      </div>

      {/* Audit results grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <AuditStat label="Stage" value={prettyKey(company.monitor_stage ?? "—")} />
        <AuditStat
          label="Authority"
          value={prettyKey(company.authority_status ?? "—")}
          tone={company.authority_status === "active" ? "good" : "bad"}
        />
        <AuditStat
          label="Eligibility"
          value={prettyKey(company.eligibility_state ?? "—")}
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
          value={company.insurance_rating ?? "—"}
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
              Disqualified: {prettyKey(company.disqualify_reason)}
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
                    ? prettyKey(r.disqualify_reason ?? "—")
                    : (r.census_email ?? r.telephone ?? "—")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DraftRows({
  rows,
  onOpen,
}: {
  rows: OutreachDraftRow[];
  onOpen: (v: DrillView) => void;
}) {
  if (rows.length === 0) return <Empty>No drafts pending.</Empty>;
  return (
    <div className="max-h-[70vh] overflow-y-auto">
      <table className="min-w-full text-[13px]">
        <thead className="sticky top-0 bg-[#121214] text-left text-[10px] uppercase tracking-[0.16em] text-white/45">
          <tr>
            <th className="py-1.5 pr-3">Stage</th>
            <th className="py-1.5 pr-3">Company</th>
            <th className="py-1.5 pr-3">To</th>
            <th className="py-1.5">Subject</th>
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
              <td className="py-1.5 pr-3 text-white/60">{r.stage}</td>
              <td className="py-1.5 pr-3 text-white/90">
                {r.dba_name ?? r.legal_name ?? `#${r.valuation_id}`}
              </td>
              <td className="py-1.5 pr-3 text-white/70">{r.recipient_email ?? "—"}</td>
              <td className="max-w-[22rem] truncate py-1.5 text-white/70">
                {r.draft_subject ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
              <td className="whitespace-nowrap py-1.5 pr-3 text-white/55">{relTime(s.sent_at)}</td>
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
  };
  return map[action] ?? action;
}
