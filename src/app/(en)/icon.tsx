// Browser tab favicon — 32×32 PNG. Just the V/ monogram. Google's
// search favicon picks the apple-icon (180×180) instead, but this
// covers older browsers and address-bar tabs.

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
          fontWeight: 900,
          fontSize: 22,
          letterSpacing: -1,
          lineHeight: 1,
        }}
      >
        <span style={{ color: "#ffffff" }}>V</span>
        <span
          style={{
            color: "#c9a662",
            marginLeft: -2,
            transform: "skewX(-22deg)",
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
