"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CONSENT_STORAGE_KEY,
  DEFAULT_CONSENT,
  hasDecided,
  readConsent,
  writeConsent,
  type ConsentState,
} from "@/lib/consent";

// External-store subscription so we can read consent state synchronously
// without "setState in effect" anti-pattern. Subscribes to both the
// custom in-tab event and the cross-tab storage event.
function subscribeConsent(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === CONSENT_STORAGE_KEY) cb();
  };
  window.addEventListener("veritor:consent", cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("veritor:consent", cb);
    window.removeEventListener("storage", onStorage);
  };
}
const getServerSnapshotConsent = () => DEFAULT_CONSENT;

const EASE = [0.16, 1, 0.3, 1] as const;

// Two-state UI: compact banner (default) + customize panel (expanded).
// Banner only shows if the user hasn't decided yet, OR if `forceOpen` is
// true (used when re-opened from the footer "Cookie preferences" link).

type Props = {
  forceOpen?: boolean;
  onClose?: () => void;
};

export function CookieBanner({ forceOpen = false, onClose }: Props) {
  // Read consent synchronously from external store. SSR returns the
  // default (no decision yet); hydration on the client reads localStorage.
  const consent = useSyncExternalStore(
    subscribeConsent,
    readConsent,
    getServerSnapshotConsent,
  );
  const [autoOpen, setAutoOpen] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Defer the auto-open by 600ms after mount so the banner doesn't pop
  // the moment the page first paints. The setTimeout isn't a setState
  // call (it's an external timer), so it's lint-clean.
  useEffect(() => {
    if (hasDecided(readConsent())) return;
    const t = setTimeout(() => setAutoOpen(true), 600);
    return () => clearTimeout(t);
  }, []);

  const open = !dismissed && (forceOpen || autoOpen);

  function close() {
    setDismissed(true);
    setShowCustomize(false);
    onClose?.();
  }
  function acceptAll() {
    writeConsent({ analytics: true, advertising: true });
    close();
  }
  function rejectAll() {
    writeConsent({ analytics: false, advertising: false });
    close();
  }
  function savePartial(next: { analytics: boolean; advertising: boolean }) {
    writeConsent(next);
    close();
  }


  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cookie-banner"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-banner-title"
          className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-[max(env(safe-area-inset-bottom),1rem)] sm:px-6"
        >
          <div className="mx-auto max-w-[1100px] rounded-2xl border border-white/10 bg-[#0a0a0b]/95 p-5 shadow-2xl shadow-black/60 backdrop-blur-2xl md:p-6">
            {!showCustomize ? (
              <CompactView
                onAccept={acceptAll}
                onReject={rejectAll}
                onCustomize={() => setShowCustomize(true)}
              />
            ) : (
              <CustomizeView
                initial={consent}
                onSave={savePartial}
                onAcceptAll={acceptAll}
                onBack={() => setShowCustomize(false)}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CompactView({
  onAccept,
  onReject,
  onCustomize,
}: {
  onAccept: () => void;
  onReject: () => void;
  onCustomize: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
      <div className="flex-1">
        <h2
          id="cookie-banner-title"
          className="text-[15px] font-semibold text-white md:text-base"
        >
          Cookies and tracking
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/65 md:text-[14px]">
          We use strictly-necessary cookies to make this site work. With your permission we also
          use analytics and (later) advertising cookies to measure how the site performs and to
          show you our ads on other platforms. You can change your choice anytime from the footer.{" "}
          <Link href="/privacy" className="text-[#ffb371] underline-offset-2 hover:underline">
            Read our privacy policy
          </Link>
          .
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 md:flex-col md:items-stretch md:gap-2 lg:flex-row">
        <button
          type="button"
          onClick={onReject}
          className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-[13px] font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10"
        >
          Reject non-essential
        </button>
        <button
          type="button"
          onClick={onCustomize}
          className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-[13px] font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10"
        >
          Customize
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="rounded-full bg-[#ff8a1a] px-5 py-2.5 text-[13px] font-semibold text-[#0a0a0b] transition-colors hover:bg-[#ffb371]"
        >
          Accept all
        </button>
      </div>
    </div>
  );
}

function CustomizeView({
  initial,
  onSave,
  onAcceptAll,
  onBack,
}: {
  initial: ConsentState;
  onSave: (next: { analytics: boolean; advertising: boolean }) => void;
  onAcceptAll: () => void;
  onBack: () => void;
}) {
  const [analytics, setAnalytics] = useState(initial.analytics);
  const [advertising, setAdvertising] = useState(initial.advertising);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[15px] font-semibold text-white md:text-base">
          Cookie preferences
        </h2>
        <button
          type="button"
          onClick={onBack}
          aria-label="Close"
          className="text-white/50 transition-colors hover:text-white"
        >
          ←
        </button>
      </div>
      <div className="mt-4 flex flex-col divide-y divide-white/8 rounded-xl border border-white/10 bg-white/[0.02]">
        <Row
          name="Strictly necessary"
          summary="Required for the site to load, the contact form to submit, and security checks. Always on."
          alwaysOn
          enabled
          onChange={() => {}}
        />
        <Row
          name="Analytics"
          summary="Privacy-respecting page-view counts (Vercel Analytics). Helps us understand which pages perform without identifying you."
          enabled={analytics}
          onChange={setAnalytics}
        />
        <Row
          name="Advertising"
          summary="Conversion tracking and retargeting if we run paid ads (Google Ads, Meta). Off until you opt in."
          enabled={advertising}
          onChange={setAdvertising}
        />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
        <button
          type="button"
          onClick={() => onSave({ analytics, advertising })}
          className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-[13px] font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10"
        >
          Save my choices
        </button>
        <button
          type="button"
          onClick={onAcceptAll}
          className="rounded-full bg-[#ff8a1a] px-5 py-2.5 text-[13px] font-semibold text-[#0a0a0b] transition-colors hover:bg-[#ffb371]"
        >
          Accept all
        </button>
      </div>
    </div>
  );
}

function Row({
  name,
  summary,
  enabled,
  alwaysOn = false,
  onChange,
}: {
  name: string;
  summary: string;
  enabled: boolean;
  alwaysOn?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-4 p-4">
      <div className="flex-1">
        <p className="text-[13px] font-semibold text-white md:text-[14px]">{name}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/55 md:text-[13px]">{summary}</p>
      </div>
      <div className="shrink-0">
        {alwaysOn ? (
          <span className="inline-flex h-6 items-center rounded-full bg-white/[0.08] px-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
            On
          </span>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? "bg-[#ff8a1a]" : "bg-white/15"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
}

// Standalone trigger used in the footer + anywhere else we want a "manage
// cookies" link. Listens to localStorage for cross-tab sync.
export function CookiePreferencesLink({ className }: { className?: string }) {
  const [forceOpen, setForceOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setForceOpen(true)}
        className={className}
      >
        Cookie preferences
      </button>
      {forceOpen && (
        <CookieBanner forceOpen onClose={() => setForceOpen(false)} />
      )}
    </>
  );
}

// Hook for any component that needs to gate its work on a consent
// category — used by AnalyticsGate, future ad pixels, etc.
export function useConsent(): ConsentState {
  return useSyncExternalStore(
    subscribeConsent,
    readConsent,
    getServerSnapshotConsent,
  );
}
