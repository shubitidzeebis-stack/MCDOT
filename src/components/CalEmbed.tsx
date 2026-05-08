"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Cal.com embed via direct iframe.
//
// We tried the JS SDK approach but cal.eu 307-redirects to www.cal.eu,
// which interfered with the SDK's origin handshake and left the embed
// container empty. The iframe approach is dumber but more robust:
// load the booking page in a sized iframe with `embed=true`, and the
// redirect resolves transparently inside the iframe.
//
// Cal.com supports `name=`, `email=`, and `notes=` URL params on the
// booking page — these pre-fill the booking form but the user can
// still edit anything before confirming.

type Props = {
  /** Cal event link without origin. e.g. "lukaveritor/15min" */
  calLink: string;
  /** Origin override — typically https://cal.eu or https://cal.com */
  origin?: string;
  /** Pre-fill values for the booking form. */
  prefill?: {
    name?: string;
    email?: string;
    notes?: string;
  };
  className?: string;
  height?: number;
};

export function CalEmbed({
  calLink,
  origin = "https://cal.eu",
  prefill,
  className,
  height = 720,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLIFrameElement>(null);

  const src = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("embed", "true");
    qs.set("theme", "dark");
    if (prefill?.name) qs.set("name", prefill.name);
    if (prefill?.email) qs.set("email", prefill.email);
    if (prefill?.notes) qs.set("notes", prefill.notes);
    // Strip leading/trailing slashes
    const clean = calLink.replace(/^\/+|\/+$/g, "");
    return `${origin}/${clean}?${qs.toString()}`;
  }, [calLink, origin, prefill]);

  // If the iframe takes >12s to fire load, mark the component as
  // timed-out so the fallback "open in new tab" link gets foregrounded.
  // Previously this was a no-op — bug fix.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => {
      if (!loaded) setTimedOut(true);
    }, 12_000);
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <div
      className={
        className ??
        "relative w-full overflow-hidden rounded-2xl bg-white/[0.025] ring-1 ring-white/10"
      }
      style={{ minHeight: height, colorScheme: "dark" }}
    >
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-[12px] text-white/45">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-[#ff8a1a]" />
          <p>{timedOut ? "Calendar slow to load." : "Loading calendar…"}</p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-3 text-[12px] ${timedOut ? "text-[#ffb371]" : "text-white/45"} underline-offset-2 hover:text-white/80 hover:underline`}
          >
            {timedOut ? "Open in a new tab →" : "Open in a new tab if this doesn’t load"}
          </a>
        </div>
      )}
      <iframe
        ref={ref}
        src={src}
        title="Schedule a call with Veritor Group"
        onLoad={() => setLoaded(true)}
        loading="lazy"
        className="block h-full w-full border-0"
        style={{ minHeight: height, opacity: loaded ? 1 : 0, transition: "opacity 0.4s" }}
        allow="payment"
      />
    </div>
  );
}
