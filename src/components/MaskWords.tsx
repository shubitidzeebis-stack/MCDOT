"use client";

import { Fragment, useState } from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;
const DURATION = 0.55;

// Mask reveal: text starts hidden below an overflow-cropped mask and
// slides up. Once the slide finishes we switch the mask to
// overflow-visible so italic descenders / curls (S, r, y, italic
// 'less') are no longer clipped.
//
// Default behavior is to reveal the whole line as a single unit — that
// reads as a clean "text appears" beat instead of words popping in one
// by one (which felt laggy at scale). Pass `split="word"` to opt back
// into the cinematic per-word stagger when it's appropriate.

function Mask({
  children,
  delay,
  className,
  ariaLabel,
  ariaHiddenChildren,
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
  ariaLabel?: string;
  ariaHiddenChildren?: boolean;
}) {
  const [done, setDone] = useState(false);
  const props: Record<string, string> = {};
  if (ariaLabel) props["aria-label"] = ariaLabel;
  if (ariaHiddenChildren) props["aria-hidden"] = "true";
  return (
    <span
      {...props}
      className={`relative inline-block pt-[0.2em] pb-[0.3em] align-bottom ${
        done ? "overflow-visible" : "overflow-hidden"
      } ${className ?? ""}`}
    >
      <motion.span
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ delay, duration: DURATION, ease: EASE }}
        onAnimationComplete={() => setDone(true)}
        className="inline-block"
      >
        {children}
      </motion.span>
    </span>
  );
}

export function MaskWords({
  text,
  className,
  delay = 0,
  split = "none",
  stagger = 0.05,
}: {
  text: string;
  className?: string;
  delay?: number;
  split?: "none" | "word";
  stagger?: number;
}) {
  // Default: reveal the whole line as one mask. No per-word stagger.
  if (split === "none") {
    return (
      <Mask delay={delay} className={className} ariaLabel={text}>
        {text}
      </Mask>
    );
  }

  // Cinematic per-word reveal — opt-in.
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <Mask delay={delay + i * stagger} ariaHiddenChildren>
            {word}
          </Mask>
        </Fragment>
      ))}
    </span>
  );
}
