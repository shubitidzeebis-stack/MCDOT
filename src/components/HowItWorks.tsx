"use client";

import { motion } from "framer-motion";
import { MaskWords } from "@/components/MaskWords";
import { DICT, type Locale } from "@/lib/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;

export function HowItWorks({
  locale = "en" as Locale,
  compact = false,
}: {
  locale?: Locale;
  compact?: boolean;
}) {
  const t = DICT[locale].how;

  return (
    <section
      id="how-it-works"
      className="relative bg-[#0a0a0b] py-20 md:py-28 lg:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          background:
            "radial-gradient(50% 40% at 80% 0%, rgba(255,138,26,0.08) 0%, rgba(255,138,26,0) 60%)",
        }}
      />
      <div className="relative mx-auto max-w-[1400px] px-5 md:px-6">
        {!compact && (
          <div className="max-w-[820px]">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.8, ease: EASE }}
              className="mb-5 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] md:mb-7 md:text-[11px]"
            >
              {t.eyebrow}
            </motion.p>

            <h2 className="text-[2rem] font-semibold leading-[1] tracking-[-0.035em] text-white sm:text-5xl md:text-6xl lg:text-[4.5rem]">
              <span className="block">
                <MaskWords text={t.headline1} delay={0.05} />
              </span>
              <span className="mt-1 block italic font-light text-white/85">
                <MaskWords text={t.headline2} delay={0.45} />
              </span>
            </h2>
          </div>
        )}

        <ol className={`grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-4 ${compact ? "mt-0" : "mt-12 md:mt-16"}`}>
          {t.steps.map((step, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.9, delay: i * 0.08, ease: EASE }}
              className="relative flex flex-col rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 backdrop-blur-md md:p-7"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
                Step {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-[1.125rem] font-semibold leading-tight tracking-[-0.015em] text-white md:text-[1.25rem]">
                {step.title}
              </h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-white/65">
                {step.body}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
