"use client";

import { useEffect, useRef, useState } from "react";
import { stashBosPrefill } from "@/lib/bos/prefill";

// On-demand audit: enter any MC/DOT → full audit + rating + UCC handoff,
// reusing the monitor engine via /api/admin/monitor/audit.
//
// It also takes an EMAIL or PHONE, searched against OUR OWN leads and prospect
// list first and the FMCSA census second. The census only indexes the MCS-150
// filing contact — often a dispatcher, insurance agent, or compliance-filing
// service — so one value can front many carriers, and the address a seller
// typed into our wizard isn't in it at all. The API answers with a `matches`
// list instead of an audit whenever the result is ambiguous or has no DOT to
// audit; we render a picker, and clicking a row re-runs as a plain DOT audit.

type Gap = { from: string; to: string; days: number; method: string | null; live?: boolean };

type AuditKind = "mc" | "dot" | "email" | "phone";

// Mirrors ContactMatch in lib/monitor/reverse-lookup.ts. Declared locally (as
// AuditResponse is) so this client component never imports the server module.
type ContactMatch = {
  dotNumber: string;
  legalName: string | null;
  dbaName: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  cellPhone: string | null;
  email: string | null;
  statusCode: string | null;
  addDate: string | null;
  mcNumber: string | null;
  source: "census" | "lead" | "monitor";
  valuationId: number | null;
  contactName: string | null;
  status: string | null;
};

// Where a hit came from, in the operator's language. "Your lead" is the one
// that matters most — it means this person is already in the pipeline.
const SOURCE_LABEL: Record<ContactMatch["source"], string> = {
  lead: "Your lead",
  monitor: "Prospect list",
  census: "FMCSA census",
};

const SOURCE_CLASS: Record<ContactMatch["source"], string> = {
  lead: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25",
  monitor: "bg-[#ff8a1a]/15 text-[#ffb371] ring-[#ff8a1a]/25",
  census: "bg-white/[0.06] text-white/55 ring-white/15",
};

