"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

// Cloudflare Turnstile widget. Loads the CF script once globally and
// renders an explicit-mode widget into the host element so we can
// programmatically read tokens. We use the `managed` mode where most
// real users see nothing (frictionless) and only obvious bots get a
// challenge.

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: (err: unknown) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "flexible" | "compact";
          appearance?: "always" | "execute" | "interaction-only";
          retry?: "auto" | "never";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoadVeritor&render=explicit";
const SCRIPT_ID = "cf-turnstile-script";

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    if (document.getElementById(SCRIPT_ID)) {
      // Script already present — wait for it to expose `turnstile`.
      const i = setInterval(() => {
        if (window.turnstile) {
          clearInterval(i);
          resolve();
        }
      }, 50);
      return;
    }
    (window as Window & { onTurnstileLoadVeritor?: () => void }).onTurnstileLoadVeritor =
      () => resolve();
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  });
  return scriptPromise;
}

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
};

// Imperative handle exposed via ref. Callers can invoke `reset()` after
// consuming a token — Turnstile tokens are single-use, so any flow that
// sends more than one request per page load (e.g. chat) MUST reset
// after each successful send.
export type TurnstileHandle = {
  reset: () => void;
};

export const Turnstile = forwardRef<TurnstileHandle, Props>(function Turnstile(
  { siteKey, onToken, onError, onExpire },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
  }, [onToken, onError, onExpire]);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch {
            // ignore — widget may be unmounted mid-reset
          }
        }
      },
    }),
    [],
  );

  useEffect(() => {
    let mounted = true;
    loadScript().then(() => {
      if (!mounted || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "dark",
        appearance: "interaction-only", // hidden unless CF needs to challenge
        retry: "auto",
        callback: (token) => onTokenRef.current(token),
        "error-callback": () => onErrorRef.current?.(),
        "expired-callback": () => onExpireRef.current?.(),
      });
    });
    return () => {
      mounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, [siteKey]);

  return <div ref={containerRef} aria-hidden className="hidden" />;
});
