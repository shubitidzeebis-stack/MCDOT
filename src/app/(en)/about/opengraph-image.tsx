import { CONTENT_TYPE, SIZE, makeOgImage } from "@/components/seo/og-template";

export const dynamic = "force-static";
export const revalidate = false;
export const size = SIZE;
export const contentType = CONTENT_TYPE;
export const alt =
  "Veritor Group — Built by drivers, for owner-operators. About Veritor Group.";

export default function OgImage() {
  return makeOgImage({
    eyebrow: "ABOUT",
    headlineLine1: "Built by drivers.",
    headlineLine2: "For owner-operators.",
    trustRow: [
      "Founded by drivers",
      "Closed at your own bank",
      "In-person bank closing",
      "No fees, no commission",
    ],
  });
}
