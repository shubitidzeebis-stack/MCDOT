"use client";

import { motion } from "framer-motion";
import { SITE } from "@/lib/site";
import { DICT, type Locale } from "@/lib/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;

export function TrustBar({ locale = "en" as Locale }: { locale?: Locale }) {
  const t = DICT[locale].trust;

  const items = [
    { value: SITE.trust.acquisitionsCompleted, label: t.acquisitionsLabel },
    { value: t.closeValue, label: t.closeLabel },
    { value: SITE.trust.yearsActive, label: t.yearsLabel },
  ];

  return (
    <section className="relative border-y border-white/8 bg-[#0a0a0b]/60 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-5 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="grid grid-cols-3 gap-4 py-8 md:gap-10 md:py-10"
        >
          {items.map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-start gap-1 border-l border-white/10 pl-4 md:gap-2 md:pl-6"
            >
              <span className="text-[1.5rem] font-semibold leading-none text-white md:text-[2rem]">
                {item.value}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50 md:text-[11px] md:tracking-[0.28em]">
                {item.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
