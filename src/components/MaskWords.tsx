import { Fragment } from "react";

// Mask reveal: text starts hidden below an overflow-cropped mask and
// slides up via a CSS keyframe (defined in globals.css under
// @keyframes mask-words-rise). Once the slide finishes we leave the
// mask overflow-hidden — italic descender clipping during the 0.55s
// animation is imperceptible.
//
// Why CSS instead of framer-motion: framer-motion's `initial` prop runs
// SSR-side, hiding the H1 until JS hydrates (1–3+ s on slow CPUs). CSS
// animations run on first paint regardless of JS state, so the headline
// is on screen as soon as the page paints. Also drops framer-motion
// from a hot-path component (bundle reduction).
//
// Default behavior is to reveal the whole line as a single unit — that
// reads as a clean "text appears" beat instead of words popping in one
// by one. Pass `split="word"` for per-word stagger.

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
  const props: Record<string, string> = {};
  if (ariaLabel) props["aria-label"] = ariaLabel;
  if (ariaHiddenChildren) props["aria-hidden"] = "true";
  return (
    <span
      {...props}
      className={`relative inline-block overflow-hidden pt-[0.2em] pb-[0.4em] align-bottom ${className ?? ""}`}
    >
      <span
        className="mask-words__inner inline-block"
        style={{ animationDelay: `${delay}s` }}
      >
        {children}
      </span>
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
