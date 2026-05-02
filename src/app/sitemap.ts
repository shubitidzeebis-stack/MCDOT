import type { MetadataRoute } from "next";

const ROUTES = [
  "",
  "/how-it-works",
  "/requirements",
  "/why-veritor",
  "/about",
  "/faq",
  "/contact",
  "/blog",
  "/privacy",
  "/terms",
  "/es",
  "/ru",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = new Date();
  return ROUTES.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1.0 : 0.7,
  }));
}
