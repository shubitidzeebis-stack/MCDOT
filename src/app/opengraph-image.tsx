import { CONTENT_TYPE, SIZE, makeOgImage } from "@/components/seo/og-template";

export const dynamic = "force-static";
export const revalidate = false;
export const size = SIZE;
export const contentType = CONTENT_TYPE;
export const alt =
  "Veritor Group — We buy US logistics LLCs. Closed in 3–5 business days.";

export default function OgImage() {
  return makeOgImage({
    eyebrow: "US LOGISTICS LLC ACQUISITIONS",
    headlineLine1: "Sell your trucking LLC.",
    headlineLine2: "Closed in 3–5 business days.",
    trustRow: [
      "400+ LLCs closed",
      "3–5 day close",
      "Operator-led, not brokers",
      "Nationwide US",
    ],
  });
}
