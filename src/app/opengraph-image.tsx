import { CONTENT_TYPE, SIZE, makeOgImage } from "@/components/seo/og-template";

// Site-wide default OG card. Deliberately lives at the app root rather than
// inside (en)/ — Next only hash-suffixes metadata routes whose parent path
// contains a route group, so from here the URL is a stable `/opengraph-image`
// instead of `/opengraph-image-35z9bs`. That stable URL is what DEFAULT_OG_IMAGE
// in @/lib/site points at, which is how every route group and every page that
// declares its own `openGraph` gets a card image without shipping one.

export const dynamic = "force-static";
export const revalidate = false;
export const size = SIZE;
export const contentType = CONTENT_TYPE;
export const alt =
  "Veritor Group — Sell your trucking company. Closed in 3–5 business days.";

export default function OgImage() {
  return makeOgImage({
    eyebrow: "US TRUCKING COMPANY SALES",
    headlineLine1: "Sell your trucking LLC.",
    headlineLine2: "Closed in 3–5 business days.",
    trustRow: [
      "400+ sales closed",
      "3–5 day close",
      "You keep 100%",
      "Nationwide US",
    ],
  });
}
