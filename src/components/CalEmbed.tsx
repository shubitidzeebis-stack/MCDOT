"use client";

import { useEffect, useRef } from "react";

// Inline Cal.com embed for the valuation wizard's reveal screen.
//
// We load Cal's embed.js dynamically (no extra package dependency) and
// initialize a namespace per mount. The script tag is shared across
// mounts via a global flag so re-mounting in the same SPA session
// doesn't double-load.
//
// The user's instance is hosted on cal.eu (Cal.com's EU instance), so
// we override origin / embedJsUrl accordingly.

declare global {
  interface Window {
    Cal?: CalGlobal;
  }
}

type CalApi = {
  (action: string, ...args: unknown[]): void;
  q?: unknown[];
  ns?: Record<string, CalApi>;
  loaded?: boolean;
};

type CalGlobal = CalApi & { ns: Record<string, CalApi> };

type Props = {
  /** Cal.com event link without origin. e.g. "lukaveritor/15min" */
  calLink: string;
  /** Origin override — defaults to cal.eu since user's account is there. */
  origin?: string;
  /** Pre-fill values for the booking form. User can still edit. */
  prefill?: {
    name?: string;
    email?: string;
    notes?: string;
    /** Cal.com supports a generic Q&A passthrough. */
    custom?: Record<string, string>;
  };
  /** Use this string as the Cal namespace. Must be unique per page. */
  namespace?: string;
  className?: string;
};

const SCRIPT_URLS: Record<string, string> = {
  "https://cal.eu": "https://app.cal.eu/embed/embed.js",
  "https://cal.com": "https://app.cal.com/embed/embed.js",
};

const SCRIPT_LOAD_STATE = new Map<string, "loading" | "loaded">();

function loadEmbedScript(scriptUrl: string): Promise<void> {
  if (SCRIPT_LOAD_STATE.get(scriptUrl) === "loaded") return Promise.resolve();
  if (SCRIPT_LOAD_STATE.get(scriptUrl) === "loading") {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (SCRIPT_LOAD_STATE.get(scriptUrl) === "loaded") {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }
  SCRIPT_LOAD_STATE.set(scriptUrl, "loading");
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = scriptUrl;
    s.async = true;
    s.onload = () => {
      SCRIPT_LOAD_STATE.set(scriptUrl, "loaded");
      resolve();
    };
    s.onerror = () => {
      SCRIPT_LOAD_STATE.delete(scriptUrl);
      reject(new Error("cal.com embed script failed to load"));
    };
    document.head.appendChild(s);
  });
}

export function CalEmbed({
  calLink,
  origin = "https://cal.eu",
  prefill,
  namespace = "veritor-valuation",
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const scriptUrl = SCRIPT_URLS[origin] ?? SCRIPT_URLS["https://cal.com"];

    async function init() {
      try {
        await loadEmbedScript(scriptUrl);
        if (cancelled) return;

        // The init incantation Cal uses in their copy-paste snippet,
        // adapted to be idempotent. If Cal global doesn't exist (CSP
        // blocked the script for some reason), bail silently.
        const Cal = window.Cal;
        if (!Cal) return;

        // Initialize the namespace if not already
        if (!Cal.ns[namespace]) {
          Cal("init", namespace, { origin });
        }

        // Build prefill query string. Cal.com accepts:
        //  name, email, notes, and custom-named Q&A questions as URL params
        const qs = new URLSearchParams();
        if (prefill?.name) qs.set("name", prefill.name);
        if (prefill?.email) qs.set("email", prefill.email);
        if (prefill?.notes) qs.set("notes", prefill.notes);
        if (prefill?.custom) {
          for (const [k, v] of Object.entries(prefill.custom)) qs.set(k, v);
        }
        const calLinkWithPrefill = qs.toString() ? `${calLink}?${qs.toString()}` : calLink;

        const ns = Cal.ns[namespace];
        if (!ns || !ref.current) return;

        ns("inline", {
          elementOrSelector: ref.current,
          config: { layout: "month_view" },
          calLink: calLinkWithPrefill,
        });

        ns("ui", {
          hideEventTypeDetails: false,
          layout: "month_view",
          theme: "dark",
          styles: {
            branding: { brandColor: "#ff8a1a" },
          },
        });
      } catch (err) {
        console.warn("[CalEmbed] init failed", err);
      }
    }

    init();

    return () => {
      cancelled = true;
      // Clear the embed so re-renders don't stack iframes.
      if (ref.current) ref.current.innerHTML = "";
    };
    // We deliberately don't depend on prefill changing — the wizard
    // only renders this component once per valuation lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calLink, origin, namespace]);

  return (
    <div
      ref={ref}
      className={className ?? "min-h-[640px] w-full overflow-hidden rounded-2xl bg-white/[0.025] ring-1 ring-white/10"}
      style={{ colorScheme: "dark" }}
    />
  );
}
