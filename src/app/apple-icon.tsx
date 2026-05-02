// Apple touch icon — 180×180 PNG used when the site is added to an
// iPhone/iPad home screen. Larger / more readable than the favicon.

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontWeight: 900,
            fontSize: 64,
            letterSpacing: -2,
          }}
        >
          <span style={{ color: "#fff" }}>V</span>
          <span
            style={{
              color: "#c9a662",
              marginLeft: -6,
              transform: "skewX(-20deg)",
              fontWeight: 700,
            }}
          >
            /
          </span>
          <span style={{ color: "#fff" }}>ERITOR</span>
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            letterSpacing: 6,
            color: "#c9a662",
            fontWeight: 700,
          }}
        >
          GROUP
        </div>
      </div>
    ),
    { ...size },
  );
}
