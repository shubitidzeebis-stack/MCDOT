"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MaskWords } from "@/components/MaskWords";
import { ArrowIcon } from "@/components/Icons";
import { DICT, type Locale } from "@/lib/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;

// To swap the hero image, change this to "/hero/hero2.png" — both are
// staged in /public/hero/.
const HERO_IMAGE = "/hero/hero1.png";

export function Hero({ locale = "en" as Locale }: { locale?: Locale }) {
  const t = DICT[locale].hero;
  const prefix = locale === "en" ? "" : `/${locale}`;

  return (
    <section className="relative isolate flex min-h-[88svh] w-full items-end overflow-hidden md:min-h-[80vh]">
      <div className="absolute inset-0">
        <Image
          src={HERO_IMAGE}
          alt="Veritor Group — clean American semi-truck at golden hour"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* Cinematic overlays — TB&D pattern: subtle fade-in top-to-bottom, plus
          a sideways gradient to keep copy readable wherever the hero photo
          lands brightest. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
        className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b]/55 via-[#0a0a0b]/15 to-[#0a0a0b]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b]/55 via-transparent to-[#0a0a0b]/35" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col px-5 pb-20 pt-32 md:px-6 md:pb-28 md:pt-36">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
          className="mb-4 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#ff8a1a] md:mb-5 md:text-[11px] md:tracking-[0.42em]"
        >
          {t.eyebrow}
        </motion.p>

        <h1 className="max-w-[64rem] text-[2.25rem] font-semibold leading-[0.98] tracking-[-0.04em] text-white sm:text-[2.75rem] md:text-[3.5rem] lg:text-[5rem]">
          <span className="block">
            <MaskWords text={t.headlineLine1} delay={0.7} />
          </span>
          <span className="mt-1 block italic font-light text-white/85">
            <MaskWords text={t.headlineLine2} delay={1.1} />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.7, ease: EASE }}
          className="mt-6 max-w-[640px] text-[15px] leading-relaxed text-white/75 md:mt-8 md:text-lg"
        >
          {t.subhead}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.95, ease: EASE }}
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10"
        >
          <Link
            href={`${prefix}/contact`}
            className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#ff8a1a] py-3 pl-6 pr-3 text-sm font-semibold text-[#0a0a0b] transition-colors duration-300 hover:bg-[#ffb371]"
          >
            <span>{t.ctaPrimary}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0b]/90 text-[#ff8a1a] transition-transform duration-300 group-hover:translate-x-0.5">
              <ArrowIcon />
            </span>
          </Link>
          <Link
            href={`${prefix}/how-it-works`}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10"
          >
            {t.ctaSecondary}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
