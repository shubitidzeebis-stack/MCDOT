"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { fireConversion } from "@/lib/analytics";
import { SITE } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;

const HIDDEN_PATHS = [
  "/contact",
  "/get-offer",
  "/thanks",
  "/unsubscribe",
  "/privacy",
  "/terms",
];

const PREFILL: Record<Locale, { msg: string; label: string }> = {
  en: {
    msg: "Hi Veritor, I'd like to discuss selling my LLC.",
    label: "Chat on WhatsApp",
  },
  es: {
    msg: "Hola Veritor, me gustaría hablar sobre vender mi LLC.",
    label: "Chatear por WhatsApp",
  },
  ru: {
    msg: "Здравствуйте, Veritor — хочу обсудить продажу LLC.",
    label: "Написать в WhatsApp",
  },
};

export function WhatsAppFAB({ locale = "en" as Locale }: { locale?: Locale }) {
  const pathname = usePathname() ?? "/";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Strip locale prefix for the hidden-paths check so /es/get-offer
  // matches /get-offer.
  const normalized = pathname.replace(/^\/(es|ru)(?=\/|$)/, "") || "/";
  if (HIDDEN_PATHS.some((p) => normalized === p || normalized.startsWith(p + "/"))) {
    return null;
  }

  const { msg, label } = PREFILL[locale];
  const href = `https://wa.me/${SITE.whatsappTel}?text=${encodeURIComponent(msg)}`;

  return (
    <AnimatePresence>
      {mounted && (
        <motion.a
          key="whatsapp-fab"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          // Explicit conversion event so this CTA is tracked even if
          // the global ClickTracker misses it (e.g. framer-motion
          // intercepting, or a future regression). data-skip-global-track
          // tells ClickTracker not to double-fire on the same click.
          data-skip-global-track="1"
          onClick={() => {
            fireConversion("whatsapp_click", {
              source: "whatsapp_fab",
              page: pathname,
            });
          }}
          initial={{ y: 24, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.5, ease: EASE }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="group fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#0a0a0b]/90 text-[#ff8a1a] shadow-[0_8px_30px_rgba(255,138,26,0.25)] ring-1 ring-[#ff8a1a]/50 backdrop-blur-xl transition-all duration-300 hover:bg-[#0a0a0b] hover:text-[#ffb371] hover:ring-[#ff8a1a] hover:shadow-[0_12px_40px_rgba(255,138,26,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a1a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b] md:right-6 md:h-[60px] md:w-[60px] md:bottom-6 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)]"
        >
          {/* WhatsApp glyph — official brand mark, single path */}
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-7 w-7 md:h-8 md:w-8"
            fill="currentColor"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884Zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>

          {/* Desktop tooltip on hover */}
          <span className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 whitespace-nowrap rounded-full bg-[#0a0a0b] px-3 py-1.5 text-xs font-medium text-white opacity-0 ring-1 ring-white/15 transition-opacity duration-200 group-hover:opacity-100 lg:block">
            {label}
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}
