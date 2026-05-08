// Tiny MDX post loader. Each post is an MDX file at
// src/content/blog/<slug>.mdx that exports a `meta` object alongside its
// default JSX content.
//
//   export const meta = {
//     title: "...",
//     description: "...",
//     publishedAt: "2026-05-01",
//     readMinutes: 5,
//     cover: "/blog/custom-cover.png",  // optional — falls back to DEFAULT_COVER
//   };

import fs from "node:fs/promises";
import path from "node:path";

const POSTS_DIR = path.join(process.cwd(), "src", "content", "blog");

export const DEFAULT_COVER = "/blog/default-cover.webp";

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  /**
   * Optional. When present and newer than publishedAt, the BlogPosting
   * schema emits this as `dateModified` — a recency signal LLMs and
   * Google use when ranking freshness-sensitive queries.
   */
  modifiedAt?: string;
  readMinutes: number;
  cover: string;
};

type RawMeta = Omit<PostMeta, "slug" | "cover" | "modifiedAt"> & {
  cover?: string;
  modifiedAt?: string;
};

export async function listPostSlugs(): Promise<string[]> {
  try {
    const entries = await fs.readdir(POSTS_DIR);
    return entries
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => f.replace(/\.mdx$/, ""));
  } catch {
    return [];
  }
}

function normalizeMeta(slug: string, raw: RawMeta): PostMeta {
  return {
    slug,
    title: raw.title,
    description: raw.description,
    publishedAt: raw.publishedAt,
    ...(raw.modifiedAt ? { modifiedAt: raw.modifiedAt } : {}),
    readMinutes: raw.readMinutes,
    cover: raw.cover ?? DEFAULT_COVER,
  };
}

export async function listPosts(): Promise<PostMeta[]> {
  const slugs = await listPostSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const mod = await import(`@/content/blog/${slug}.mdx`);
      return normalizeMeta(slug, mod.meta as RawMeta);
    }),
  );
  return posts.sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );
}

export async function getPost(slug: string): Promise<{
  meta: PostMeta;
  Content: React.ComponentType;
} | null> {
  try {
    const mod = await import(`@/content/blog/${slug}.mdx`);
    return {
      meta: normalizeMeta(slug, mod.meta as RawMeta),
      Content: mod.default,
    };
  } catch {
    return null;
  }
}
