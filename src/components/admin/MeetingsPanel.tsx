"use client";

// Compact meetings card for the top of /admin — cal.eu bookings mirrored by
// lib/cal/sync.ts, company-matched to the valuations pipeline at sync time.
//
// Deliberately small: one card, a "next meeting" line and a short day list
// behind Today/Tomorrow pills — Lukas explicitly asked for "small and easily
// visible", not a full calendar grid.
//
// Clicking a company opens an inline info block (MC/DOT, status, contact,
// offer range) fed by the same server query — no fetch on click. "Open in
// pipeline" dispatches a CustomEvent that AdminValuationsPanel (same page)
// listens for: it clears its filters, expands the lead card and scrolls to
// it. An event, not shared state, so neither component imports the other.
//
// All times render in the VIEWER's timezone (Tbilisi for Donnie, Mallorca for
// Lukas — resolved server-side in admin/page.tsx), including the today /
// tomorrow bucketing, which is why it happens here with Intl rather than in
// SQL: "today" is a different UTC window for each of them.
//
// The live countdown renders only after mount: the server can't know the
// client's clock, and a mismatched "in 12m" string would be a hydration error.

import { useEffect, useMemo, useState, type ReactNode } from "react";

export type CompanyDetails = {
  valuationId: number;
  dba: string | null;
  mc: string | null;
  dot: string | null;
  status: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  telephone: string | null;
  offerLow: number | null;
  offerHigh: number | null;
  city: string | null;
  state: string | null;
  /** Whether the AdminValuationsPanel on this page actually lists the row
   *  (inbound leads only) — controls the "Open in pipeline" button. */
  inPipeline: boolean;
};

export type MeetingView = {
  uid: string;
  startsAt: string;
  company: string | null;
  attendee: string | null;
  attendeeEmail: string | null;
  joinUrl: string | null;
  matched: boolean;
  details: CompanyDetails | null;
};

