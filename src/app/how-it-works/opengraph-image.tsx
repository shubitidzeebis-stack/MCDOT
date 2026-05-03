import { CONTENT_TYPE, SIZE, makeOgImage } from "@/components/seo/og-template";

export const dynamic = "force-static";
export const revalidate = false;
export const size = SIZE;
export const contentType = CONTENT_TYPE;
export const alt =
  "Veritor Group — Four steps, two weeks or less. The acquisition process.";

export default function OgImage() {
  return makeOgImage({
    eyebrow: "HOW IT WORKS",
    headlineLine1: "Four steps,",
    headlineLine2: "two weeks or less.",
    trustRow: [
      "Submit details",
      "Written offer in hours",
      "Sign and verify",
      "Wire and close",
    ],
  });
}
