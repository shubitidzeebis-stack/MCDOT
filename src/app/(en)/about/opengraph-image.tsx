import { CONTENT_TYPE, SIZE, makeOgImage } from "@/components/seo/og-template";

export const dynamic = "force-static";
export const revalidate = false;
export const size = SIZE;
export const contentType = CONTENT_TYPE;
export const alt =
  "Veritor Group — Operator-led. Acquirer-focused. About Veritor Group.";

export default function OgImage() {
  return makeOgImage({
    eyebrow: "ABOUT",
    headlineLine1: "Operator-led.",
    headlineLine2: "Acquirer-focused.",
    trustRow: [
      "Founded by drivers",
      "400+ LLCs closed",
      "Operate every LLC we buy",
      "Not brokers",
    ],
  });
}
