"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowIcon, PhoneIcon } from "@/components/Icons";
import { SITE } from "@/lib/site";
import { DICT, type Locale } from "@/lib/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;
const SHOW_AFTER = 400;

// Pages where the sticky CTA is redundant or distracting.
const HIDDEN_PATHS = [
  "/contact",
  "/get-offer",
  "/thanks",
  "/unsubscribe",
  "/privacy",
  "/terms",
];

export function MobileCTA({ locale = "en" as Locale }: { locale?: Locale }) {
  const t = DICT[locale];
  const pathname = usePathname() ?? "/";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > SHOW_AFTER);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Strip locale prefix so /es/get-offer matches /get-offer.
  const normalized = pathname.replace(/^\/(es|ru)(?=\/|$)/, "") || "/";
  if (HIDDEN_PATHS.some((p) => normalized === p || normalized.startsWith(p + "/"))) {
    return null;
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="fixed inset-x-0 bottom-0 z-40 md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="border-t border-white/10 bg-[#0a0a0b]/85 backdrop-blur-xl">
            <div className="flex items-center gap-2 px-4 py-3">
              <a
                href={`tel:${SITE.phoneTel}`}
                className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm font-medium text-white transition-colors active:bg-white/[0.12]"
                aria-label={`Call ${SITE.name}`}
              >
                <PhoneIcon size={14} />
                <span>{t.contact.callLabel}</span>
              </a>
              <Link
                href={locale === "en" ? "/get-offer" : `/${locale}/get-offer`}
                className="group flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#ff8a1a] px-4 text-sm font-semibold text-[#0a0a0b] transition-colors active:bg-[#ffb371]"
              >
                <span>{t.hero.ctaPrimary}</span>
                <span className="transition-transform group-active:translate-x-0.5">
                  <ArrowIcon />
                </span>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
