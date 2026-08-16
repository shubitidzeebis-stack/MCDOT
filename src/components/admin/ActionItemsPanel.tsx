"use client";

// Open to-dos extracted from call transcripts by the Quo AI pipeline
// (lib/quo/insights.ts): "send the BoS", "call back Tuesday". Checking one
// off is optimistic — flip locally, POST, roll back on failure. Completed
// items drop out server-side on the next load.

import { useState } from "react";
import type { ActionItemRow } from "@/lib/db/action-items";

const OWNER_STYLE: Record<string, string> = {
  lukas: "bg-[#ff8a1a]/15 text-[#ffb371] ring-[#ff8a1a]/25",
  donnie: "bg-sky-400/10 text-sky-300 ring-sky-400/25",
  seller: "bg-white/[0.06] text-white/70 ring-white/15",
  other: "bg-white/[0.06] text-white/50 ring-white/10",
};

const OWNER_LABEL: Record<string, string> = {
  lukas: "Lukas",
  donnie: "Donnie",
  seller: "Seller",
  other: "Other",
};

export function ActionItemsPanel({ initial }: { initial: ActionItemRow[] }) {
  const [items, setItems] = useState(initial);
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());

  async function toggle(id: number, done: boolean) {
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (done) next.add(id);
      else next.delete(id);
      return next;
    });
    try {
      const res = await fetch("/api/admin/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, done }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
    } catch {
      // Roll back the optimistic flip.
      setDoneIds((prev) => {
        const next = new Set(prev);
        if (done) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
        Action items (from calls)
      </h2>
      <div className="rounded-xl bg-white/[0.025] ring-1 ring-white/10">
        <ul className="divide-y divide-white/8">
          {items.map((item) => {
            const done = doneIds.has(item.id);
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02]"
              >
                <button
                  type="button"
                  onClick={() => toggle(item.id, !done)}
                  aria-label={done ? "Reopen" : "Mark done"}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[12px] ${
                    done
                      ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-300"
                      : "border-white/25 text-transparent hover:border-white/50"
                  }`}
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[13px] ${
                      done ? "text-white/35 line-through" : "text-white/85"
                    }`}
                  >
                    {item.text}
                    {item.due_hint ? (
                      <span className="ml-2 text-[12px] text-[#ffb371]">
                        ({item.due_hint})
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/40">
                    {item.legal_name ?? "Unknown company"}
                    {item.contact_name ? ` · ${item.contact_name}` : ""}
                    {" · "}
                    {new Date(item.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                    OWNER_STYLE[item.owner] ?? OWNER_STYLE.other
                  }`}
                >
                  {OWNER_LABEL[item.owner] ?? item.owner}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
