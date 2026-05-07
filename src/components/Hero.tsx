"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const router = useRouter();

  // Hero CTA is now an inline MC/DOT lookup. On submit, route to the
  // wizard with kind+number params so step 1 is auto-completed.
  const [kind, setKind] = useState<"mc" | "dot">("mc");
  const [number, setNumber] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = number.replace(/[^0-9]/g, "");
    if (!clean) return;
    const offerPath = locale === "en" ? "/get-offer" : `${prefix}/get-offer`;
    router.push(`${offerPath}?kind=${kind}&number=${clean}`);
  }

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

      {/* Cinematic overlays — gradients render instantly so the dark
          gradient + tint over the photo is always present and readable
          even before the rest of the hero animates in. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b]/55 via-[#0a0a0b]/15 to-[#0a0a0b]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b]/55 via-transparent to-[#0a0a0b]/35" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col px-5 pb-20 pt-32 md:px-6 md:pb-28 md:pt-36">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: EASE }}
          className="mb-4 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#ff8a1a] md:mb-5 md:text-[11px] md:tracking-[0.42em]"
        >
          {t.eyebrow}
        </motion.p>

        <h1 className="max-w-[64rem] text-[2.25rem] font-semibold leading-[0.98] tracking-[-0.04em] text-white sm:text-[2.75rem] md:text-[3.5rem] lg:text-[5rem]">
          <span className="block">
            <MaskWords text={t.headlineLine1} delay={0.15} />
          </span>
          <span className="mt-1 block italic font-light text-white/85">
            <MaskWords text={t.headlineLine2} delay={0.32} />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55, ease: EASE }}
          className="mt-6 max-w-[640px] text-[15px] leading-relaxed text-white/75 md:mt-8 md:text-lg"
        >
          {t.subhead}
        </motion.p>

        {/* Inline MC/DOT lookup form. On submit we redirect to /get-offer
            with kind+number query params, and the wizard auto-runs the
            FMCSA lookup, landing the seller directly on step 2. */}
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.65, ease: EASE }}
          className="mt-8 flex w-full max-w-2xl flex-col gap-3 md:mt-10"
        >
          <div className="flex flex-col gap-2 rounded-2xl bg-white/[0.05] p-2 ring-1 ring-white/15 backdrop-blur-md sm:flex-row sm:items-center sm:gap-1 sm:rounded-full">
            <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1">
              <button
                type="button"
                onClick={() => setKind("mc")}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                  kind === "mc"
                    ? "bg-[#ff8a1a] text-[#0a0a0b]"
                    : "text-white/55 hover:text-white"
                }`}
              >
                {t.lookupMc}
              </button>
              <button
                type="button"
                onClick={() => setKind("dot")}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                  kind === "dot"
                    ? "bg-[#ff8a1a] text-[#0a0a0b]"
                    : "text-white/55 hover:text-white"
                }`}
              >
                {t.lookupDot}
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder={kind === "mc" ? t.lookupMcPlaceholder : t.lookupDotPlaceholder}
              aria-label={kind === "mc" ? t.lookupMc : t.lookupDot}
              className="flex-1 bg-transparent px-3 py-2.5 text-[15px] text-white placeholder:text-white/40 outline-none"
            />
            <button
              type="submit"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#ff8a1a] px-5 py-2.5 text-sm font-semibold text-[#0a0a0b] transition-colors hover:bg-[#ffb371]"
            >
              <span>{t.lookupCta}</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0a0a0b]/90 text-[#ff8a1a] transition-transform group-hover:translate-x-0.5">
                <ArrowIcon />
              </span>
            </button>
          </div>
          <div className="flex items-center gap-3 px-2 text-[12px] text-white/55">
            <span>{t.lookupHelper}</span>
            <span className="text-white/20">·</span>
            <Link
              href={`${prefix}/how-it-works`}
              className="text-white/65 underline-offset-4 hover:text-white hover:underline"
            >
              {t.ctaSecondary}
            </Link>
          </div>
        </motion.form>
      </div>
    </section>
  );
}