type AuditResponse = {
  ok: true;
  carrier: {
    legalName: string;
    dbaName: string | null;
    dotNumber: number;
    mcNumbers: string[];
    street: string | null;
    state: string | null;
    city: string | null;
    zip: string | null;
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

// The ambiguous-contact response: a picker instead of an audit.
type MatchesResponse = { ok: true; matches: ContactMatch[] };

// Mirrors CONTACT_LIMIT in lib/monitor/reverse-lookup.ts. A filing service can
// front four figures of carriers (one census phone had 1,220 added in 2026
// alone), so a full list is never shown — say so instead of implying the count
// is exhaustive.
const CONTACT_MATCH_LIMIT = 25;

const PLACEHOLDERS: Record<AuditKind, string> = {
  mc: "Enter MC number",
  dot: "Enter DOT number",
  email: "Enter email address, e.g. dispatch@carrier.com",
  phone: "Enter phone number, e.g. (614) 857-9300",
};

function isMatchesResponse(x: unknown): x is MatchesResponse {
  if (!x || typeof x !== "object") return false;
  return Array.isArray((x as { matches?: unknown }).matches);
}

function errorMessage(x: unknown): string {
  if (x && typeof x === "object") {
    const e = (x as { error?: unknown }).error;
    if (typeof e === "string" && e.length > 0) return e;
  }
  return "Audit failed.";
}

export function OnDemandAuditTool({
  adminKey,
  canDraftBos = false,
  initialKind,
  initialNumber,
}: {
  adminKey?: string;
  /**
   * Full admins only. /admin/audit is open to every signed-in role, but
   * /admin/bill-of-sale is owner-only and redirects agents back to /admin —
   * so the "Draft Bill of Sale" shortcut must not be shown to them.
   * Defaults to false so a caller that forgets to pass it fails closed.
   */
  canDraftBos?: boolean;
  /** Deep-link seeds (?kind=…&number=… on /admin/audit). When both are
   *  present the audit fires on mount, so "Look up this number →" on the
   *  calls page lands on results, not an empty form. */
  initialKind?: AuditKind;
  initialNumber?: string;
}) {
  const [number, setNumber] = useState(initialNumber ?? "");
  const [kind, setKind] = useState<AuditKind>(initialKind ?? "mc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [matches, setMatches] = useState<ContactMatch[] | null>(null);

  // Auto-run a deep-linked lookup exactly once. The ref (not state) guards
  // React 18+ dev StrictMode double-mount from burning two FMCSA-quota calls.
  const autoRan = useRef(false);
  useEffect(() => {
    if (!initialNumber || !initialKind || autoRan.current) return;
    autoRan.current = true;
    void run({ kind: initialKind, number: initialNumber });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `override` exists so the match picker can fire an audit with a DOT it just
  // set on state — reading `kind`/`number` here would see the stale closure.
  async function run(override?: { kind: AuditKind; number: string }) {
    const query = override ?? { kind, number };
    if (!query.number.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setMatches(null);
    try {
      const res = await fetch("/api/admin/monitor/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey, number: query.number, kind: query.kind }),
      });
      const data: unknown = await res.json();
      if (!res.ok) setError(errorMessage(data));
      else if (isMatchesResponse(data)) setMatches(data.matches);
      else setResult(data as AuditResponse);
    } catch {
      setError("Audit failed.");
    } finally {
      setLoading(false);
    }
  }

  // Prefer the MC docket for the same reason the API does: QCMobile serves MC
  // and DOT from separate endpoints that disagree, and the MC one is materially
  // more likely to hold the carrier.
  function auditMatch(match: ContactMatch) {
    const next: { kind: AuditKind; number: string } = match.mcNumber
      ? { kind: "mc", number: match.mcNumber }
      : { kind: "dot", number: match.dotNumber };
    setKind(next.kind);
    setNumber(next.number);
    void run(next);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as AuditKind);
            // Don't leave a stale picker/result under a different search mode.
            setError(null);
            setResult(null);
            setMatches(null);
          }}
          className="rounded-lg bg-white/[0.04] px-3 py-2 text-white ring-1 ring-white/10"
        >
          {/*
            Each <option> needs an explicit dark background. The popup list is
            drawn by the OS, not the page: it ignores the translucent
            bg-white/[0.04] on the <select> and paints system white, while
            INHERITING the select's text-white — so the choices render white on
            white and are invisible until highlighted. Same fix as BillOfSalePanel.
          */}
          <option value="mc" className="bg-[#0a0a0b] text-white">MC</option>
          <option value="dot" className="bg-[#0a0a0b] text-white">DOT</option>
          <option value="email" className="bg-[#0a0a0b] text-white">Email</option>
          <option value="phone" className="bg-[#0a0a0b] text-white">Phone</option>
        </select>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder={PLACEHOLDERS[kind]}
          inputMode={kind === "phone" ? "tel" : kind === "email" ? "email" : "numeric"}
          className="flex-1 rounded-lg bg-white/[0.04] px-3 py-2 text-white ring-1 ring-white/10 placeholder:text-white/35 focus:outline-none focus:ring-[#ff8a1a]/40"
        />
        <button
          type="button"
          onClick={() => run()}
          disabled={loading || !number.trim()}
          className="rounded-lg bg-[#ff8a1a]/20 px-5 py-2 font-semibold text-[#ffb371] ring-1 ring-[#ff8a1a]/30 hover:bg-[#ff8a1a]/30 disabled:opacity-50"
        >
          {loading ? "Auditing…" : "Run audit"}
        </button>
      </div>

      {(kind === "email" || kind === "phone") && (
        <p className="mt-2 text-[11px] leading-relaxed text-white/40">
          Searches your leads and prospect list first, then the FMCSA census. The
          census only holds the MCS-150 <em>filing</em>{" "}contact — often a
          dispatcher, insurance agent or filing service — so one value can front
          many carriers, and a seller&apos;s personal mobile or inbox may not be in
          it at all. You&apos;ll get a list to pick from.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-[13px] text-red-300 ring-1 ring-red-400/20">
          {error}
        </p>
      )}

      {matches && (
        <div className="mt-6 rounded-xl bg-white/[0.025] p-5 ring-1 ring-white/10">
          <h3 className="text-[14px] font-semibold text-white">
            {matches.length >= CONTACT_MATCH_LIMIT
              ? `${CONTACT_MATCH_LIMIT}+ matches for that ${kind === "email" ? "email address" : "phone number"}`
              : `${matches.length} match${matches.length === 1 ? "" : "es"} for that ${kind === "email" ? "email address" : "phone number"}`}
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-white/45">
            Green rows are already in your pipeline. Census rows are the MCS-150{" "}
            <em>filing</em> contact, so one dispatcher or filing service can front
            many carriers. Pick one — each audit fires live FMCSA lookups, so they
            are not run automatically.
            {matches.length >= CONTACT_MATCH_LIMIT &&
              ` Only the ${CONTACT_MATCH_LIMIT} newest are shown; search by MC/DOT if the one you want isn't here.`}
          </p>
          <ul className="mt-3 space-y-1.5">
            {matches.map((m, i) => {
              // Our own rows can lack both identifiers (an inbound lead whose
              // FMCSA lookup never resolved). Such a row still identifies the
              // person, so it is listed — just not clickable, because there is
              // nothing to look the carrier up by.
              const auditable = m.dotNumber.length > 0 || !!m.mcNumber;
              return (
                <li key={`${m.source}-${m.valuationId ?? m.dotNumber}-${i}`}>
                  <button
                    type="button"
                    onClick={() => auditMatch(m)}
                    disabled={loading || !auditable}
                    title={auditable ? undefined : "No DOT on this record — nothing to audit"}
                    className="w-full rounded-lg bg-white/[0.03] px-3 py-2 text-left ring-1 ring-white/8 enabled:hover:bg-white/[0.08] disabled:cursor-default disabled:opacity-60"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[13px] font-medium text-white">
                        {m.legalName ?? m.contactName ?? `DOT ${m.dotNumber}`}
                      </span>
                      {m.dbaName && (
                        <span className="text-[13px] text-white/40">· {m.dbaName}</span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ${SOURCE_CLASS[m.source]}`}
                      >
                        {SOURCE_LABEL[m.source]}
                      </span>
                      {m.status && (
                        <span className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                          {m.status}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/50">
                      {auditable ? `DOT ${m.dotNumber}` : "no DOT on file"}
                      {m.mcNumber ? ` · MC ${m.mcNumber}` : ""}
                      {[m.city, m.state].filter(Boolean).length > 0
                        ? ` · ${[m.city, m.state].filter(Boolean).join(", ")}`
                        : ""}
                      {m.statusCode
                        ? ` · ${m.statusCode === "A" ? "active" : m.statusCode}`
                        : ""}
                      {m.addDate ? ` · added ${m.addDate}` : ""}
                      {m.contactName && m.legalName ? ` · ${m.contactName}` : ""}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4 rounded-xl bg-white/[0.025] p-5 ring-1 ring-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
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
            {canDraftBos && (
            <button
              type="button"
              onClick={() => {
                const c = result.carrier;
                const mc = c.mcNumbers[0];
                stashBosPrefill({
                  companyName: c.legalName || undefined,
                  companyDba: c.dbaName ?? undefined,
                  mcNumber: mc
                    ? mc.toUpperCase().startsWith("MC")
                      ? mc
                      : `MC-${mc}`
                    : undefined,
                  usdotNumber: String(c.dotNumber),
                  companyAddress:
                    [c.street, c.city, c.state, c.zip].filter(Boolean).join(", ") ||
                    undefined,
                  companyPhone: c.telephone ?? undefined,
                });
                window.location.href = "/admin/bill-of-sale";
              }}
              title="Draft a Bill of Sale prefilled from this audit"
              className="rounded-lg bg-[#ff8a1a]/15 px-3 py-1.5 text-[12px] font-semibold text-[#ffb371] ring-1 ring-[#ff8a1a]/25 hover:bg-[#ff8a1a]/25"
            >
              Draft Bill of Sale
            </button>
            )}
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
