import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Web app manifest — lets the site be installed as a standalone app on
// mobile home screens and Windows. Icons reference the same /icon and
// /apple-icon Next.js conventions we already ship.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.legalName,
    short_name: SITE.name,
    description: SITE.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    orientation: "portrait",
    categories: ["business", "finance"],
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
