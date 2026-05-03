"use client";

import { motion } from "framer-motion";
import { MaskWords } from "@/components/MaskWords";
import { TESTIMONIALS } from "@/lib/testimonials";

const EASE = [0.16, 1, 0.3, 1] as const;

// Three-up grid of pull quotes from anonymized sellers. Sits between
// TrustBar and Requirements on the homepage. Designed to feel like a
// magazine pull-quote section, not a "testimonial wall."
export function Testimonials() {
  // Show the first three on the homepage; full set lives on /case-studies.
  const sample = TESTIMONIALS.slice(0, 3);

  return (
    <section className="relative bg-[#0a0a0b] py-20 md:py-28 lg:py-32">
      <div className="mx-auto max-w-[1300px] px-5 md:px-6">
        <div className="max-w-[820px]">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.8, ease: EASE }}
            className="mb-5 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] md:mb-7 md:text-[11px]"
          >
            Sellers we&rsquo;ve worked with
          </motion.p>

          <h2 className="text-[2rem] font-semibold leading-[1] tracking-[-0.035em] text-white sm:text-5xl md:text-6xl lg:text-[4.5rem]">
            <span className="block">
              <MaskWords text="What sellers say" delay={0.05} />
            </span>
            <span className="mt-1 block italic font-light text-white/85">
              <MaskWords text="after we close." delay={0.4} />
            </span>
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:mt-16 md:grid-cols-3 md:gap-6">
          {sample.map((t, i) => (
            <motion.figure
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.9, delay: i * 0.08, ease: EASE }}
              className="flex flex-col rounded-2xl bg-white/[0.025] p-7 ring-1 ring-white/10 backdrop-blur-md md:p-8"
            >
              <span aria-hidden className="mb-4 text-[40px] leading-none text-[#ff8a1a]/80">
                &ldquo;
              </span>
              <blockquote className="flex-1">
                <p className="text-[15.5px] leading-relaxed text-white/85 md:text-[16px]">
                  {t.headline}
                </p>
              </blockquote>
              <figcaption className="mt-6 border-t border-white/10 pt-5">
                <p className="text-[13px] font-semibold text-white">
                  {t.attribution}
                </p>
                <p className="mt-1 text-[12px] text-white/55">{t.scenario}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[#ffb371]">
                  {t.outcome}
                </p>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        <div className="mt-10 flex justify-center md:mt-12">
          <a
            href="/case-studies"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10"
          >
            More closing stories →
          </a>
        </div>
      </div>
    </section>
  );
}
