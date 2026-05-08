// Per-blog-post OG image. Generates a 1200×630 PNG at build time for
// each MDX post — uses the post's title as the headline so when the
// post URL is shared on WhatsApp/X/LinkedIn, the preview shows the
// actual article title rather than the generic blog cover.

import { ImageResponse } from "next/og";
import { getPost, listPostSlugs } from "@/lib/posts";

export const dynamic = "force-static";
export const revalidate = false;
export const size = { width: 1200, height: 630 } as const;
export const contentType = "image/png";
export const alt = "Veritor Group — Insights";

export async function generateStaticParams() {
  const slugs = await listPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function BlogPostOg({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  const title = post?.meta.title ?? "Veritor Group — Insights";

  // Split a long title onto two visual lines at the natural break (the
  // first em-dash, colon, or comma). Falls back to single-line.
  const splitChars = ["—", "–", ":", ",", " - "];
  let line1 = title;
  let line2: string | undefined;
  for (const sep of splitChars) {
    const idx = title.indexOf(sep);
    if (idx > 10 && idx < title.length - 5) {
      line1 = title.slice(0, idx).trim();
      line2 = title.slice(idx + sep.length).trim();
      break;
    }
  }

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
        {/* Ambient amber glow */}
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
              fontSize: 50,
              fontWeight: 900,
              letterSpacing: -2,
            }}
          >
            <span style={{ color: "#fff" }}>V</span>
            <span
              style={{
                color: "#c9a662",
                marginLeft: -6,
                marginRight: -3,
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
              marginLeft: 18,
              fontSize: 12,
              letterSpacing: 6,
              color: "#c9a662",
              fontWeight: 600,
            }}
          >
            INSIGHTS
          </span>
        </div>

        {/* Middle: post title */}
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
            FROM THE BUY SIDE
          </div>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
              color: "#fff",
            }}
          >
            {line1}
          </div>
          {line2 && (
            <div
              style={{
                fontSize: 60,
                fontWeight: 300,
                fontStyle: "italic",
                letterSpacing: -2,
                lineHeight: 1.05,
                color: "rgba(255,255,255,0.85)",
                marginTop: 8,
              }}
            >
              {line2}
            </div>
          )}
        </div>

        {/* Bottom: read time + brand */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontSize: 16,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: 1,
          }}
        >
          <span>{post ? `${post.meta.readMinutes} min read` : "Insights"}</span>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>
            groupveritor.com
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
