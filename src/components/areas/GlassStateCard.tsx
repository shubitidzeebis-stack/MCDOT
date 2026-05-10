"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { StateData } from "@/lib/areas-types";

type Props = { state: StateData; href: string; index?: number };

export function GlassStateCard({ state, href, index }: Props) {
  const extraCount = state.cities.length > 4 ? state.cities.length - 4 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.5,
        delay: (index ?? 0) * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Link href={href}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 transition-all duration-300 hover:bg-white/[0.07] hover:border-[#ff8a1a]/20 group">
          {/* Top row */}
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a]">
              {state.abbr}
            </span>
            <svg
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
              className="text-white/25 group-hover:text-[#ff8a1a] transition-colors translate-x-0 group-hover:translate-x-0.5"
            >
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* State name */}
          <p className="text-[1.35rem] font-semibold text-white mt-2 leading-tight">
            {state.name}
          </p>

          {/* City count */}
          <p className="text-sm text-white/45 mt-1">
            {state.cities.length} cities covered
          </p>

          {/* City chips */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {state.cities.slice(0, 4).map((city) => (
              <span
                key={city.slug}
                className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] text-white/55 border border-white/[0.06]"
              >
                {city.name}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] text-white/30 border border-white/[0.06]">
                +{extraCount} more
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
