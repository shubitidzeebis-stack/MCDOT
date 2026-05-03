"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { SITE } from "@/lib/site";

const EASE = [0.16, 1, 0.3, 1] as const;
const STORAGE_KEY = "veritor.exit-intent.dismissed";

// Exit-intent modal — fires when the cursor moves toward the top edge
// of the viewport (heading for the close button) on desktop, or after
// 30 seconds of scroll inactivity on mobile (no exit-intent there).
// Shown at most once per session per device.
//
// Conversion lift varies wildly site-to-site; for ad-driven traffic it
// reliably catches 5–15% of would-be bouncers. Toggleable via
// EXIT_INTENT_ENABLED feature flag if you want to A/B test.

export function ExitIntent() {
  const [shown, setShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(STORAGE_KEY)) {
      setDismissed(true);
      return;
    }

    let mobileTimer: ReturnType<typeof setTimeout> | null = null;
    const isCoarsePointer =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;

    function trigger() {
      if (window.sessionStorage.getItem(STORAGE_KEY)) return;
      setShown(true);
    }

    if (isCoarsePointer) {
      // Mobile fallback: 30s of stillness on the page.
      mobileTimer = setTimeout(trigger, 30000);
      // Cancel if user keeps scrolling.
      const reset = () => {
        if (mobileTimer) {
          clearTimeout(mobileTimer);
          mobileTimer = setTimeout(trigger, 30000);
        }
      };
      window.addEventListener("scroll", reset, { passive: true });
      return () => {
        if (mobileTimer) clearTimeout(mobileTimer);
        window.removeEventListener("scroll", reset);
      };
    }

    // Desktop: cursor leaves the viewport from the top edge.
    function onMouseOut(e: MouseEvent) {
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    }
    document.addEventListener("mouseout", onMouseOut);
    return () => document.removeEventListener("mouseout", onMouseOut);
  }, []);

  function close() {
    setShown(false);
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    }
  }

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key="exit-intent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a0a0b]/80 px-4 backdrop-blur-md"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.92, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 12, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[480px] rounded-2xl border border-white/10 bg-[#111113] p-7 shadow-2xl shadow-black/60 md:p-9"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-intent-title"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path
                  d="M2 2 12 12 M12 2 2 12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a]">
              Before you go
            </p>
            <h2
              id="exit-intent-title"
              className="mt-3 text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] text-white md:text-[1.75rem]"
            >
              60-second valuation by text.
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-white/65">
              Skip the form. Text us your MC number and Amazon Relay status, we&rsquo;ll
              come back with a written valuation within hours.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href={`sms:${SITE.phoneTel}?body=${encodeURIComponent(
                  "Hi — I'd like a valuation. MC #: ____. Amazon Relay: yes / no.",
                )}`}
                onClick={close}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff8a1a] px-5 py-3 text-sm font-semibold text-[#0a0a0b] transition-colors hover:bg-[#ffb371]"
              >
                Text us — {SITE.phoneDisplay}
              </a>
              <a
                href={`https://wa.me/${SITE.whatsappTel}?text=${encodeURIComponent(
                  "Hi — I'd like a valuation. MC #: ____. Amazon Relay: yes / no.",
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10"
              >
                Or message on WhatsApp
              </a>
              <Link
                href="#contact"
                onClick={close}
                className="mt-2 inline-flex items-center justify-center text-[13px] text-white/45 underline-offset-2 hover:text-white/75 hover:underline"
              >
                Or stay and fill out the form
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
