"use client";

import { useState } from "react";
import type { OutreachDraftRow } from "@/lib/db/monitor";

// Review queue for cold-acquisition drafts. Edit the subject/body, then
// Approve (sends on the next cron) or Send now. Discard drops the draft.
// Sending is inert until the outreach domain/key are provisioned server-side.

const STAGE_TONE: Record<string, string> = {
  draft: "bg-blue-500/15 text-blue-300 ring-blue-400/20",
  approved: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  failed: "bg-red-500/15 text-red-300 ring-red-400/20",
};

export function OutreachDraftsPanel({
  initial,
  adminKey,
}: {
  initial: OutreachDraftRow[];
  adminKey?: string;
}) {
  const [rows, setRows] = useState<OutreachDraftRow[]>(initial);

  if (rows.length === 0) return null;

  function drop(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }
  function patch(id: number, p: Partial<OutreachDraftRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  return (
    <section className="mt-12">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
        Outreach drafts ({rows.length})
      </h2>
      <div className="space-y-3">
        {rows.map((r) => (
          <DraftCard
            key={r.id}
            row={r}
            adminKey={adminKey}
            onDrop={() => drop(r.id)}
            onPatch={(p) => patch(r.id, p)}
          />
        ))}
      </div>
    </section>
  );
}

function DraftCard({
  row,
  adminKey,
  onDrop,
  onPatch,
}: {
  row: OutreachDraftRow;
  adminKey?: string;
  onDrop: () => void;
  onPatch: (p: Partial<OutreachDraftRow>) => void;
}) {
  const [subject, setSubject] = useState(row.draft_subject ?? "");
  const [body, setBody] = useState(row.draft_body_text ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function act(action: "save" | "approve" | "send_now" | "discard") {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/outreach/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey, id: row.id, action, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Failed.");
        return;
      }
      if (action === "discard") {
        onDrop();
      } else if (action === "save") {
        setMsg("Saved.");
        onPatch({ draft_subject: subject, draft_body_text: body });
      } else {
        const noSender = data.result?.skipped === "no_sender";
        setMsg(
          action === "send_now"
            ? noSender
              ? "Approved — sender not yet configured (will send once outreach domain is set)."
              : "Sent."
            : "Approved — will send on next run.",
        );
        onPatch({ stage: "approved", draft_subject: subject, draft_body_text: body });
      }
    } catch {
      setMsg("Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/10">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">
        <span className="font-semibold text-white">
          {row.legal_name ?? row.dba_name ?? `#${row.valuation_id}`}
        </span>
        <span className="text-white/40">DOT {row.dot_number ?? "—"}</span>
        <span className="text-white/40">· {row.channel}</span>
        <span className="text-white/40">· {row.persona ?? "—"}</span>
        {row.recipient_email && (
          <span className="text-[#ffb371]">· {row.recipient_email}</span>
        )}
        {row.acquisition_score != null && (
          <span className="text-white/40">· score {row.acquisition_score}</span>
        )}
        <span
          className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ${STAGE_TONE[row.stage] ?? "bg-white/[0.06] text-white/55 ring-white/10"}`}
        >
          {row.stage}
        </span>
      </div>

      {row.last_error && (
        <p className="mb-2 text-[12px] text-red-300/80">Last error: {row.last_error}</p>
      )}

      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="mb-2 w-full rounded-lg bg-white/[0.04] px-3 py-2 text-[14px] font-medium text-white ring-1 ring-white/10 focus:outline-none focus:ring-[#ff8a1a]/40"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={7}
        placeholder="Body"
        className="w-full rounded-lg bg-white/[0.04] px-3 py-2 text-[13px] leading-relaxed text-white/90 ring-1 ring-white/10 focus:outline-none focus:ring-[#ff8a1a]/40"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => act("save")}
          className="rounded-lg bg-white/[0.05] px-3 py-1.5 text-[12px] text-white/80 ring-1 ring-white/10 hover:bg-white/[0.08] disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act("approve")}
          className="rounded-lg bg-cyan-500/15 px-3 py-1.5 text-[12px] font-semibold text-cyan-200 ring-1 ring-cyan-400/25 hover:bg-cyan-500/25 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act("send_now")}
          className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[12px] font-semibold text-emerald-200 ring-1 ring-emerald-400/25 hover:bg-emerald-500/30 disabled:opacity-50"
        >
          Send now
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act("discard")}
          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[12px] text-red-300 ring-1 ring-red-400/20 hover:bg-red-500/20 disabled:opacity-50"
        >
          Discard
        </button>
        {msg && <span className="text-[12px] text-white/60">{msg}</span>}
      </div>
    </div>
  );
}
