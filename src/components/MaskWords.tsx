"use client";

import { Fragment, useState } from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

// Per-word mask reveal. The parent span starts with overflow:hidden so the
// initial y:110% offset is invisible. The moment the word lands at y:0 we
// switch the parent to overflow:visible — otherwise italic descenders /
// curls (S, r, y, italic 'less') get permanently clipped at the bottom of
// the mask box no matter how generous the padding is.

function Word({
  text,
  delay,
}: {
  text: string;
  delay: number;
}) {
  const [done, setDone] = useState(false);
  return (
    <span
      aria-hidden
      className={`relative inline-block pt-[0.2em] pb-[0.3em] align-bottom ${
        done ? "overflow-visible" : "overflow-hidden"
      }`}
    >
      <motion.span
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ delay, duration: 0.55, ease: EASE }}
        onAnimationComplete={() => setDone(true)}
        className="inline-block"
      >
        {text}
      </motion.span>
    </span>
  );
}

export function MaskWords({
  text,
  className,
  delay = 0,
  stagger = 0.05,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <Word text={word} delay={delay + i * stagger} />
        </Fragment>
      ))}
    </span>
  );
}
