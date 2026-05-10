"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlusIcon, MinusIcon } from "@/components/Icons";
import type { AreaFAQ } from "@/lib/areas-types";

type Props = { faqs: AreaFAQ[]; heading?: string };

const EASE = [0.16, 1, 0.3, 1] as const;

export function AreasFAQAccordion({ faqs, heading }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="bg-[#0a0a0b] py-16 md:py-24">
      <div className="mx-auto max-w-[1300px] px-5 md:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] mb-5 md:mb-7 md:text-[11px]">
          Common Questions
        </p>
        <h2 className="text-[2rem] font-semibold leading-[1] tracking-[-0.035em] text-white sm:text-4xl md:text-5xl mb-12 md:mb-16">
          {heading ?? "Answers to your questions."}
        </h2>

        <div className="divide-y divide-white/10">
          {faqs.map((faq, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={i}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-area-panel-${i}`}
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span className="text-[15px] md:text-[17px] font-medium text-white">
                    {faq.q}
                  </span>
                  <span className="flex-shrink-0 text-[#ff8a1a]">
                    {isOpen ? <MinusIcon size={20} /> : <PlusIcon size={20} />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      id={`faq-area-panel-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-[15px] leading-relaxed text-white/65 md:text-[16px]">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
