"use client";

import { useMemo, useState } from "react";

// Interactive admin panel for the valuations table. Reads initial rows
// from the server, then supports filtering, status updates, and notes
// editing inline via the /api/admin/valuations/update endpoint.

export type AdminValuationRow = {
  id: number;
  created_at: string;
  status: string | null;
  legal_name: string | null;
  dba_name: string | null;
  mc_number: string | null;
  dot_number: string | null;
  authority_status: string | null;
  authority_age_days: number | null;
  has_amazon_relay: boolean | null;
  valuation_low: number | null;
  valuation_high: number | null;
  valuation_floored_reason: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  power_units: number | null;
  drivers_count: number | null;
  vehicle_oos_pct: string | null;
  driver_oos_pct: string | null;
  crashes_24mo: number | null;
  safety_rating: string | null;
  notes_internal: string | null;
};

const STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "diligence", label: "Diligence" },
  { value: "offer_sent", label: "Offer sent" },
  { value: "closed_won", label: "Closed — Won" },
  { value: "closed_lost", label: "Closed — Lost" },
] as const;

type StatusValue = (typeof STATUSES)[number]["value"];

const STATUS_TONE: Record<StatusValue, string> = {
  new: "bg-blue-500/15 text-blue-300 ring-blue-400/20",
  contacted: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/20",
  diligence: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  offer_sent: "bg-orange-500/15 text-orange-300 ring-orange-400/20",
  closed_won: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  closed_lost: "bg-white/[0.06] text-white/55 ring-white/10",
};

function fmtMoney(n: number | null): string {
  if (n === null) return "—";
  return `$${n.toLocaleString("en-US")}`;
}

function fmtRange(low: number | null, high: number | null): string {
  if (low === null || high === null) return "—";
  if (low === high) return fmtMoney(low);
  return `${fmtMoney(low)} – ${fmtMoney(high)}`;
}