function dateKey(iso: string | number | Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function fmtTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function countdown(msLeft: number): string {
  if (msLeft <= 0 && msLeft > -20 * 60_000) return "now";
  const mins = Math.round(msLeft / 60_000);
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  return `in ${h}h ${String(mins % 60).padStart(2, "0")}m`;
}

function who(m: MeetingView): string {
  if (m.company && m.attendee) return `${m.company} (${m.attendee})`;
  return m.company ?? m.attendee ?? "Unknown";
}

function money(n: number | null): string | null {
  return n === null ? null : `$${n.toLocaleString("en-US")}`;
}

function openInPipeline(id: number) {
  window.dispatchEvent(
    new CustomEvent("veritor:open-valuation", { detail: { id } }),
  );
}

/** Inline company info block shown under a clicked meeting row. */
function CompanyInfo({ m }: { m: MeetingView }) {
  const d = m.details;
  const line = (label: string, value: ReactNode) => (
    <span className="whitespace-nowrap">
      <span className="text-white/35">{label} </span>
      {value}
    </span>
  );
  return (
    <div className="mb-1.5 rounded-lg bg-white/[0.04] px-3 py-2 text-[12px] text-white/75 ring-1 ring-white/10">
      {d ? (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {d.dba && line("DBA", d.dba)}
            {d.mc && line("MC", d.mc)}
            {d.dot && line("DOT", d.dot)}
            {d.status && (
              <span className="rounded-full bg-[#ff8a1a]/15 px-2 py-0.5 text-[10px] font-semibold text-[#ffb371] ring-1 ring-[#ff8a1a]/25">
                {d.status.replace(/_/g, " ")}
              </span>
            )}
            {(d.city || d.state) &&
              line("", [d.city, d.state].filter(Boolean).join(", "))}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {d.contactName && line("Contact", d.contactName)}
            {(d.contactPhone ?? d.telephone) && (
              <a
                href={`tel:${d.contactPhone ?? d.telephone}`}
                className="text-[#ffb371] hover:underline"
              >
                {d.contactPhone ?? d.telephone}
              </a>
            )}
            {d.contactEmail && (
              <a
                href={`mailto:${d.contactEmail}`}
                className="text-[#ffb371] hover:underline"
              >
                {d.contactEmail}
              </a>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {d.offerLow !== null && d.offerHigh !== null
              ? line("Offer", `${money(d.offerLow)} – ${money(d.offerHigh)}`)
              : line("Offer", "—")}
            {d.inPipeline && (
              <button
                type="button"
                onClick={() => openInPipeline(d.valuationId)}
                className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-white/80 ring-1 ring-white/15 hover:bg-white/[0.1]"
              >
                Open in pipeline ↓
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-white/45">
            Not matched to a lead — booked as {m.attendee ?? "unknown"}
          </span>
          {m.attendeeEmail && (
            <a
              href={`mailto:${m.attendeeEmail}`}
              className="text-[#ffb371] hover:underline"
            >
              {m.attendeeEmail}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function MeetingsPanel({
  meetings,
  viewerTz,
  tzLabel,
}: {
  meetings: MeetingView[];
  viewerTz: string;
  tzLabel: string;
}) {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const [openUid, setOpenUid] = useState<string | null>(null);
  // null until mount → countdown is client-only (see header comment).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const clock = now ?? Date.now();
  const todayKey = dateKey(clock, viewerTz);
  const tomorrowKey = dateKey(clock + 86_400_000, viewerTz);

  const { todays, tomorrows, next } = useMemo(() => {
    const todays = meetings.filter((m) => dateKey(m.startsAt, viewerTz) === todayKey);
    const tomorrows = meetings.filter(
      (m) => dateKey(m.startsAt, viewerTz) === tomorrowKey,
    );
    // "Next" = first meeting not clearly over (15-min meetings: anything that
    // started <20 min ago still counts as "now").
    const next =
      meetings.find((m) => new Date(m.startsAt).getTime() > clock - 20 * 60_000) ??
      null;
    return { todays, tomorrows, next };
  }, [meetings, viewerTz, todayKey, tomorrowKey, clock]);

  const list = day === "today" ? todays : tomorrows;

  function toggleInfo(uid: string) {
    setOpenUid((cur) => (cur === uid ? null : uid));
  }

  function nextDayPrefix(m: MeetingView): string {
    const key = dateKey(m.startsAt, viewerTz);
    if (key === todayKey) return "";
    if (key === tomorrowKey) return "tomorrow ";
    return (
      new Intl.DateTimeFormat("en-US", { timeZone: viewerTz, weekday: "short" }).format(
        new Date(m.startsAt),
      ) + " "
    );
  }

  return (
    <section className="mt-6">
      <div className="max-w-2xl rounded-xl bg-white/[0.025] px-4 py-3 ring-1 ring-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
            Meetings
          </h2>
          <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/45 ring-1 ring-white/10">
            {tzLabel} time
          </span>
          <div className="ml-auto flex gap-1.5">
            {(["today", "tomorrow"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                  day === d
                    ? "bg-[#ff8a1a]/15 text-[#ffb371] ring-[#ff8a1a]/25"
                    : "bg-white/[0.05] text-white/60 ring-white/10 hover:bg-white/[0.08]"
                }`}
              >
                {d === "today" ? `Today (${todays.length})` : `Tomorrow (${tomorrows.length})`}
              </button>
            ))}
          </div>
        </div>

        {next ? (
          <>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 pb-2.5">
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Next
              </span>
              <span className="text-[15px] font-semibold text-white">
                {nextDayPrefix(next)}
                {fmtTime(next.startsAt, viewerTz)}
              </span>
              <button
                type="button"
                onClick={() => toggleInfo(next.uid)}
                title="Company info"
                className="min-w-0 truncate text-left text-[13px] text-white/80 underline decoration-white/25 decoration-dotted underline-offset-4 hover:text-[#ffb371]"
              >
                {who(next)}
              </button>
              {now !== null && (
                <span className="text-[12px] font-semibold text-[#ffb371]">
                  {countdown(new Date(next.startsAt).getTime() - clock)}
                </span>
              )}
              {next.joinUrl && (
                <a
                  href={next.joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto rounded-lg bg-[#ff8a1a]/15 px-2.5 py-1 text-[12px] font-semibold text-[#ffb371] ring-1 ring-[#ff8a1a]/25 hover:bg-[#ff8a1a]/25"
                >
                  Join
                </a>
              )}
            </div>
            {openUid === next.uid && <CompanyInfo m={next} />}
            <div className="border-b border-white/8" />
          </>
        ) : (
          <p className="mt-2.5 border-b border-white/8 pb-2.5 text-[13px] text-white/40">
            No upcoming meetings.
          </p>
        )}

        {list.length === 0 ? (
          <p className="pt-2 text-[12px] text-white/35">
            No meetings {day}.
          </p>
        ) : (
          <ul className="max-h-56 divide-y divide-white/5 overflow-y-auto pt-1">
            {list.map((m) => {
              const past = new Date(m.startsAt).getTime() < clock - 20 * 60_000;
              return (
                <li key={m.uid} className="py-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-16 shrink-0 text-[13px] font-semibold ${
                        past ? "text-white/30" : "text-white/85"
                      }`}
                    >
                      {fmtTime(m.startsAt, viewerTz)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleInfo(m.uid)}
                      title="Company info"
                      className={`min-w-0 flex-1 truncate text-left text-[13px] underline decoration-white/20 decoration-dotted underline-offset-4 ${
                        past
                          ? "text-white/30 line-through"
                          : "text-white/70 hover:text-[#ffb371]"
                      }`}
                    >
                      {who(m)}
                      {!m.matched && m.attendee && (
                        <span className="ml-1.5 text-[10px] no-underline text-white/30">
                          no lead match
                        </span>
                      )}
                    </button>
                    {m.joinUrl && !past && (
                      <a
                        href={m.joinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] font-semibold text-white/70 ring-1 ring-white/10 hover:bg-white/[0.08]"
                      >
                        Join
                      </a>
                    )}
                  </div>
                  {openUid === m.uid && (
                    <div className="mt-1.5">
                      <CompanyInfo m={m} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
