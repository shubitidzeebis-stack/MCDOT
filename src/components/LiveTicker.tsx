"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

// Rotating "above the fold" trust strip. Each entry rotates every 5s.
// Entries are deliberately hand-curated rather than DB-derived so they
// stay defensible — a stat we can't substantiate becomes a liability
// once paid traffic is paying attention.
const ENTRIES: Array<{ icon: string; text: string }> = [
  { icon: "🔥", text: "Three deals closed in the last 30 days" },
  { icon: "⚡", text: "Average wire: same business day after signing" },
  { icon: "🛡️", text: "Funds escrowed with attorneys, not direct" },
  { icon: "📞", text: "We respond to every enquiry in under 4 working hours" },
  { icon: "✅", text: "40+ acquisitions completed nationwide" },
];

const ROTATE_MS = 5000;

export function LiveTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % ENTRIES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const current = ENTRIES[index];

  return (
    <section
      aria-label="Recent activity"
      className="relative border-y border-white/8 bg-[#0a0a0b]"
    >
      <div className="mx-auto max-w-[1400px] px-5 md:px-6">
        <div className="flex h-14 items-center justify-center md:h-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="flex items-center gap-3 text-[13px] text-white/70 md:text-[14px]"
            >
              <span aria-hidden className="text-[16px]">
                {current.icon}
              </span>
              <span>{current.text}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
