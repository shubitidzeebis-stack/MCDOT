"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon } from "@/components/Icons";

// Compact MC/DOT entry for content pages: hands the number to /get-offer
// exactly like the homepage Hero does (?kind=&number=), so the wizard
// auto-runs the lookup and the visitor lands on the carrier-confirm step.
// Used by the SEO money pages (/sell-my-trucking-company etc.), where the
// full-screen ValuationWizard can't be embedded mid-article.
export function McQuickForm({ headline }: { headline?: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<"mc" | "dot">("mc");
  const [number, setNumber] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = number.replace(/[^0-9]/g, "");
    if (!clean) return;
    router.push(`/get-offer?kind=${kind}&number=${clean}`);
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl bg-white/[0.04] p-6 ring-1 ring-white/10 md:p-8"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
        Free valuation
      </p>
      <p className="mt-2 text-[17px] font-semibold text-white">
        {headline ?? "See what your company is worth — 90 seconds, no calls."}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setKind("mc")}
            className={`rounded-xl border px-4 py-3 text-[13px] font-semibold transition-all ${
              kind === "mc"
                ? "border-[#ff8a1a]/50 bg-[#ff8a1a]/[0.08] text-white"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
            }`}
          >
            MC
          </button>
          <button
            type="button"
            onClick={() => setKind("dot")}
            className={`rounded-xl border px-4 py-3 text-[13px] font-semibold transition-all ${
              kind === "dot"
                ? "border-[#ff8a1a]/50 bg-[#ff8a1a]/[0.08] text-white"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
            }`}
          >
            DOT
          </button>
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder={kind === "mc" ? "MC-123456" : "USDOT 1234567"}
          aria-label={kind === "mc" ? "Your MC number" : "Your DOT number"}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/35 outline-none transition-all focus:border-[#ff8a1a]/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#ff8a1a]/20"
        />
        <button
          type="submit"
          className="group inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-[#ff8a1a] py-2 pl-5 pr-2 text-sm font-semibold text-[#0a0a0b] transition-all duration-300 hover:bg-[#ffb371]"
        >
          <span>Get my valuation</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0b]/90 text-[#ff8a1a] transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowIcon />
          </span>
        </button>
      </div>
    </form>
  );
}
