import type { MetadataRoute } from "next";
import { listPostSlugs } from "@/lib/posts";

// Hard-coded baseline dates per the SEO audit: emitting `new Date()` on
// every build trains Google to discount the sitemap's freshness signals
// over time. Bump these when content actually changes.
const BASELINE = new Date("2026-05-01");

type LocaleAware = {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  /** True if /es/<path> and /ru/<path> exist as routes. */
  hasLocaleVariants: boolean;
};

// EN-only static routes — no locale tree.
const EN_ONLY: Array<Pick<LocaleAware, "path" | "priority" | "changeFrequency">> = [
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/case-studies", priority: 0.7, changeFrequency: "monthly" },
  { path: "/operators-vs-brokers", priority: 0.7, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

// Routes that exist as EN + ES + RU. The sitemap entry emits hreflang
// alternates for each.
const MULTI_LOCALE: LocaleAware[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly", hasLocaleVariants: true },
  { path: "/how-it-works", priority: 0.85, changeFrequency: "monthly", hasLocaleVariants: true },
  { path: "/requirements", priority: 0.85, changeFrequency: "monthly", hasLocaleVariants: true },
  { path: "/why-veritor", priority: 0.7, changeFrequency: "monthly", hasLocaleVariants: true },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly", hasLocaleVariants: true },
  { path: "/contact", priority: 0.85, changeFrequency: "monthly", hasLocaleVariants: true },
  { path: "/get-offer", priority: 0.95, changeFrequency: "monthly", hasLocaleVariants: true },
];

function buildLanguages(base: string, path: string) {
  return {
    "en-US": `${base}${path}` || base,
    es: `${base}/es${path}`,
    ru: `${base}/ru${path}`,
    "x-default": `${base}${path}` || base,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";

  const enOnlyEntries: MetadataRoute.Sitemap = EN_ONLY.map(
    ({ path, priority, changeFrequency }) => ({
      url: `${base}${path}`,
      lastModified: BASELINE,
      changeFrequency,
      priority,
      alternates: {
        languages: { "x-default": `${base}${path}` },
      },
    }),
  );

  // Each multi-locale path emits THREE entries — one per locale —
  // because Google reads hreflang from the URL it found, and each
  // self-referencing entry needs to declare the full cluster.
  const multiLocaleEntries: MetadataRoute.Sitemap = MULTI_LOCALE.flatMap(
    ({ path, priority, changeFrequency }) => {
      const languages = buildLanguages(base, path);
      const enUrl = `${base}${path}` || base;
      const esUrl = `${base}/es${path}`;
      const ruUrl = `${base}/ru${path}`;
      return [
        {
          url: enUrl,
          lastModified: BASELINE,
          changeFrequency,
          priority,
          alternates: { languages },
        },
        {
          url: esUrl,
          lastModified: BASELINE,
          changeFrequency,
          priority: priority * 0.85,
          alternates: { languages },
        },
        {
          url: ruUrl,
          lastModified: BASELINE,
          changeFrequency,
          priority: priority * 0.85,
          alternates: { languages },
        },
      ];
    },
  );

  // Blog posts — pull from MDX content folder so new posts auto-index.
  const slugs = await listPostSlugs();
  const blogEntries: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: BASELINE,
    changeFrequency: "monthly",
    priority: 0.6,
    alternates: {
      languages: { "x-default": `${base}/blog/${slug}` },
    },
  }));

  return [...multiLocaleEntries, ...enOnlyEntries, ...blogEntries];
}
