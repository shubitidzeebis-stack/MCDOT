"use client";

import { useEffect, useMemo, useState } from "react";
import { stashBosPrefill } from "@/lib/bos/prefill";

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
  insurance_status: string | null;
  telephone: string | null;
  phy_address: {
    street: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
  } | null;
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

// Authority age in human terms. < 1 yr reads in months, otherwise years
// with one decimal. Derived from the MCS-150 form date (≈ registration
// age for newer carriers).
function fmtAge(days: number | null): string {
  if (days === null || days < 15) return "—";
  if (days < 365) return `${Math.max(1, Math.round(days / 30.44))} mo`;
  const years = days / 365.25;
  const n = years >= 10 ? String(Math.round(years)) : years.toFixed(1).replace(/\.0$/, "");
  return `${n} yr`;
}

function fmtLocation(addr: AdminValuationRow["phy_address"]): string {
  if (!addr) return "—";
  return [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(", ") || "—";
}

export function AdminValuationsPanel({
  initial,
  adminKey,
}: {
  initial: AdminValuationRow[];
  /** Legacy fallback. When empty, the API uses the session cookie. */
  adminKey?: string;
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

  async function deleteRow(id: number) {
    if (
      !confirm(
        "Delete this valuation permanently? This cannot be undone.",
      )
    ) {
      return;
    }
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== id));
    try {
      const body: Record<string, unknown> = { id };
      if (adminKey) body.key = adminKey;
      const res = await fetch("/api/admin/valuations/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("delete failed");
    } catch (err) {
      console.error(err);
      setRows(prev);
      alert("Delete failed — the row was restored.");
    }
  }

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
      const body: Record<string, unknown> = { id, ...patch };
      if (adminKey) body.key = adminKey;
      const res = await fetch("/api/admin/valuations/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
          href={
            adminKey
              ? `/api/admin/valuations/export?key=${encodeURIComponent(adminKey)}`
              : "/api/admin/valuations/export"
          }
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
                onDelete={() => deleteRow(v.id)}
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

type EmailTemplate = { id: string; label: string; subject: string; body: string };

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "intro",
    label: "Intro / first contact",
    subject: "Following up on your Veritor valuation",
    body:
      "Hi {{name}},\n\nThanks for using our valuation tool. Based on your FMCSA snapshot we landed on {{range}} as an indicative range. I'd like to set up a quick 15-minute call to walk through the details and answer any questions you have about the process.\n\nWhat days work best for you this week?\n\nThanks,",
  },
  {
    id: "diligence",
    label: "Ready for diligence call",
    subject: "Quick diligence call — Veritor",
    body:
      "Hi {{name}},\n\nReady to move to the next step. For our diligence call we'll need:\n\n- Current insurance certificate (BIPD)\n- Most recent MCS-150 confirmation\n- Last 90 days of broker invoices (one or two examples is fine)\n\nIf you can have those handy when we talk we can get to a written offer the same day.\n\nThanks,",
  },
  {
    id: "offer-followup",
    label: "Following up on offer",
    subject: "Quick check-in on your offer",
    body:
      "Hi {{name}},\n\nJust wanted to check in — our offer of {{range}} is still on the table and ready to move whenever you are. Happy to revisit any specific terms if there's something you'd like to discuss.\n\nLet me know how you'd like to proceed.\n\nThanks,",
  },
  {
    id: "blank",
    label: "Blank — write from scratch",
    subject: "",
    body: "",
  },
];

function fillTemplate(text: string, ctx: { name: string; range: string }): string {
  return text
    .replace(/\{\{name\}\}/g, ctx.name || "there")
    .replace(/\{\{range\}\}/g, ctx.range);
}

function Row({
  v,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
}: {
  v: AdminValuationRow;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: { status?: StatusValue; notesInternal?: string }) => void;
  onDelete: () => void;
}) {
  const [notesDraft, setNotesDraft] = useState(v.notes_internal ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const status = (v.status ?? "new") as StatusValue;

  // Email composer state — local to this row.
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailFlash, setEmailFlash] = useState<{
    kind: "ok" | "err";
    msg: string;
  } | null>(null);

  // Email history — loaded lazily when the drawer expands.
  const [history, setHistory] = useState<
    | Array<{
        id: number;
        created_at: string;
        sent_by_email: string | null;
        sent_by_name: string | null;
        to_email: string;
        subject: string;
        body: string;
      }>
    | null
  >(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!expanded || history !== null) return;
    setHistoryLoading(true);
    fetch(`/api/admin/email/history?valuationId=${v.id}`)
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((data) => setHistory(data.entries ?? []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [expanded, history, v.id]);

  function pickTemplate(id: string) {
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    const range = fmtRange(v.valuation_low, v.valuation_high);
    const ctx = {
      name: (v.contact_name ?? "").split(/\s+/)[0] ?? "",
      range,
    };
    setEmailSubject(fillTemplate(tpl.subject, ctx));
    setEmailBody(fillTemplate(tpl.body, ctx));
  }

  async function sendEmail() {
    if (!v.contact_email) {
      setEmailFlash({ kind: "err", msg: "No email captured for this lead." });
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      setEmailFlash({ kind: "err", msg: "Subject and body are required." });
      return;
    }
    setEmailSending(true);
    setEmailFlash(null);
    try {
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: v.contact_email,
          subject: emailSubject,
          body: emailBody,
          valuationId: v.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setEmailFlash({ kind: "ok", msg: `Sent to ${v.contact_email}.` });
      setEmailSubject("");
      setEmailBody("");
      // Refresh history so the just-sent email appears immediately.
      try {
        const hres = await fetch(`/api/admin/email/history?valuationId=${v.id}`);
        if (hres.ok) {
          const hdata = await hres.json();
          setHistory(hdata.entries ?? []);
        }
      } catch {
        // ignore
      }
    } catch (err) {
      setEmailFlash({
        kind: "err",
        msg: err instanceof Error ? err.message : "Send failed.",
      });
    } finally {
      setEmailSending(false);
    }
  }
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
          {v.phy_address?.state && (
            <span className="block text-[11px] text-white/45">
              {[v.phy_address.city, v.phy_address.state].filter(Boolean).join(", ")}
            </span>
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
              {fmtAge(v.authority_age_days)}
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
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={onToggle}
              className="rounded-md px-2 py-1 text-[11px] text-white/60 hover:bg-white/[0.06] hover:text-white"
            >
              {expanded ? "Close" : "Detail"}
            </button>
            <button
              type="button"
              onClick={() => {
                stashBosPrefill({
                  companyName: v.legal_name ?? undefined,
                  companyDba: v.dba_name ?? undefined,
                  sellerName: v.contact_name ?? undefined,
                  mcNumber: v.mc_number
                    ? v.mc_number.toUpperCase().startsWith("MC")
                      ? v.mc_number
                      : `MC-${v.mc_number}`
                    : undefined,
                  usdotNumber: v.dot_number ?? undefined,
                  companyAddress:
                    [
                      v.phy_address?.street,
                      v.phy_address?.city,
                      v.phy_address?.state,
                      v.phy_address?.zip,
                    ]
                      .filter(Boolean)
                      .join(", ") || undefined,
                  companyPhone: v.contact_phone ?? v.telephone ?? undefined,
                });
                window.location.href = "/admin/bill-of-sale";
              }}
              title="Draft a Bill of Sale prefilled from this lead"
              className="rounded-md px-2 py-1 text-[11px] text-[#ffb371]/80 hover:bg-[#ff8a1a]/[0.08] hover:text-[#ffb371]"
            >
              BoS
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Delete this valuation"
              className="rounded-md px-2 py-1 text-[11px] text-red-400/70 hover:bg-red-500/[0.08] hover:text-red-300"
            >
              Del
            </button>
          </div>
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
                  <div className="col-span-2">
                    <Detail label="Location" value={fmtLocation(v.phy_address)} />
                  </div>
                  <Detail label="Authority age" value={fmtAge(v.authority_age_days)} />
                  <Detail
                    label="Authority"
                    value={
                      v.authority_status === "A"
                        ? "Active for-hire"
                        : v.authority_status === "I"
                          ? "Inactive"
                          : "—"
                    }
                  />
                  <Detail label="Power units" value={String(v.power_units ?? "—")} />
                  <Detail label="Drivers" value={String(v.drivers_count ?? "—")} />
                  <Detail
                    label="Insurance"
                    value={
                      v.insurance_status === "active"
                        ? "Active"
                        : v.insurance_status === "lapsed"
                          ? "Lapsed (red flag)"
                          : v.insurance_status === "not_required"
                            ? "Not required"
                            : "—"
                    }
                  />
                  <Detail label="Phone (FMCSA)" value={v.telephone ?? "—"} />
                  <Detail label="Vehicle OOS %" value={v.vehicle_oos_pct ?? "—"} />
                  <Detail label="Driver OOS %" value={v.driver_oos_pct ?? "—"} />
                  <Detail label="Crashes 24mo" value={String(v.crashes_24mo ?? "—")} />
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
                <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
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

              <div>
                {/* Email history — loads lazily on drawer expand. */}
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
                  Email history
                </p>
                {historyLoading ? (
                  <p className="mt-2 text-[12px] text-white/40">Loading…</p>
                ) : history && history.length > 0 ? (
                  <ul className="mt-3 space-y-3">
                    {history.map((h) => (
                      <li
                        key={h.id}
                        className="rounded-lg bg-white/[0.025] p-3 ring-1 ring-white/8"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[12px] font-medium text-white/85">
                            {h.subject}
                          </p>
                          <span className="text-[10px] text-white/40">
                            {new Date(h.created_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-white/45">
                          From {h.sent_by_name || h.sent_by_email || "—"} → {h.to_email}
                        </p>
                        <details className="mt-2 text-[12px] text-white/55">
                          <summary className="cursor-pointer text-[11px] text-white/45 hover:text-white/75">
                            View body
                          </summary>
                          <pre className="mt-2 whitespace-pre-wrap font-sans text-[12px] text-white/65">
                            {h.body}
                          </pre>
                        </details>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-[12px] text-white/40">No emails sent yet.</p>
                )}

                <div className="mt-6 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
                    Send email
                  </p>
                  {!emailOpen && v.contact_email && (
                    <button
                      type="button"
                      onClick={() => setEmailOpen(true)}
                      className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/75 ring-1 ring-white/10 hover:bg-white/[0.08] hover:text-white"
                    >
                      Compose →
                    </button>
                  )}
                </div>
                {!v.contact_email ? (
                  <p className="mt-3 text-[12px] text-white/45">
                    No email captured for this lead — wait for them to provide
                    contact info, or reach out by phone if available.
                  </p>
                ) : !emailOpen ? (
                  <p className="mt-3 text-[12px] text-white/55">
                    Reply to <span className="text-white/85">{v.contact_email}</span>{" "}
                    using a template or write a custom message. Sent from{" "}
                    <span className="text-white/85">info@groupveritor.com</span>{" "}
                    with reply-to set to your account.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                        Template
                      </span>
                      <select
                        onChange={(e) => pickTemplate(e.target.value)}
                        defaultValue=""
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-white outline-none focus:border-[#ff8a1a]/50"
                      >
                        <option value="" className="bg-[#0a0a0b]">
                          — Pick a template —
                        </option>
                        {EMAIL_TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id} className="bg-[#0a0a0b]">
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                        To
                      </span>
                      <input
                        type="email"
                        value={v.contact_email ?? ""}
                        readOnly
                        className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[13px] text-white/70 outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                        Subject
                      </span>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-[#ff8a1a]/50"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                        Body
                      </span>
                      <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        rows={10}
                        className="resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-[#ff8a1a]/50"
                      />
                    </label>
                    {emailFlash && (
                      <p
                        className={`text-[12px] ${emailFlash.kind === "ok" ? "text-emerald-300" : "text-red-400"}`}
                      >
                        {emailFlash.msg}
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEmailOpen(false)}
                        className="rounded-full px-3 py-1.5 text-[12px] text-white/55 hover:bg-white/[0.04] hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={sendEmail}
                        disabled={
                          emailSending || !emailSubject.trim() || !emailBody.trim()
                        }
                        className="rounded-full bg-[#ff8a1a] px-4 py-1.5 text-[12px] font-semibold text-[#0a0a0b] transition-colors hover:bg-[#ffb371] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {emailSending ? "Sending…" : "Send email"}
                      </button>
                    </div>
                  </div>
                )}
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
