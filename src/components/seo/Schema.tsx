// JSON-LD schema components — invisible, but high-signal for Google Search,
// AI search engines (Perplexity, ChatGPT search), and rich-result eligibility.
//
// Each component renders a single <script type="application/ld+json">
// containing structured data per schema.org. Use them at the top of pages
// where they apply.

import { SITE } from "@/lib/site";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${BASE_URL}#organization`,
        name: SITE.legalName,
        alternateName: SITE.name,
        url: BASE_URL,
        logo: `${BASE_URL}/brand/logo-color.png`,
        description: SITE.tagline,
        slogan: "Operators buying from operators.",
        knowsAbout: [
          "Logistics LLC acquisition",
          "Amazon Relay carrier acquisitions",
          "MC authority transfer",
          "DOT number transfer",
          "Trucking business sale",
          "Owner-operator exit",
        ],
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: SITE.phoneTel,
            contactType: "Acquisitions",
            email: SITE.email,
            areaServed: "US",
            availableLanguage: ["English", "Spanish", "Russian"],
          },
        ],
        sameAs: [SITE.instagram, SITE.linkedin].filter(Boolean),
        address: {
          "@type": "PostalAddress",
          addressCountry: "US",
        },
      }}
    />
  );
}

export function WebSiteSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${BASE_URL}#website`,
        url: BASE_URL,
        name: SITE.name,
        publisher: { "@id": `${BASE_URL}#organization` },
        inLanguage: ["en-US", "es", "ru"],
      }}
    />
  );
}

export function ServiceSchema({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Service",
        serviceType: "Logistics LLC acquisition",
        provider: { "@id": `${BASE_URL}#organization` },
        name,
        description,
        url: `${BASE_URL}${url}`,
        areaServed: { "@type": "Country", name: "United States" },
        audience: {
          "@type": "Audience",
          audienceType: "Owner-operator trucking LLC owners with or without active Amazon Relay contracts",
        },
        category: [
          "Trucking M&A",
          "Logistics LLC acquisition",
          "Amazon Relay carrier acquisition",
        ],
      }}
    />
  );
}

export function FAQPageSchema({
  items,
}: {
  items: { q: string; a: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      }}
    />
  );
}

export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; url?: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          ...(item.url ? { item: `${BASE_URL}${item.url}` } : {}),
        })),
      }}
    />
  );
}

export function BlogPostingSchema({
  title,
  description,
  slug,
  publishedAt,
  cover,
}: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  cover: string;
}) {
  const url = `${BASE_URL}/blog/${slug}`;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        url,
        headline: title,
        description,
        image: `${BASE_URL}${cover}`,
        datePublished: publishedAt,
        dateModified: publishedAt,
        author: { "@id": `${BASE_URL}#organization` },
        publisher: { "@id": `${BASE_URL}#organization` },
        inLanguage: "en-US",
      }}
    />
  );
}

export function ItemListSchema({
  name,
  items,
}: {
  name: string;
  items: { name: string; url: string; description?: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name,
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          url: `${BASE_URL}${item.url}`,
          ...(item.description ? { description: item.description } : {}),
        })),
      }}
    />
  );
}
