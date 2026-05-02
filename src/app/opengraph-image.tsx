// Open Graph image — what appears when someone pastes a groupveritor.com
// link into WhatsApp, Slack, Facebook, X, iMessage, LinkedIn, etc.
// 1200×630 is the universally-supported size.
//
// Rendered at request-time by Vercel's edge-side @vercel/og. No font
// registration — uses the bundled sans-serif fallback which renders
// crisp on every platform we tested.

import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const revalidate = false;

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Veritor Group — We buy US logistics LLCs. Closed in under two weeks.";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0b",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Ambient amber glow — top-right */}
        <div
          style={{
            position: "absolute",
            top: -250,
            right: -200,
            width: 800,
            height: 800,
            background:
              "radial-gradient(circle, rgba(255,138,26,0.22) 0%, rgba(255,138,26,0) 70%)",
            display: "flex",
          }}
        />
        {/* Ambient amber glow — bottom-left, softer */}
        <div
          style={{
            position: "absolute",
            bottom: -300,
            left: -200,
            width: 700,
            height: 700,
            background:
              "radial-gradient(circle, rgba(255,138,26,0.10) 0%, rgba(255,138,26,0) 70%)",
            display: "flex",
          }}
        />

        {/* Top: Veritor logo (CSS-rendered, mirrors the brand asset) */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            color: "#fff",
            position: "relative",
          }}
        >
          {/* Gold V slash */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 76,
              fontWeight: 900,
              letterSpacing: -3,
              color: "#fff",
            }}
          >
            <span style={{ color: "#fff" }}>V</span>
            <span
              style={{
                color: "#c9a662",
                marginLeft: -8,
                marginRight: -4,
                transform: "skewX(-20deg)",
                fontWeight: 700,
              }}
            >
              /
            </span>
            <span style={{ color: "#fff" }}>ERITOR</span>
          </div>
          <span
            style={{
              marginLeft: 22,
              fontSize: 16,
              letterSpacing: 8,
              color: "#c9a662",
              fontWeight: 600,
            }}
          >
            GROUP
          </span>
        </div>

        {/* Middle: eyebrow + headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 14,
              letterSpacing: 6,
              fontWeight: 600,
              color: "#ffb371",
              marginBottom: 22,
            }}
          >
            US LOGISTICS LLC ACQUISITIONS
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: -4,
              lineHeight: 0.95,
              color: "#fff",
            }}
          >
            Sell your trucking LLC.
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 300,
              fontStyle: "italic",
              letterSpacing: -4,
              lineHeight: 0.95,
              color: "rgba(255,255,255,0.85)",
              marginTop: 4,
            }}
          >
            Closed in under two weeks.
          </div>
        </div>

        {/* Bottom: trust row */}
        <div
          style={{
            display: "flex",
            gap: 28,
            fontSize: 18,
            color: "rgba(255,255,255,0.65)",
            letterSpacing: 1,
          }}
        >
          <span>40+ acquisitions completed</span>
          <span style={{ color: "rgba(255,138,26,0.45)" }}>·</span>
          <span>Two-week close</span>
          <span style={{ color: "rgba(255,138,26,0.45)" }}>·</span>
          <span>Operator-led, not brokers</span>
          <span style={{ color: "rgba(255,138,26,0.45)" }}>·</span>
          <span>Nationwide US</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
