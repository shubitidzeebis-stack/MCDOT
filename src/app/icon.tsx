// Dynamic favicon — generates a 32×32 PNG at build time. Black square
// with "V/" mark in white + amber, mirroring the Veritor logo.
// Next.js auto-injects this into <link rel="icon"> for the browser tab.

import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 900,
          fontSize: 18,
          letterSpacing: -1,
        }}
      >
        <span style={{ color: "#fff" }}>V</span>
        <span
          style={{
            color: "#c9a662",
            marginLeft: -2,
            transform: "skewX(-20deg)",
            fontWeight: 700,
          }}
        >
          /
        </span>
      </div>
    ),
    { ...size },
  );
}
