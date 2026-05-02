"use client";

import { motion } from "framer-motion";
import { MaskWords } from "@/components/MaskWords";
import { DICT, type Locale } from "@/lib/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;

export function WhyVeritor({ locale = "en" as Locale }: { locale?: Locale }) {
  const t = DICT[locale].why;

  return (
    <section className="relative bg-[#0a0a0b] py-20 md:py-28 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-5 md:px-6">
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
              <MaskWords text={t.headline2} delay={0.5} />
            </span>
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:mt-16 md:grid-cols-2">
          {t.points.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.9, delay: i * 0.08, ease: EASE }}
              className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 backdrop-blur-md md:p-8"
            >
              <h3 className="text-[1.125rem] font-semibold leading-tight tracking-[-0.015em] text-white md:text-[1.375rem]">
                {p.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-white/70">
                {p.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
