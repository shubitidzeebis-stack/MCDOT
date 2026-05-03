import type { MetadataRoute } from "next";
import { listPostSlugs } from "@/lib/posts";

const STATIC_ROUTES = [
  { path: "", priority: 1.0 },
  { path: "/how-it-works", priority: 0.85 },
  { path: "/requirements", priority: 0.85 },
  { path: "/why-veritor", priority: 0.7 },
  { path: "/about", priority: 0.6 },
  { path: "/faq", priority: 0.7 },
  { path: "/contact", priority: 0.85 },
  { path: "/blog", priority: 0.7 },
  { path: "/operators-vs-brokers", priority: 0.7 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
  { path: "/es", priority: 0.85 },
  { path: "/ru", priority: 0.85 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(
    ({ path, priority }) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority,
    }),
  );

  // Blog posts — pull from MDX content folder so new posts auto-index.
  const slugs = await listPostSlugs();
  const blogEntries: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...blogEntries];
}
