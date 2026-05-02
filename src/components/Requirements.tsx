"use client";

import { motion } from "framer-motion";
import { MaskWords } from "@/components/MaskWords";
import { CheckIcon } from "@/components/Icons";
import { DICT, type Locale } from "@/lib/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;

function Card({
  title,
  items,
  badge,
  i,
}: {
  title: string;
  items: string[];
  badge: string;
  i: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.9, delay: i * 0.1, ease: EASE }}
      className="relative flex flex-col rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 backdrop-blur-md md:rounded-3xl md:p-8"
    >
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#ff8a1a]/40 bg-[#ff8a1a]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ffb371]">
        {badge}
      </span>
      <h3 className="mt-5 text-[1.25rem] font-semibold leading-tight tracking-[-0.02em] text-white md:text-[1.5rem]">
        {title}
      </h3>
      <ul className="mt-6 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-[15px] text-white/80">
            <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff8a1a]/15 text-[#ff8a1a] ring-1 ring-[#ff8a1a]/30">
              <CheckIcon size={11} />
            </span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function Requirements({
  locale = "en" as Locale,
  compact = false,
}: {
  locale?: Locale;
  compact?: boolean;
}) {
  const t = DICT[locale].requirements;

  return (
    <section
      id="requirements"
      className="relative bg-[#0a0a0b] py-20 md:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-[1400px] px-5 md:px-6">
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

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.9, delay: 1.1, ease: EASE }}
              className="mt-6 max-w-[620px] text-[15px] leading-relaxed text-white/65 md:mt-8 md:text-lg"
            >
              {t.intro}
            </motion.p>
          </div>
        )}

        {compact && (
          <p className="max-w-[640px] text-[15px] leading-relaxed text-white/65 md:text-lg">
            {t.intro}
          </p>
        )}

        <div className={`grid gap-5 md:grid-cols-2 md:gap-6 ${compact ? "mt-10 md:mt-12" : "mt-12 md:mt-16"}`}>
          <Card title={t.withRelay.title} items={t.withRelay.items} badge="With Amazon Relay" i={0} />
          <Card title={t.withoutRelay.title} items={t.withoutRelay.items} badge="Without Amazon Relay" i={1} />
        </div>

        {/* Transfer at closing */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 1, delay: 0.2, ease: EASE }}
          className="mt-6 rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 backdrop-blur-md md:rounded-3xl md:p-8"
        >
          <h3 className="text-[1.125rem] font-semibold leading-tight tracking-[-0.015em] text-white md:text-[1.25rem]">
            {t.transferTitle}
          </h3>
          <ul className="mt-5 grid gap-3 md:grid-cols-2 md:gap-x-8">
            {t.transferItems.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[14.5px] text-white/75">
                <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/80 ring-1 ring-white/15">
                  <CheckIcon size={11} />
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
