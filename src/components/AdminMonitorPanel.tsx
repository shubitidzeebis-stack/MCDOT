"use client";

import { Fragment, useMemo, useState } from "react";
import { buildUccHandoff } from "@/lib/audit/ucc";
import type { MonitorRow } from "@/lib/db/monitor";
import type { UccRating } from "@/lib/monitor/types";

// Read-only work queue for the outbound monitoring agent (source='monitor'),
// hottest-first by days-to-180. Expand a row for the insurance-history audit and
// the UCC handoff (deep link + copy-name) where the safety team records findings.

type Address = {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
} | null;

type Gap = { from: string; to: string; days: number; method: string | null; live?: boolean };

function addr(v: unknown): Address {
  if (v && typeof v === "object") return v as Address;
  return null;
}

function gaps(v: unknown): Gap[] {
  return Array.isArray(v) ? (v as Gap[]) : [];
}

function ratingPill(r: string | null): string {
  switch (r) {
    case "green":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20";
    case "amber":
      return "bg-amber-500/15 text-amber-300 ring-amber-400/20";
    case "red":
      return "bg-red-500/15 text-red-300 ring-red-400/20";
    default:
      return "bg-white/[0.06] text-white/55 ring-white/10";
  }
}

const ELIGIBILITY_LABEL: Record<string, string> = {
  too_new: "Too new",
  approaching: "Approaching",
  eligible_now: "Eligible now",
  aged_out: "Aged out",
  awaiting_authority: "Awaiting authority",
  authority_inactive: "Authority inactive",
  continuity_broken: "Insurance gap",
};

function daysBadge(d: number | null): string {
  if (d === null) return "—";
  if (d <= 0) return `eligible (${-d}d)`;
  return `${d}d`;
}

