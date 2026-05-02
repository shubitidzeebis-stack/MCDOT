"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/i18n";

// Minimal EN · ES · RU pills. Maps the current pathname to its locale
// equivalent — for now, we only have per-locale homes (`/`, `/es`, `/ru`),
// so any non-root path falls back to canonical EN routes.
export function LangSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname() ?? "/";

  function hrefFor(locale: Locale): string {
    if (locale === "en") return "/";
    return `/${locale}`;
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-[11px] backdrop-blur-md"
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((loc) => {
        const isActive = loc === current;
        return (
          <Link
            key={loc}
            href={hrefFor(loc)}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={`px-2.5 py-1 rounded-full font-medium uppercase tracking-[0.16em] transition-colors ${
              isActive
                ? "bg-white/[0.08] text-white"
                : "text-white/55 hover:text-white"
            }`}
          >
            {loc}
          </Link>
        );
      })}
    </div>
  );
}
