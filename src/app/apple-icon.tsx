// Apple touch icon — 180×180 PNG. Used:
//  • iOS / iPadOS home-screen install
//  • Android home-screen install (via the manifest reference)
//  • Google Search picks this up as the site's circular favicon next
//    to the URL — when this rendered the full wordmark, Google's
//    circular crop showed only "ERITO" as a readability disaster.
//
// Now: just the V/ monogram, centered, with breathing room around it
// so any platform's circular crop still shows the full mark.

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
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 110,
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          <span style={{ color: "#ffffff" }}>V</span>
          <span
            style={{
              color: "#c9a662",
              marginLeft: -10,
              transform: "skewX(-22deg)",
              fontWeight: 700,
            }}
          >
            /
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
