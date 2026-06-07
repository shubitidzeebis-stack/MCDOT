"use client";

import { useState } from "react";

// On-demand audit: enter any MC/DOT → full audit + rating + UCC handoff,
// reusing the monitor engine via /api/admin/monitor/audit.

type Gap = { from: string; to: string; days: number; method: string | null; live?: boolean };

type AuditResponse = {
  ok: true;
  carrier: {
    legalName: string;
    dbaName: string | null;
    dotNumber: number;
    mcNumbers: string[];
    state: string | null;
    city: string | null;
    telephone: string | null;
    powerUnits: number | null;
    drivers: number | null;
  };
  authorityActive: boolean;
  brokerOnly: boolean;
  currentInsured: boolean;
  insurance: {
    rating: string;
    earliestBipdEffective: string | null;
    continuous: boolean;
    gaps: Gap[];
    reasoning: string[];
  };
  eligibility: {
    state: string;
    daysTo180: number | null;
    daysSinceAnchor: number | null;
    eligibleAt: string | null;
    anchorSource: string;
  };
  auditRating: string;
  acquisitionScore: number;
  uccHandoff: { searchUrl: string; linkType: string; notes: string; clipboardName: string };
  valuation: { low: number; high: number; flooredReason: string | null };
};

export function OnDemandAuditTool({ adminKey }: { adminKey?: string }) {
  const [number, setNumber] = useState("");
  const [kind, setKind] = useState<"mc" | "dot">("mc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/monitor/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey, number, kind }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Audit failed.");
      else setResult(data as AuditResponse);
    } catch {
      setError("Audit failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "mc" | "dot")}
          className="rounded-lg bg-white/[0.04] px-3 py-2 text-white ring-1 ring-white/10"
        >
          <option value="mc">MC</option>
          <option value="dot">DOT</option>
        </select>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Enter MC or DOT number"
          className="flex-1 rounded-lg bg-white/[0.04] px-3 py-2 text-white ring-1 ring-white/10 placeholder:text-white/35 focus:outline-none focus:ring-[#ff8a1a]/40"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading || !number.trim()}
          className="rounded-lg bg-[#ff8a1a]/20 px-5 py-2 font-semibold text-[#ffb371] ring-1 ring-[#ff8a1a]/30 hover:bg-[#ff8a1a]/30 disabled:opacity-50"
        >
          {loading ? "Auditing…" : "Run audit"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-[13px] text-red-300 ring-1 ring-red-400/20">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 space-y-4 rounded-xl bg-white/[0.025] p-5 ring-1 ring-white/10">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {result.carrier.legalName}
              {result.carrier.dbaName && (
                <span className="text-white/40"> · {result.carrier.dbaName}</span>
              )}
            </h3>
            <p className="text-[13px] text-white/55">
              DOT {result.carrier.dotNumber}
              {result.carrier.mcNumbers.length > 0 &&
                ` · MC ${result.carrier.mcNumbers.join(", ")}`}
              {" · "}
              {result.carrier.city ?? ""} {result.carrier.state ?? ""}
              {result.carrier.telephone ? ` · ${result.carrier.telephone}` : ""}
              {` · ${result.carrier.powerUnits ?? "—"} units`}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Offer range" value={`$${result.valuation.low.toLocaleString()}–$${result.valuation.high.toLocaleString()}`} />
            <Stat label="Audit score" value={String(result.acquisitionScore)} />
            <Stat label="Audit rating" value={result.auditRating} />
            <Stat
              label="Eligibility"
              value={`${result.eligibility.state}${result.eligibility.daysTo180 != null ? ` (${result.eligibility.daysTo180}d to 180)` : ""}`}
            />
            <Stat label="Insurance" value={`${result.insurance.rating}${result.currentInsured ? "" : " · UNINSURED"}`} />
            <Stat
              label="Authority"
              value={result.brokerOnly ? "broker-only" : result.authorityActive ? "active" : "inactive"}
            />
          </div>

          <div>
            <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
              Insurance history
            </h4>
            <ul className="space-y-0.5 text-[13px] text-white/70">
              {result.insurance.reasoning.map((line, i) => (
                <li key={i}>• {line}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
              UCC check ({result.carrier.state ?? "?"})
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={result.uccHandoff.searchUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-[#ff8a1a]/15 px-3 py-1.5 text-[12px] font-semibold text-[#ffb371] ring-1 ring-[#ff8a1a]/25 hover:bg-[#ff8a1a]/25"
              >
                Open SoS UCC search ({result.uccHandoff.linkType})
              </a>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(result.uccHandoff.clipboardName)}
                className="rounded-lg bg-white/[0.05] px-3 py-1.5 text-[12px] text-white/80 ring-1 ring-white/10 hover:bg-white/[0.08]"
              >
                Copy name: {result.uccHandoff.clipboardName}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-white/40">{result.uccHandoff.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2 ring-1 ring-white/8">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">{label}</div>
      <div className="mt-0.5 text-[14px] font-medium text-white">{value}</div>
    </div>
  );
}