export function AdminMonitorPanel({
  initial,
  adminKey,
}: {
  initial: MonitorRow[];
  adminKey?: string;
}) {
  const [rows, setRows] = useState<MonitorRow[]>(initial);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.legal_name, r.dba_name, r.dot_number, r.mc_number]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, query]);

  function patchRow(id: number, patch: Partial<MonitorRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <section className="mt-12">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
          Acquisition monitor ({rows.length})
        </h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name / MC / DOT…"
          className="w-64 rounded-lg bg-white/[0.04] px-3 py-1.5 text-[13px] text-white ring-1 ring-white/10 placeholder:text-white/35 focus:outline-none focus:ring-[#ff8a1a]/40"
        />
      </div>

      <div className="overflow-x-auto rounded-xl bg-white/[0.025] ring-1 ring-white/10">
        <table className="min-w-full divide-y divide-white/8 text-[13px]">
          <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-[0.18em] text-white/55">
            <tr>
              <th className="px-3 py-3">Company</th>
              <th className="px-3 py-3">DOT</th>
              <th className="px-3 py-3">State</th>
              <th className="px-3 py-3">Fleet</th>
              <th className="px-3 py-3">→180</th>
              <th className="px-3 py-3">Eligibility</th>
              <th className="px-3 py-3">Insurance</th>
              <th className="px-3 py-3">UCC</th>
              <th className="px-3 py-3">Audit</th>
              <th className="px-3 py-3">Score</th>
              <th className="px-3 py-3">Channel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-12 text-center text-white/45">
                  No monitored carriers yet. Enable the sweep (monitorEnabled) to
                  start discovery.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const a = addr(r.phy_address);
              const state = a?.state ?? "—";
              const isOpen = expanded === r.id;
              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                    className="cursor-pointer hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-3 font-medium text-white">
                      {r.legal_name ?? "—"}
                      {r.dba_name && (
                        <span className="text-white/35"> · {r.dba_name}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-white/65">
                      {r.dot_number ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-white/65">{state}</td>
                    <td className="px-3 py-3 text-white/65">
                      {r.power_units ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-white/80">
                      {daysBadge(r.days_to_180)}
                    </td>
                    <td className="px-3 py-3 text-white/65">
                      {r.eligibility_state
                        ? (ELIGIBILITY_LABEL[r.eligibility_state] ??
                          r.eligibility_state)
                        : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ${ratingPill(r.insurance_rating)}`}
                      >
                        {r.insurance_rating ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-white/55">
                      {r.ucc_status ?? "pending"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ${ratingPill(r.audit_score)}`}
                      >
                        {r.audit_score ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-white/85">
                      {r.acquisition_score ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-white/55">
                      {r.outreach_channel ?? "—"}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-white/[0.015]">
                      <td colSpan={11} className="px-4 py-4">
                        <MonitorDetail row={r} adminKey={adminKey} onSaved={patchRow} />
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
  );
}

function MonitorDetail({
  row,
  adminKey,
  onSaved,
}: {
  row: MonitorRow;
  adminKey?: string;
  onSaved: (id: number, patch: Partial<MonitorRow>) => void;
}) {
  const a = addr(row.phy_address);
  const handoff = buildUccHandoff({
    legalName: row.legal_name,
    dbaName: row.dba_name,
    state: a?.state ?? null,
  });
  const insGaps = gaps(row.insurance_gaps);

  const [liensFound, setLiensFound] = useState(false);
  const [lienCount, setLienCount] = useState("");
  const [securedParties, setSecuredParties] = useState("");
  const [collateral, setCollateral] = useState("");
  const [notes, setNotes] = useState("");
  const [uccRating, setUccRating] = useState<UccRating | "">("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/monitor/capture-ucc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: adminKey,
          id: row.id,
          liensFound,
          lienCount: lienCount ? Number(lienCount) : null,
          securedParties,
          collateral,
          notes,
          uccRating: uccRating || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Save failed.");
      } else {
        setMsg("Saved.");
        onSaved(row.id, {
          ucc_status: data.uccStatus,
          ucc_rating: data.uccRating,
          audit_score: data.auditScore,
          acquisition_score: data.acquisitionScore,
        });
      }
    } catch {
      setMsg("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Insurance history */}
      <div>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
          Insurance history
        </h4>
        <p className="text-[13px] text-white/70">
          Currently insured: {row.insurance_current === null ? "—" : row.insurance_current ? "Yes" : "No"} ·
          rating {row.insurance_rating ?? "—"} · anchor{" "}
          {row.bipd_anchor_date ?? "—"} · eligible at {row.eligible_at ?? "—"}
        </p>
        {insGaps.length === 0 ? (
          <p className="mt-2 text-[13px] text-emerald-300/80">No coverage gaps recorded.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-[13px] text-amber-300/90">
            {insGaps.map((g, i) => (
              <li key={i}>
                {g.live ? "LIVE lapse" : "Gap"}: {g.days}d ({g.from} → {g.to}
                {g.method ? `, ${g.method}` : ""})
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[12px] text-white/45">
          {a?.street ? `${a.street}, ` : ""}
          {a?.city ? `${a.city}, ` : ""}
          {a?.state ?? ""} {a?.zip ?? ""}
          {row.telephone ? ` · ${row.telephone}` : ""}
          {row.census_email ? ` · ${row.census_email}` : ""}
        </p>
      </div>

      {/* UCC handoff + capture */}
      <div>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
          UCC check ({a?.state ?? "?"})
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={handoff.searchUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-[#ff8a1a]/15 px-3 py-1.5 text-[12px] font-semibold text-[#ffb371] ring-1 ring-[#ff8a1a]/25 hover:bg-[#ff8a1a]/25"
          >
            Open SoS UCC search ({handoff.linkType})
          </a>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(handoff.clipboardName)}
            className="rounded-lg bg-white/[0.05] px-3 py-1.5 text-[12px] text-white/80 ring-1 ring-white/10 hover:bg-white/[0.08]"
          >
            Copy name: {handoff.clipboardName}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-white/40">{handoff.notes}</p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
          <label className="col-span-2 flex items-center gap-2 text-white/70">
            <input
              type="checkbox"
              checked={liensFound}
              onChange={(e) => setLiensFound(e.target.checked)}
            />
            Liens found
          </label>
          <input
            value={lienCount}
            onChange={(e) => setLienCount(e.target.value)}
            placeholder="Lien count"
            inputMode="numeric"
            className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-white ring-1 ring-white/10"
          />
          <select
            value={uccRating}
            onChange={(e) => setUccRating(e.target.value as UccRating | "")}
            className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-white ring-1 ring-white/10"
          >
            <option value="">Rating (auto)</option>
            <option value="green">green</option>
            <option value="amber">amber</option>
            <option value="red">red</option>
          </select>
          <input
            value={securedParties}
            onChange={(e) => setSecuredParties(e.target.value)}
            placeholder="Secured parties (comma-sep)"
            className="col-span-2 rounded-lg bg-white/[0.04] px-2 py-1.5 text-white ring-1 ring-white/10"
          />
          <input
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
            placeholder="Collateral"
            className="col-span-2 rounded-lg bg-white/[0.04] px-2 py-1.5 text-white ring-1 ring-white/10"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            rows={2}
            className="col-span-2 rounded-lg bg-white/[0.04] px-2 py-1.5 text-white ring-1 ring-white/10"
          />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-emerald-500/20 px-4 py-1.5 text-[13px] font-semibold text-emerald-200 ring-1 ring-emerald-400/25 hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save UCC findings"}
          </button>
          {msg && <span className="text-[12px] text-white/60">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
