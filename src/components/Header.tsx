"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { LangSwitcher } from "@/components/LangSwitcher";
import { DICT, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

export function Header({ locale = "en" as Locale }: { locale?: Locale }) {
  const t = DICT[locale];
  // Locale-aware sub-page URLs. /about is EN-only (custom long-form
  // copy, not yet translated) — we drop it from the non-EN nav so we
  // don't link Spanish / Russian visitors to English-only pages.
  const prefix = locale === "en" ? "" : `/${locale}`;
  const NAV = [
    { label: t.nav.howItWorks, href: `${prefix}/how-it-works` },
    { label: t.nav.requirements, href: `${prefix}/requirements` },
    { label: t.nav.whyUs, href: `${prefix}/why-veritor` },
    ...(locale === "en"
      ? [{ label: t.nav.about, href: "/about" }]
      : []),
    { label: t.nav.faq, href: `${prefix}/faq` },
  ];

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Drawer keyboard support: Escape closes; Tab/Shift+Tab trap inside.
  // On open, capture the previously-focused element and focus the first
  // link. On close, return focus.
  useEffect(() => {
    if (!open) {
      previouslyFocusedRef.current?.focus?.();
      return;
    }
    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? burgerRef.current;

    const focusFirst = () => {
      const first = drawerRef.current?.querySelector<HTMLElement>("a, button");
      first?.focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'a, button, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-2xl transition-colors duration-300 ${
          scrolled
            ? "bg-[#0a0a0b]/75 border-white/10"
            : "bg-[#0a0a0b]/30 border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 md:px-6">
          <Link
            href={prefix || "/"}
            className="group flex items-center"
            aria-label={`${SITE.name} — home`}
          >
            <Image
              src="/brand/logo-on-dark.png"
              alt={SITE.name}
              width={520}
              height={120}
              priority
              className="h-7 w-auto md:h-8"
            />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative text-[14px] font-medium text-white/75 transition-colors duration-300 hover:text-white"
              >
                {item.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-[#ff8a1a] transition-[width] duration-300 ease-out group-hover:w-full" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <LangSwitcher current={locale} />
            </div>
            <Link
              href={locale === "en" ? "/get-offer" : `${prefix}/get-offer`}
              className="relative hidden overflow-hidden rounded-full border border-[#ff8a1a]/40 bg-[#ff8a1a]/10 px-5 py-2 text-[14px] font-medium text-[#ffb371] backdrop-blur-md transition-all duration-300 hover:border-[#ff8a1a]/70 hover:bg-[#ff8a1a]/20 md:inline-flex"
            >
              <span className="relative z-10">{t.nav.cta}</span>
            </Link>

            <button
              ref={burgerRef}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-drawer"
              onClick={() => setOpen((v) => !v)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] backdrop-blur-md transition-colors hover:bg-white/10 lg:hidden"
            >
              <div className="flex flex-col gap-[5px]">
                <motion.span
                  animate={{ rotate: open ? 45 : 0, y: open ? 6 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="block h-px w-4 bg-white"
                />
                <motion.span
                  animate={{ opacity: open ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                  className="block h-px w-4 bg-white"
                />
                <motion.span
                  animate={{ rotate: open ? -45 : 0, y: open ? -6 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="block h-px w-4 bg-white"
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer"
            ref={drawerRef}
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-[#0a0a0b]/95 backdrop-blur-2xl lg:hidden"
          >
            <nav className="flex h-full flex-col items-start justify-center gap-1 px-8 pt-20">
              {NAV.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{
                    delay: i * 0.04,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block py-2.5 text-3xl font-semibold tracking-tight text-white hover:text-[#ff8a1a]"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: NAV.length * 0.04 + 0.05,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mt-6 flex flex-col gap-3"
              >
                <Link
                  href={locale === "en" ? "/get-offer" : `${prefix}/get-offer`}
                  onClick={() => setOpen(false)}
                  className="inline-flex w-fit rounded-full border border-[#ff8a1a]/50 bg-[#ff8a1a]/10 px-5 py-2.5 text-sm font-medium text-[#ffb371] transition-colors hover:bg-[#ff8a1a]/20"
                >
                  {t.nav.cta} →
                </Link>
                <div>
                  <LangSwitcher current={locale} />
                </div>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