export function AdminValuationsPanel({
  initial,
  adminKey,
}: {
  initial: AdminValuationRow[];
  adminKey: string;
}) {
  const [rows, setRows] = useState(initial);
  const [filterStatus, setFilterStatus] = useState<"all" | StatusValue>("all");
  const [filterRelay, setFilterRelay] = useState<"all" | "yes" | "no">("all");
  const [filterEmail, setFilterEmail] = useState<"all" | "yes" | "no">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterRelay === "yes" && r.has_amazon_relay !== true) return false;
      if (filterRelay === "no" && r.has_amazon_relay !== false) return false;
      if (filterEmail === "yes" && !r.contact_email) return false;
      if (filterEmail === "no" && r.contact_email) return false;
      if (q.length > 0) {
        const hay = [
          r.legal_name,
          r.dba_name,
          r.mc_number,
          r.dot_number,
          r.contact_name,
          r.contact_email,
          r.contact_phone,
          r.notes_internal,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterStatus, filterRelay, filterEmail, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const relay = rows.filter((r) => r.has_amazon_relay === true).length;
    const withEmail = rows.filter((r) => r.contact_email).length;
    const won = rows.filter((r) => r.status === "closed_won").length;
    const wonValue = rows
      .filter((r) => r.status === "closed_won" && r.valuation_high !== null)
      .reduce((sum, r) => sum + (r.valuation_high ?? 0), 0);
    const pipelineValue = rows
      .filter(
        (r) =>
          r.status &&
          ["contacted", "diligence", "offer_sent"].includes(r.status) &&
          r.valuation_high !== null,
      )
      .reduce((sum, r) => sum + (r.valuation_high ?? 0), 0);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last7 = rows.filter(
      (r) => new Date(r.created_at).getTime() >= sevenDaysAgo,
    ).length;
    return { total, relay, withEmail, won, wonValue, pipelineValue, last7 };
  }, [rows]);

  async function updateRow(
    id: number,
    patch: { status?: StatusValue; notesInternal?: string },
  ) {
    // Optimistic update — flip the local row immediately, roll back on error.
    const prev = rows;
    setRows((rs) =>
      rs.map((r) =>
        r.id === id
          ? {
              ...r,
              status: patch.status ?? r.status,
              notes_internal:
                patch.notesInternal !== undefined
                  ? patch.notesInternal
                  : r.notes_internal,
            }
          : r,
      ),
    );
    try {
      const res = await fetch("/api/admin/valuations/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey, id, ...patch }),
      });
      if (!res.ok) throw new Error("update failed");
    } catch (err) {
      console.error(err);
      setRows(prev); // rollback
      alert("Update failed — your change was not saved.");
    }
  }

  return (
    <section className="mt-12">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
          Wizard valuations
        </h2>
        <a
          href={`/api/admin/valuations/export?key=${encodeURIComponent(adminKey)}`}
          className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/75 ring-1 ring-white/10 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          ⬇ Export CSV
        </a>
      </div>

      {/* KPI cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total" value={String(stats.total)} sub={`${stats.last7} this week`} />
        <Kpi
          label="Active Relay"
          value={String(stats.relay)}
          sub={`${stats.total > 0 ? Math.round((stats.relay / stats.total) * 100) : 0}%`}
        />
        <Kpi
          label="With email"
          value={String(stats.withEmail)}
          sub={`${stats.total > 0 ? Math.round((stats.withEmail / stats.total) * 100) : 0}% capture`}
        />
        <Kpi
          label="Closed Won"
          value={String(stats.won)}
          sub={fmtMoney(stats.wonValue)}
          tone="emerald"
        />
      </div>

      {/* Filter bar */}
      <div className="mb-4 grid gap-3 rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/10 md:grid-cols-[1fr_auto_auto_auto]">
        <input
          type="search"
          placeholder="Search company, MC, DOT, name, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder:text-white/35 outline-none focus:border-[#ff8a1a]/50"
        />
        <Select
          label="Status"
          value={filterStatus}
          onChange={(v) => setFilterStatus(v as typeof filterStatus)}
          options={[
            { value: "all", label: "All statuses" },
            ...STATUSES.map((s) => ({ value: s.value, label: s.label })),
          ]}
        />
        <Select
          label="Relay"
          value={filterRelay}
          onChange={(v) => setFilterRelay(v as typeof filterRelay)}
          options={[
            { value: "all", label: "All" },
            { value: "yes", label: "Active Relay" },
            { value: "no", label: "No Relay" },
          ]}
        />
        <Select
          label="Email"
          value={filterEmail}
          onChange={(v) => setFilterEmail(v as typeof filterEmail)}
          options={[
            { value: "all", label: "All" },
            { value: "yes", label: "Captured" },
            { value: "no", label: "Missing" },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl bg-white/[0.025] ring-1 ring-white/10">
        <table className="min-w-full divide-y divide-white/8 text-[13px]">
          <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-[0.18em] text-white/55">
            <tr>
              <th className="px-3 py-3">When</th>
              <th className="px-3 py-3">Company</th>
              <th className="px-3 py-3">DOT / MC</th>
              <th className="px-3 py-3">Auth</th>
              <th className="px-3 py-3">Relay</th>
              <th className="px-3 py-3">Range</th>
              <th className="px-3 py-3">Contact</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-white/45">
                  No valuations match the filters.
                </td>
              </tr>
            )}
            {filtered.map((v) => (
              <Row
                key={v.id}
                v={v}
                expanded={expandedId === v.id}
                onToggle={() => setExpandedId(expandedId === v.id ? null : v.id)}
                onUpdate={(patch) => updateRow(v.id, patch)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-white/35">
        Showing {filtered.length} of {rows.length} · Pipeline value:{" "}
        {fmtMoney(stats.pipelineValue)} (contacted/diligence/offer-sent rows)
      </p>
    </section>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "emerald";
}) {
  const valueClass = tone === "emerald" ? "text-emerald-300" : "text-white";
  return (
    <div className="rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${valueClass}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] text-white/55">{sub}</p>}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-white outline-none focus:border-[#ff8a1a]/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0a0a0b]">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Row({
  v,
  expanded,
  onToggle,
  onUpdate,
}: {
  v: AdminValuationRow;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: { status?: StatusValue; notesInternal?: string }) => void;
}) {
  const [notesDraft, setNotesDraft] = useState(v.notes_internal ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const status = (v.status ?? "new") as StatusValue;
  return (
    <>
      <tr className="hover:bg-white/[0.02]">
        <td className="whitespace-nowrap px-3 py-3 text-white/65">
          {new Date(v.created_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </td>
        <td className="px-3 py-3 font-medium text-white">
          {v.legal_name || "—"}
          {v.dba_name && (
            <span className="block text-[11px] text-white/45">DBA {v.dba_name}</span>
          )}
        </td>
        <td className="px-3 py-3 text-[12px] text-white/65">
          {v.dot_number ? `USDOT ${v.dot_number}` : "—"}
          {v.mc_number && (
            <span className="block text-[11px] text-white/45">MC-{v.mc_number}</span>
          )}
        </td>
        <td className="px-3 py-3 text-[12px]">
          {v.authority_status === "A" ? (
            <span className="text-emerald-300">Active</span>
          ) : v.authority_status === "I" ? (
            <span className="text-amber-300">Inactive</span>
          ) : (
            <span className="text-white/45">—</span>
          )}
          {v.authority_age_days !== null && (
            <span className="block text-[10px] text-white/35">
              {Math.round(v.authority_age_days / 30)} mo
            </span>
          )}
        </td>
        <td className="px-3 py-3 text-[12px]">
          {v.has_amazon_relay === true ? (
            <span className="inline-flex rounded-full bg-[#ff8a1a]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ff8a1a]">
              Yes
            </span>
          ) : v.has_amazon_relay === false ? (
            <span className="text-white/45">No</span>
          ) : (
            <span className="text-white/35">—</span>
          )}
        </td>
        <td className="px-3 py-3 font-medium text-white">
          {fmtRange(v.valuation_low, v.valuation_high)}
          {v.valuation_floored_reason && (
            <span
              className="block text-[10px] italic text-amber-300/80"
              title={v.valuation_floored_reason}
            >
              floored
            </span>
          )}
        </td>
        <td className="px-3 py-3 text-[12px]">
          {v.contact_email ? (
            <a
              href={`mailto:${v.contact_email}`}
              className="text-[#ffb371] hover:underline"
            >
              {v.contact_name || v.contact_email}
            </a>
          ) : (
            <span className="text-white/35">—</span>
          )}
          {v.contact_phone && (
            <a
              href={`tel:${v.contact_phone}`}
              className="block text-[11px] text-white/45 hover:text-white/70"
            >
              {v.contact_phone}
            </a>
          )}
        </td>
        <td className="px-3 py-3">
          <select
            value={status}
            onChange={(e) => onUpdate({ status: e.target.value as StatusValue })}
            className={`rounded-full border-0 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] outline-none ring-1 ${STATUS_TONE[status]}`}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#0a0a0b]">
                {s.label}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-3 text-right">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md px-2 py-1 text-[11px] text-white/60 hover:bg-white/[0.06] hover:text-white"
          >
            {expanded ? "Close" : "Detail"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-white/[0.015]">
          <td colSpan={9} className="px-6 py-5">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
                  FMCSA snapshot
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-white/70">
                  <Detail label="Power units" value={String(v.power_units ?? "—")} />
                  <Detail label="Drivers" value={String(v.drivers_count ?? "—")} />
                  <Detail
                    label="Vehicle OOS %"
                    value={v.vehicle_oos_pct ?? "—"}
                  />
                  <Detail
                    label="Driver OOS %"
                    value={v.driver_oos_pct ?? "—"}
                  />
                  <Detail
                    label="Crashes 24mo"
                    value={String(v.crashes_24mo ?? "—")}
                  />
                  <Detail
                    label="Safety rating"
                    value={
                      v.safety_rating === "S"
                        ? "Satisfactory"
                        : v.safety_rating === "C"
                          ? "Conditional"
                          : v.safety_rating === "U"
                            ? "Unsatisfactory"
                            : "—"
                    }
                  />
                </dl>
                {v.valuation_floored_reason && (
                  <div className="mt-4 rounded-lg bg-amber-500/[0.08] p-3 ring-1 ring-amber-400/20">
                    <p className="text-[12px] text-amber-200">
                      <strong>Floored:</strong> {v.valuation_floored_reason}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
                  Internal notes
                </p>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={6}
                  placeholder="Call notes, follow-up plan, blockers…"
                  className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder:text-white/35 outline-none focus:border-[#ff8a1a]/50"
                />
                <div className="mt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      setSavingNotes(true);
                      await onUpdate({ notesInternal: notesDraft });
                      setSavingNotes(false);
                    }}
                    disabled={savingNotes || notesDraft === (v.notes_internal ?? "")}
                    className="rounded-full bg-[#ff8a1a] px-4 py-1.5 text-[12px] font-semibold text-[#0a0a0b] transition-colors hover:bg-[#ffb371] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingNotes ? "Saving…" : "Save notes"}
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</dt>
      <dd className="mt-0.5 text-white/85">{value}</dd>
    </div>
  );
}
