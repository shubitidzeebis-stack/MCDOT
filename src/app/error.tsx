"use client";

import { useEffect } from "react";

// Global error boundary — Next.js renders this when an uncaught error
// crashes a page render. Branded fallback so users don't see a default
// "Application error" plain-text page.
//
// Note: this file MUST be a client component per Next.js convention.
// The Header/Footer can't be imported here because they may have been
// the source of the error — keep this self-contained.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optional: send to your error-tracking service of choice here.
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
          color: "#fff",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              color: "#ff8a1a",
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            Something went wrong
          </p>
          <h1
            style={{
              fontSize: "2.25rem",
              fontWeight: 600,
              letterSpacing: "-0.035em",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            We&rsquo;re looking into it.
          </h1>
          <p
            style={{
              marginTop: 24,
              fontSize: 15,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.65)",
            }}
          >
            An unexpected error broke this page. The team has been notified
            automatically. You can try again or send us your enquiry directly.
          </p>
          <div
            style={{
              marginTop: 36,
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "12px 24px",
                borderRadius: 9999,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.85)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="mailto:info@groupveritor.com"
              style={{
                padding: "12px 24px",
                borderRadius: 9999,
                background: "#ff8a1a",
                color: "#0a0a0b",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Email info@groupveritor.com
            </a>
          </div>
          {error.digest && (
            <p
              style={{
                marginTop: 28,
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
