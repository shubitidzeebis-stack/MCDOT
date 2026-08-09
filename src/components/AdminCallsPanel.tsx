"use client";

// Call log for the Quo business line.
//
// Layout follows the pattern every mature call product converges on (Aircall,
// Dialpad, Quo's own app): the missed-and-unrecovered board is a SEPARATE
// module above the log, not a filter of it. Throughput and abandon rate are
// different questions, and the one that costs money should never be a click
// away behind a dropdown.
//
// Deliberately dependency-free: native <audio>, hand-rolled disclosure rows,
// same table markup as AdminValuationsPanel. A component library would look
// objectively fine and visibly foreign next to the rest of the admin.

import { Fragment, useMemo, useState } from "react";
import type { CallRow } from "@/lib/db/calls";

type Props = {
  initial: CallRow[];
  /** Unhandled missed calls from the DEDICATED query, not sliced from the
   *  log: an old missed call must stay on the board even after newer calls
   *  push it out of the last-200 window. */
  initialMissed: CallRow[];
};

/* ---------------------------------------------------------------- helpers */

function fmtPhone(last10: string | null): string {
  if (!last10 || last10.length !== 10) return last10 ?? "—";
  return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
}

function fmtDuration(sec: number | null): string {
  if (sec == null || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isIncoming(c: CallRow): boolean {
  return c.direction !== "outgoing";
}

/**
 * A call that rang in, ENDED, and nobody picked up — the only outcome that
 * costs money. direction must be the literal 'incoming' (a media-event stub
 * row has direction NULL and must not read as missed), and status
 * 'completed' excludes anything still in progress.
 */
function isMissed(c: CallRow): boolean {
  return c.direction === "incoming" && c.status === "completed" && !c.answered_at;
}

function outcomeOf(c: CallRow): { label: string; tone: string } {
  if (!isIncoming(c)) {
    return c.answered_at
      ? { label: "Connected", tone: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/20" }
      : { label: "No answer", tone: "bg-white/[0.06] text-white/55 ring-white/10" };
  }
  if (c.answered_at) {
    return { label: "Answered", tone: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20" };
  }
  if (c.voicemail_url) {
    return { label: "Voicemail", tone: "bg-amber-500/15 text-amber-300 ring-amber-400/20" };
  }
  return { label: "Missed", tone: "bg-red-500/15 text-red-300 ring-red-400/20" };
}

/** Who called, in the most useful form we have. */
function callerOf(c: CallRow): string {
  return c.legal_name || c.dba_name || c.contact_name || fmtPhone(c.external_number);
}

const SOURCE_LABEL: Record<string, string> = {
  lead: "Your lead",
  monitor: "Prospect list",
};
const SOURCE_CLASS: Record<string, string> = {
  lead: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25",
  monitor: "bg-[#ff8a1a]/15 text-[#ffb371] ring-[#ff8a1a]/25",
};

/** Transcript payloads vary in shape; render what we can, never crash. */
function renderTranscript(t: unknown): React.ReactNode {
  if (!t) return null;
  const lines = Array.isArray(t) ? t : null;
  if (!lines) {
    return (
      <pre className="whitespace-pre-wrap break-words text-[12px] text-white/65">
        {typeof t === "string" ? t : JSON.stringify(t, null, 2)}
      </pre>
    );
  }
  return (
    <div className="space-y-2">
      {lines.map((raw, i) => {
        const seg = (raw ?? {}) as Record<string, unknown>;
        const who = typeof seg.identifier === "string" ? seg.identifier : null;
        const text =
          typeof seg.content === "string"
            ? seg.content
            : typeof seg.text === "string"
              ? seg.text
              : JSON.stringify(seg);
        return (
          <p key={i} className="text-[12px] leading-relaxed text-white/70">
            {who && (
              <span className="mr-2 font-mono text-[11px] text-white/40">{who}</span>
            )}
            {text}
          </p>
        );
      })}
    </div>
  );
}

function renderSummary(s: unknown): React.ReactNode {
  if (!s) return null;
  const items = Array.isArray(s)
    ? s
    : typeof s === "object" && s !== null && Array.isArray((s as { summary?: unknown }).summary)
      ? ((s as { summary: unknown[] }).summary)
      : null;
  if (!items) {
    return (
      <p className="text-[12px] leading-relaxed text-white/70">
        {typeof s === "string" ? s : JSON.stringify(s)}
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-white/70">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#ff8a1a]" />
          <span>{typeof item === "string" ? item : JSON.stringify(item)}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- components */

function Stat({
  label,
  value,
  tone = "text-white",
  hint,
  className = "",
}: {
  label: string;
  value: string | number;
  tone?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/10 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-semibold tracking-tight ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-white/35">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ panel */

export function AdminCallsPanel({ initial, initialMissed }: Props) {
  const [rows, setRows] = useState<CallRow[]>(initial);
  const [missedRows, setMissedRows] = useState<CallRow[]>(initialMissed);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dir, setDir] = useState<"all" | "incoming" | "outgoing">("all");
  const [outcome, setOutcome] = useState<"all" | "missed" | "answered">("all");
  const [linked, setLinked] = useState<"all" | "linked" | "unlinked">("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todays = rows.filter((r) => new Date(r.created_at).toDateString() === today);
    const answered = todays.filter((r) => r.answered_at).length;
    // From the dedicated query — the log window may not contain all of them.
    const unrecovered = missedRows.filter((r) => !r.handled_at).length;
    const answeredCalls = rows.filter((r) => isIncoming(r) && r.answered_at);
    const linkedPct = rows.length
      ? Math.round((rows.filter((r) => r.valuation_id).length / rows.length) * 100)
      : 0;
    return {
      today: todays.length,
      answered,
      unrecovered,
      answerRate: answeredCalls.length + unrecovered > 0
        ? `${Math.round((answeredCalls.length / (answeredCalls.length + unrecovered)) * 100)}%`
        : "—",
      linkedPct: `${linkedPct}%`,
    };
  }, [rows, missedRows]);

  const missed = useMemo(
    () => missedRows.filter((r) => !r.handled_at).slice(0, 10),
    [missedRows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (dir === "incoming" && !isIncoming(r)) return false;
      if (dir === "outgoing" && isIncoming(r)) return false;
      if (outcome === "missed" && !isMissed(r)) return false;
      if (outcome === "answered" && !r.answered_at) return false;
      if (linked === "linked" && !r.valuation_id) return false;
      if (linked === "unlinked" && r.valuation_id) return false;
      if (!needle) return true;
      return (
        callerOf(r).toLowerCase().includes(needle) ||
        (r.external_number ?? "").includes(needle) ||
        (r.mc_number ?? "").includes(needle) ||
        (r.dot_number ?? "").includes(needle)
      );
    });
  }, [rows, dir, outcome, linked, q]);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/calls");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "refresh failed");
      setRows(data.calls as CallRow[]);
      setMissedRows(data.missed as CallRow[]);
      setFlash({ kind: "ok", msg: "Refreshed." });
    } catch (err) {
      console.error(err);
      setFlash({ kind: "err", msg: "Could not refresh." });
    } finally {
      setRefreshing(false);
    }
  }

  async function setHandled(id: string, handled: boolean) {
    // Optimistic per-row patch. Rollback is by id inside a functional
    // updater — restoring a whole-array snapshot would clobber a concurrent
    // update to a DIFFERENT row that succeeded in the meantime.
    const stamp = handled ? new Date().toISOString() : null;
    const patch = (rs: CallRow[]) =>
      rs.map((r) => (r.id === id ? { ...r, handled_at: stamp } : r));
    const rollback = (prevStamp: string | null) => (rs: CallRow[]) =>
      rs.map((r) => (r.id === id ? { ...r, handled_at: prevStamp } : r));
    const prevStamp =
      rows.find((r) => r.id === id)?.handled_at ??
      missedRows.find((r) => r.id === id)?.handled_at ??
      null;

    setBusy(id);
    setRows(patch);
    setMissedRows(patch);
    try {
      const res = await fetch("/api/admin/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, handled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "update failed");
    } catch (err) {
      console.error(err);
      setRows(rollback(prevStamp));
      setMissedRows(rollback(prevStamp));
      setFlash({ kind: "err", msg: "Could not save — your change was rolled back." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {/* ---------------------------------------------------- status strip */}
      {/* Missed-and-unrecovered leads the row (it's the money metric) and
          spans both columns on mobile — 2-2-2, no orphan tile. */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat
          label="Missed & unrecovered"
          value={stats.unrecovered}
          tone={stats.unrecovered > 0 ? "text-red-300" : "text-white"}
          hint={stats.unrecovered > 0 ? "needs a callback" : "all clear"}
          className="col-span-2 md:col-span-1"
        />
        <Stat label="Calls today" value={stats.today} />
        <Stat label="Answered today" value={stats.answered} />
        <Stat label="Answer rate" value={stats.answerRate} hint="inbound, all time" />
        <Stat label="Matched to a lead" value={stats.linkedPct} hint="auto-linked by phone" />
      </section>

      {/* --------------------------------------- missed & unrecovered board */}
      {missed.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-red-300">
            ⚠ Missed &amp; unrecovered
          </h2>
          <div className="divide-y divide-white/8 overflow-hidden rounded-xl bg-red-500/[0.06] ring-1 ring-red-400/20">
            {missed.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-white/85">
                    {callerOf(c)}
                    {c.valuation_id && (
                      <a
                        href={`/admin#valuation-${c.valuation_id}`}
                        className="ml-2 text-[11px] text-[#ffb371] hover:underline"
                      >
                        lead #{c.valuation_id} →
                      </a>
                    )}
                  </p>
                  <p className="text-[11px] text-white/45">
                    <span className="font-mono">{fmtPhone(c.external_number)}</span>
                    {" · "}
                    {fmtWhen(c.created_at)}
                    {c.voicemail_url && " · left a voicemail"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:+1${c.external_number ?? ""}`}
                    className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/85 ring-1 ring-white/10 hover:bg-white/[0.1]"
                  >
                    Call back
                  </a>
                  <button
                    onClick={() => setHandled(c.id, true)}
                    disabled={busy === c.id}
                    className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[12px] font-semibold text-emerald-200 ring-1 ring-emerald-400/25 hover:bg-emerald-500/30 disabled:opacity-50"
                  >
                    {busy === c.id ? "Saving…" : "Mark handled"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- call log */}
      <section className="mt-12">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
            Call log
          </h2>
          <div className="flex items-center gap-3">
            {flash && (
              <span
                className={`text-[12px] ${flash.kind === "ok" ? "text-emerald-300" : "text-red-400"}`}
              >
                {flash.msg}
              </span>
            )}
            <button
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/75 ring-1 ring-white/10 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "↻ Refresh"}
            </button>
          </div>
        </div>

        {/* filter bar */}
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.025] p-3 ring-1 ring-white/10">
          <label className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Direction
            </span>
            <select
              value={dir}
              onChange={(e) => setDir(e.target.value as typeof dir)}
              className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-[12px] text-white ring-1 ring-white/10 focus:outline-none focus:ring-[#ff8a1a]/40"
            >
              <option value="all" className="bg-[#0a0a0b] text-white">All</option>
              <option value="incoming" className="bg-[#0a0a0b] text-white">Inbound</option>
              <option value="outgoing" className="bg-[#0a0a0b] text-white">Outbound</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Outcome
            </span>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as typeof outcome)}
              className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-[12px] text-white ring-1 ring-white/10 focus:outline-none focus:ring-[#ff8a1a]/40"
            >
              <option value="all" className="bg-[#0a0a0b] text-white">All</option>
              <option value="missed" className="bg-[#0a0a0b] text-white">Missed</option>
              <option value="answered" className="bg-[#0a0a0b] text-white">Answered</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Lead
            </span>
            <select
              value={linked}
              onChange={(e) => setLinked(e.target.value as typeof linked)}
              className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-[12px] text-white ring-1 ring-white/10 focus:outline-none focus:ring-[#ff8a1a]/40"
            >
              <option value="all" className="bg-[#0a0a0b] text-white">All</option>
              <option value="linked" className="bg-[#0a0a0b] text-white">Matched</option>
              <option value="unlinked" className="bg-[#0a0a0b] text-white">Unmatched</option>
            </select>
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, number, MC/DOT…"
            className="min-w-[220px] flex-1 rounded-lg bg-white/[0.04] px-3 py-1.5 text-[12px] text-white ring-1 ring-white/10 placeholder:text-white/35 focus:outline-none focus:ring-[#ff8a1a]/40"
          />
        </div>

        <div className="overflow-x-auto rounded-xl bg-white/[0.025] ring-1 ring-white/10">
          <table className="min-w-full divide-y divide-white/8 text-[13px]">
            <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-[0.18em] text-white/55">
              <tr>
                <th className="px-3 py-3">Time</th>
                <th className="px-3 py-3">Dir</th>
                <th className="px-3 py-3">Caller</th>
                <th className="px-3 py-3">Duration</th>
                <th className="px-3 py-3">Outcome</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-white/45">
                    {rows.length === 0
                      ? "No calls yet. They appear here the moment Quo sends the first webhook."
                      : "No calls match the filters."}
                  </td>
                </tr>
              )}
              {filtered.map((c) => {
                const oc = outcomeOf(c);
                const open = expanded === c.id;
                const hasDetail = Boolean(
                  c.recording_url || c.voicemail_url || c.transcript || c.summary,
                );
                return (
                  <Fragment key={c.id}>
                    <tr
                      onClick={() => setExpanded(open ? null : c.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpanded(open ? null : c.id);
                        }
                      }}
                      tabIndex={0}
                      className="cursor-pointer hover:bg-white/[0.02]"
                    >
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-white/65">
                        {fmtWhen(c.created_at)}
                      </td>
                      <td
                        title={isIncoming(c) ? "Inbound" : "Outbound"}
                        className="whitespace-nowrap px-3 py-3 text-white/65"
                      >
                        {isIncoming(c) ? "←" : "→"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          title={callerOf(c)}
                          className="inline-block max-w-[260px] truncate align-bottom font-medium text-white/85"
                        >
                          {callerOf(c)}
                        </span>
                        {c.match_source && SOURCE_LABEL[c.match_source] && (
                          <span
                            className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ${SOURCE_CLASS[c.match_source]}`}
                          >
                            {SOURCE_LABEL[c.match_source]}
                          </span>
                        )}
                        <span className="block font-mono text-[11px] text-white/45">
                          {fmtPhone(c.external_number)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-white/65">
                        {fmtDuration(c.duration_sec)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ${oc.tone}`}
                        >
                          {oc.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-[11px] text-white/40">
                        {hasDetail ? (open ? "▾" : "▸") : ""}
                      </td>
                    </tr>

                    {open && (
                      <tr className="bg-white/[0.015]">
                        <td colSpan={6} className="px-6 py-5">
                          <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-4">
                              {(c.recording_url || c.voicemail_url) && (
                                <div>
                                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
                                    {c.recording_url ? "Recording" : "Voicemail"}
                                  </p>
                                  {/* Streams through our own authenticated proxy —
                                      never a raw Quo URL in the DOM. */}
                                  {/* [color-scheme:dark]: audio controls are an
                                      OS-painted widget, same as <option> popups —
                                      without this they render as a white pill. */}
                                  <audio
                                    controls
                                    preload="none"
                                    className="w-full [color-scheme:dark]"
                                    src={`/api/admin/calls/recording?id=${encodeURIComponent(c.id)}&kind=${c.recording_url ? "recording" : "voicemail"}`}
                                  />
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {c.valuation_id ? (
                                  <a
                                    href={`/admin#valuation-${c.valuation_id}`}
                                    className="rounded-lg bg-[#ff8a1a]/15 px-3 py-1.5 text-[12px] font-semibold text-[#ffb371] ring-1 ring-[#ff8a1a]/25 hover:bg-[#ff8a1a]/25"
                                  >
                                    Open lead #{c.valuation_id} →
                                  </a>
                                ) : (
                                  <a
                                    href={`/admin/audit?kind=phone&number=${c.external_number ?? ""}`}
                                    className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/85 ring-1 ring-white/10 hover:bg-white/[0.1]"
                                  >
                                    Look up this number →
                                  </a>
                                )}
                                {isMissed(c) && (
                                  <button
                                    onClick={() => setHandled(c.id, !c.handled_at)}
                                    disabled={busy === c.id}
                                    className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/85 ring-1 ring-white/10 hover:bg-white/[0.1] disabled:opacity-50"
                                  >
                                    {c.handled_at ? "Reopen" : "Mark handled"}
                                  </button>
                                )}
                              </div>
                              {c.lead_status && (
                                <p className="text-[11px] text-white/45">
                                  Pipeline status:{" "}
                                  <span className="text-white/70">{c.lead_status}</span>
                                  {c.mc_number && ` · MC ${c.mc_number}`}
                                  {c.dot_number && ` · DOT ${c.dot_number}`}
                                </p>
                              )}
                            </div>

                            <div className="space-y-4">
                              {c.summary != null && (
                                <div>
                                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
                                    AI summary
                                  </p>
                                  {renderSummary(c.summary)}
                                </div>
                              )}
                              {c.transcript != null && (
                                <div>
                                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
                                    Transcript
                                  </p>
                                  <div className="max-h-64 overflow-y-auto pr-2">
                                    {renderTranscript(c.transcript)}
                                  </div>
                                </div>
                              )}
                              {c.summary == null && c.transcript == null && (
                                <p className="text-[12px] text-white/40">
                                  {Date.now() - new Date(c.created_at).getTime() <
                                  10 * 60 * 1000
                                    ? "No transcript yet — Quo delivers it a minute or two after the call ends."
                                    : "No transcript available for this call."}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
