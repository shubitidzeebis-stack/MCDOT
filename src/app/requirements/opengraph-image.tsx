import { CONTENT_TYPE, SIZE, makeOgImage } from "@/components/seo/og-template";

export const dynamic = "force-static";
export const revalidate = false;
export const size = SIZE;
export const contentType = CONTENT_TYPE;
export const alt =
  "Veritor Group — Clear requirements. No guesswork. What we buy.";

export default function OgImage() {
  return makeOgImage({
    eyebrow: "WHAT WE BUY",
    headlineLine1: "Clear requirements.",
    headlineLine2: "No guesswork.",
    trustRow: [
      "Active Amazon Relay carriers",
      "Or fresh MC under 180 days",
      "Active insurance",
      "Clean violations",
    ],
  });
}
