import { CONTENT_TYPE, SIZE, makeOgImage } from "@/components/seo/og-template";

export const dynamic = "force-static";
export const revalidate = false;
export const size = SIZE;
export const contentType = CONTENT_TYPE;
export const alt =
  "Veritor Group — Every question we get asked. The full FAQ.";

export default function OgImage() {
  return makeOgImage({
    eyebrow: "FREQUENTLY ASKED",
    headlineLine1: "Every question",
    headlineLine2: "we get asked.",
    trustRow: [
      "39 answers",
      "9 categories",
      "Sourced from real owner-operators",
    ],
  });
}
