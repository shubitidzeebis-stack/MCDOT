"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { MaskWords } from "@/components/MaskWords";

const EASE = [0.16, 1, 0.3, 1] as const;

type Props = {
  image: string;
  alt: string;
  eyebrow: string;
  headlineLine1: string;
  headlineLine2?: string;
  subhead?: string;
  /** Tailwind object-position class — e.g. "object-[90%_50%]" or "object-[50%_30%]". */
  objectPosition?: string;
  priority?: boolean;
};

// Service-page hero — same architecture as the homepage Hero. Full-bleed
// image under a fixed header, two cinematic gradient overlays for legibility,
// copy anchored bottom-left so the photo gets the top-right of the frame.
export function PageHero({
  image,
  alt,
  eyebrow,
  headlineLine1,
  headlineLine2,
  subhead,
  objectPosition = "object-center",
  priority = true,
}: Props) {
  return (
    <section className="relative h-[72svh] min-h-[520px] w-full overflow-hidden md:h-[72vh]">
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={alt}
          fill
          priority={priority}
          fetchPriority={priority ? "high" : "auto"}
          sizes="100vw"
          className={`object-cover ${objectPosition}`}
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b]/60 via-[#0a0a0b]/15 to-[#0a0a0b]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b]/45 via-transparent to-[#0a0a0b]/25" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-end px-5 pb-16 md:px-6 md:pb-24">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: EASE }}
          className="mb-4 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] md:mb-5 md:text-[11px]"
        >
          {eyebrow}
        </motion.p>

        <h1 className="max-w-[58rem] text-[2.25rem] font-semibold leading-[0.98] tracking-[-0.04em] text-white sm:text-[2.75rem] md:text-[3.5rem] lg:text-[4.75rem]">
          <span className="block">
            <MaskWords text={headlineLine1} delay={0.15} />
          </span>
          {headlineLine2 && (
            <span className="mt-1 block italic font-light text-white/85">
              <MaskWords text={headlineLine2} delay={0.32} />
            </span>
          )}
        </h1>

        {subhead && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.55, ease: EASE }}
            className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/75 md:mt-7 md:text-base"
          >
            {subhead}
          </motion.p>
        )}
      </div>
    </section>
  );
}
