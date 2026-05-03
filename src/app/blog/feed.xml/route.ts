// RSS 2.0 feed for the blog. Discoverable via /blog/feed.xml and
// auto-linked from <head> on every blog page. Refreshes whenever a
// new MDX post lands on the next deploy.

import { listPosts } from "@/lib/posts";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";
export const revalidate = false;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://groupveritor.com";
  const posts = await listPosts();

  const items = posts
    .map((p) => {
      const url = `${base}/blog/${p.slug}`;
      return `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <description>${escapeXml(p.description)}</description>
      <author>info@groupveritor.com (${escapeXml(SITE.name)})</author>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.name)} — Insights</title>
    <link>${base}/blog</link>
    <atom:link href="${base}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>Field notes on selling US logistics LLCs, MC authority, Amazon Relay, and owner-operator exits.</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
