"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

// Rotating "above the fold" trust strip. Each entry rotates every 5s.
// Entries are deliberately hand-curated rather than DB-derived so they
// stay defensible — a stat we can't substantiate becomes a liability
// once paid traffic is paying attention.
const ENTRIES: string[] = [
  "Three deals closed in the last 30 days",
  "Average wire: same business day after signing",
  "Funds escrowed with attorneys, not direct",
  "We respond to every enquiry in under 4 working hours",
  "400+ LLCs closed nationwide",
];

const ROTATE_MS = 5000;

export function LiveTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id != null) return;
      id = setInterval(() => {
        setIndex((i) => (i + 1) % ENTRIES.length);
      }, ROTATE_MS);
    };
    const stop = () => {
      if (id != null) {
        clearInterval(id);
        id = null;
      }
    };
    // Pause the rotation when the tab isn't visible — saves CPU on
    // background tabs and avoids INP-stealing animation work while the
    // user is interacting with another page.
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <section
      aria-label="Recent activity"
      className="relative border-y border-white/8 bg-[#0a0a0b]"
    >
      <div className="mx-auto max-w-[1400px] px-5 md:px-6">
        <div className="flex h-14 items-center justify-center md:h-16">
          <AnimatePresence mode="wait">
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="text-[13px] tracking-wide text-white/70 md:text-[14px]"
            >
              {ENTRIES[index]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
