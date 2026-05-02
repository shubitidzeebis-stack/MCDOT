"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MaskWords } from "@/components/MaskWords";
import { MinusIcon, PlusIcon } from "@/components/Icons";
import { DICT, type Locale } from "@/lib/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;

export function FAQ({ locale = "en" as Locale }: { locale?: Locale }) {
  const t = DICT[locale].faq;
  // Track open question by composite key "<categoryId>:<idx>". Null = all closed.
  const [openKey, setOpenKey] = useState<string | null>(null);

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(`faq-cat-${id}`);
    if (!el) return;
    // Offset for the fixed 64px header.
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <section id="faq" className="relative bg-[#0a0a0b] py-20 md:py-28 lg:py-32">
      <div className="mx-auto max-w-[1300px] px-5 md:px-6">
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
              <MaskWords text={t.headline2} delay={0.4} />
            </span>
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.9, delay: 0.9, ease: EASE }}
            className="mt-6 max-w-[640px] text-[15px] leading-relaxed text-white/65 md:mt-8 md:text-[17px]"
          >
            {t.intro}
          </motion.p>
        </div>

        {/* Anchor nav — chips that scroll-jump to each category. Crucial
            with 30+ Q&A: gives users a way to scan categories instead of
            wading through the whole list. */}
        <motion.nav
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.9, delay: 1.1, ease: EASE }}
          aria-label="FAQ categories"
          className="mt-10 flex flex-wrap gap-2 md:mt-12"
        >
          {t.categories.map((cat) => (
            <a
              key={cat.id}
              href={`#faq-cat-${cat.id}`}
              onClick={(e) => handleNavClick(e, cat.id)}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[12px] font-medium text-white/75 backdrop-blur-md transition-colors hover:border-[#ff8a1a]/40 hover:bg-[#ff8a1a]/10 hover:text-[#ffb371] md:px-4 md:py-2 md:text-[13px]"
            >
              {cat.label}
            </a>
          ))}
        </motion.nav>

        <div className="mt-10 flex flex-col gap-10 md:mt-14 md:gap-14">
          {t.categories.map((cat) => (
            <div key={cat.id} id={`faq-cat-${cat.id}`} className="scroll-mt-24">
              <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a] md:mb-5 md:text-[11px]">
                {cat.label}
              </h3>

              <div className="divide-y divide-white/8 rounded-2xl bg-white/[0.025] ring-1 ring-white/10 backdrop-blur-md md:rounded-3xl">
                {cat.questions.map((item, i) => {
                  const key = `${cat.id}:${i}`;
                  const isOpen = openKey === key;
                  return (
                    <div key={key}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${key}`}
                        onClick={() => setOpenKey(isOpen ? null : key)}
                        className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left md:px-7 md:py-6"
                      >
                        <span className="text-[15.5px] font-medium text-white md:text-[17px]">
                          {item.q}
                        </span>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/80 ring-1 ring-white/15">
                          {isOpen ? <MinusIcon /> : <PlusIcon />}
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="content"
                            id={`faq-panel-${key}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: EASE }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-6 pr-14 text-[14.5px] leading-relaxed text-white/70 md:px-7 md:pb-7 md:text-[15.5px]">
                              {item.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

