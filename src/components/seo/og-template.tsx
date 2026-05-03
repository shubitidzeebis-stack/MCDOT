// Shared Open Graph image template — every page-level opengraph-image.tsx
// passes its eyebrow + headline lines into this and gets back an
// ImageResponse with consistent Veritor branding.
//
// Constraints (per @vercel/og):
//   - display must be "flex" / "block" / "contents" / "none" / "-webkit-box"
//     (no inline-block — use marginLeft/marginRight on text)
//   - 1200×630 fixed (universally supported across WhatsApp, X, FB, etc.)

import { ImageResponse } from "next/og";

export const SIZE = { width: 1200, height: 630 } as const;
export const CONTENT_TYPE = "image/png";

export type OgParams = {
  eyebrow: string;
  headlineLine1: string;
  headlineLine2?: string;
  trustRow?: string[];
};

export function makeOgImage({
  eyebrow,
  headlineLine1,
  headlineLine2,
  trustRow,
}: OgParams) {
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
        {/* Ambient amber glow — bottom-left */}
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

        {/* Top: V/ logo */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            color: "#fff",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 76,
              fontWeight: 900,
              letterSpacing: -3,
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
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 700,
              letterSpacing: -4,
              lineHeight: 0.95,
              color: "#fff",
            }}
          >
            {headlineLine1}
          </div>
          {headlineLine2 && (
            <div
              style={{
                fontSize: 88,
                fontWeight: 300,
                fontStyle: "italic",
                letterSpacing: -4,
                lineHeight: 0.95,
                color: "rgba(255,255,255,0.85)",
                marginTop: 4,
              }}
            >
              {headlineLine2}
            </div>
          )}
        </div>

        {/* Bottom: trust row (optional) */}
        {trustRow && trustRow.length > 0 ? (
          <div
            style={{
              display: "flex",
              gap: 24,
              fontSize: 18,
              color: "rgba(255,255,255,0.65)",
              letterSpacing: 1,
              flexWrap: "wrap",
            }}
          >
            {trustRow.flatMap((item, i) => [
              i > 0 ? (
                <span
                  key={`sep-${i}`}
                  style={{ color: "rgba(255,138,26,0.45)" }}
                >
                  ·
                </span>
              ) : null,
              <span key={i}>{item}</span>,
            ])}
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 14 }}>&nbsp;</div>
        )}
      </div>
    ),
    { ...SIZE },
  );
}
