import type { MetadataRoute } from "next";

// Paths blocked for every crawler — admin, transactional success pages,
// API routes, the unsubscribe link from emails, and the offline fallback.
const DISALLOW = ["/api/", "/thanks", "/es/thanks", "/ru/thanks", "/admin", "/unsubscribe", "/offline"];

// Explicit named rules for AI / search crawlers. Several crawlers
// (notably PerplexityBot and GPTBot) prefer their UA to appear by name
// rather than relying on the catch-all `*` rule. Ordering matters:
// per-bot rules must precede the wildcard fallback.
const NAMED_BOTS = [
  // Citation / inference-time crawlers (highest value — never block these)
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "Claude-Web",
  "Bingbot",
  "Applebot",
  // Training crawlers — the next-gen LLMs build their base knowledge from
  // these. We allow them so Veritor is in future training data.
  "GPTBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Amazonbot",
  "Bytespider",
  "FacebookBot",
];

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";
  return {
    rules: [
      // Per-bot explicit allow rules.
      ...NAMED_BOTS.map((bot) => ({
        userAgent: bot,
        allow: ["/"],
        disallow: DISALLOW,
      })),
      // Catch-all for any crawler not listed above.
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
