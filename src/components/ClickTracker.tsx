"use client";

import { useEffect } from "react";
import { fireConversion } from "@/lib/analytics";

// Single capture-phase listener that fires GA4 events (and matching
// Google Ads conversions, if configured) for every tel:, wa.me, and
// mailto: link click anywhere on the site. Saves us from threading an
// onClick into every footer / CTA / direct-channel button.
//
// Uses link.href (resolved) instead of getAttribute('href') so relative
// paths and protocol-relative URLs compare cleanly. Skips clicks where
// defaultPrevented is true (some other handler already swallowed it).

function sourceFor(link: HTMLAnchorElement): string {
  const explicit = link.closest("[data-track-source]")?.getAttribute("data-track-source");
  if (explicit) return explicit;
  // Fallback: best-effort id of the nearest landmark or section.
  const section = link.closest("section,header,footer,nav,dialog,aside");
  const id = section?.getAttribute("id");
  const tag = section?.tagName.toLowerCase();
  if (id) return id;
  if (tag) return tag;
  return "unknown";
}

export function ClickTracker() {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (e.defaultPrevented) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const href = link.href;
      const source = sourceFor(link);
      const page = window.location.pathname;
      if (href.startsWith("tel:") || href.startsWith("sms:")) {
        fireConversion("phone_call_click", { source, page, channel: href.startsWith("sms:") ? "sms" : "call" });
      } else if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(href)) {
        fireConversion("whatsapp_click", { source, page });
      } else if (href.startsWith("mailto:")) {
        fireConversion("email_click", { source, page });
      }
    }
    window.addEventListener("click", handler, { capture: true });
    return () => window.removeEventListener("click", handler, { capture: true });
  }, []);
  return null;
}
