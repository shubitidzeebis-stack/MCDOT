"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { CityData } from "@/lib/areas-types";

type Props = { city: CityData; href: string; index?: number };

export function GlassCityCard({ city, href, index }: Props) {
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
          {/* City name */}
          <p className="text-xl font-semibold text-white">
            {city.name}
          </p>

          {/* Subhead */}
          <p className="text-sm text-white/50 mt-2 line-clamp-2">
            {city.heroSubhead}
          </p>

          {/* View link */}
          <span className="text-xs text-white/30 group-hover:text-[#ff8a1a] transition-colors mt-4 inline-flex items-center gap-1">
            View
            <svg
              width={12}
              height={12}
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
            >
              <path
                d="M2 6h8M6.5 2.5 10 6 6.5 9.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
