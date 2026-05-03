import { CONTENT_TYPE, SIZE, makeOgImage } from "@/components/seo/og-template";

export const dynamic = "force-static";
export const revalidate = false;
export const size = SIZE;
export const contentType = CONTENT_TYPE;
export const alt =
  "Veritor Group — Field notes from the buy side. Insights blog.";

export default function OgImage() {
  return makeOgImage({
    eyebrow: "INSIGHTS",
    headlineLine1: "Field notes",
    headlineLine2: "from the buy side.",
    trustRow: [
      "Selling LLCs",
      "MC authority",
      "Amazon Relay",
      "Owner-operator exits",
    ],
  });
}
