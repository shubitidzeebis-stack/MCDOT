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

// Shared address — used by both Organization and LocalBusiness so they
// stay in sync. Pulls from src/lib/site.ts (single source of truth).
const POSTAL_ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: SITE.address.line1,
  addressLocality: SITE.address.city,
  addressRegion: SITE.address.state,
  postalCode: SITE.address.zip,
  addressCountry: "US",
};

// Named team members — used by OrganizationSchema.employee and rendered
// as Person schema on /about. Keep in lockstep with the visible
// leadership grid.
const EMPLOYEES: Array<{
  name: string;
  jobTitle: string;
  description: string;
  image?: string;
}> = [
  {
    name: "Luka S.",
    jobTitle: "Founder",
    description:
      "Drives every acquisition personally — from the first seller call through the final wire transfer. Decade in owner-operator and small-fleet operations.",
    image: "/about/team-luka.webp",
  },
  {
    name: "Temuka K.",
    jobTitle: "Managing Partner",
    description:
      "Co-leads every acquisition with Luka. Owns the deal pipeline, diligence playbook, and the in-person bank-floor handover that defines a Veritor close.",
    image: "/about/team-managing-partner.jpg",
  },
  {
    name: "Lisa K.",
    jobTitle: "Customer Relations",
    description:
      "Oversees deal flow and diligence. Owns the relationship from accepted offer through wire transfer and FMCSA filings.",
    image: "/about/team-lisa.jpg",
  },
];

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
        address: POSTAL_ADDRESS,
        employee: EMPLOYEES.map((e) => ({
          "@type": "Person",
          name: e.name,
          jobTitle: e.jobTitle,
        })),
      }}
    />
  );
}

// LocalBusiness — required for Google Knowledge Panel, Maps eligibility,
// and AI business-card extraction (Perplexity, ChatGPT search, Gemini).
// FinancialService is the closest matching subtype for an M&A acquirer.
export function LocalBusinessSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": ["LocalBusiness", "FinancialService"],
        "@id": `${BASE_URL}#localbusiness`,
        name: SITE.legalName,
        alternateName: SITE.name,
        url: BASE_URL,
        logo: `${BASE_URL}/brand/logo-color.png`,
        image: `${BASE_URL}/brand/logo-color.png`,
        description:
          "Operator-led acquirer of US logistics LLCs and Amazon Relay carriers. Written offers, average close in 3–5 business days. 400+ LLCs acquired nationwide.",
        telephone: SITE.phoneTel,
        email: SITE.email,
        address: POSTAL_ADDRESS,
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
            ],
            opens: "09:00",
            closes: "18:00",
          },
        ],
        areaServed: { "@type": "Country", name: "United States" },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Logistics LLC acquisition services",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Amazon Relay LLC acquisition",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "MC authority LLC acquisition",
              },
            },
          ],
        },
        parentOrganization: { "@id": `${BASE_URL}#organization` },
        sameAs: [SITE.instagram, SITE.linkedin].filter(Boolean),
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
          audienceType:
            "Owner-operator trucking LLC owners with or without active Amazon Relay contracts",
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

// HowTo schema — used on /how-it-works to enable Google's step-by-step
// rich result + AI HowTo extraction.
export function HowToSchema({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "HowTo",
        name,
        description,
        step: steps.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.name,
          text: s.text,
        })),
      }}
    />
  );
}

// Person — rendered on /about for each named team member. Anchors
// E-E-A-T for Google Quality Raters and lets AI engines build entity
// graphs around named, titled humans tied to the Organization.
export function PersonSchema({
  name,
  jobTitle,
  description,
  image,
}: {
  name: string;
  jobTitle: string;
  description?: string;
  image?: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Person",
        name,
        jobTitle,
        worksFor: { "@id": `${BASE_URL}#organization` },
        ...(description ? { description } : {}),
        ...(image ? { image: `${BASE_URL}${image}` } : {}),
      }}
    />
  );
}

// Render every leadership Person tile as JSON-LD. Convenience wrapper
// so /about can drop a single component and have all five emit at once.
export function LeadershipPersonSchemas() {
  return (
    <>
      {EMPLOYEES.map((e) => (
        <PersonSchema
          key={e.name}
          name={e.name}
          jobTitle={e.jobTitle}
          description={e.description}
          image={e.image}
        />
      ))}
    </>
  );
}

export function BlogPostingSchema({
  title,
  description,
  slug,
  publishedAt,
  modifiedAt,
  cover,
  authorName,
}: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  modifiedAt?: string;
  cover: string;
  authorName?: string;
}) {
  const url = `${BASE_URL}/blog/${slug}`;
  // Default author = founder (until per-post bylines exist). Always
  // emits a Person, never the Organization, so E-E-A-T signal lands.
  const author = authorName
    ? {
        "@type": "Person",
        name: authorName,
        url: `${BASE_URL}/about`,
      }
    : {
        "@type": "Person",
        name: "Luka S.",
        jobTitle: "Founder, Veritor Group",
        url: `${BASE_URL}/about`,
      };
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
        dateModified: modifiedAt ?? publishedAt,
        author,
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

// Speakable — marks summary content for voice/assistive readers.
// Used on the FAQ + homepage. cssSelector points at heading + first
// paragraph blocks the assistant can speak.
export function SpeakableSchema({
  cssSelector,
}: {
  cssSelector: string[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector,
        },
      }}
    />
  );
}
