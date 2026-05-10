import { SITE } from "@/lib/site";
import type { AreaFAQ } from "@/lib/areas-types";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function AreaServiceSchema({
  cityName,
  stateName,
  stateSlug,
  citySlug,
}: {
  cityName: string;
  stateName: string;
  stateSlug: string;
  citySlug: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: `Trucking LLC Acquisition in ${cityName}, ${stateName}`,
        serviceType: "Business Acquisition",
        description: `Veritor Group acquires trucking LLCs and logistics companies in ${cityName}, ${stateName}. Direct buyer — not a broker. Wire transfer at closing, 3–5 business days.`,
        provider: {
          "@type": "Organization",
          "@id": `${BASE_URL}#organization`,
          name: SITE.legalName,
          url: BASE_URL,
        },
        areaServed: {
          "@type": "City",
          name: cityName,
          containedInPlace: {
            "@type": "State",
            name: stateName,
            containedInPlace: {
              "@type": "Country",
              name: "United States",
            },
          },
        },
        url: `${BASE_URL}/areas/${stateSlug}/${citySlug}`,
        offers: {
          "@type": "Offer",
          availability: "https://schema.org/InStock",
          description: "Written cash offer within 24 hours. Close in 3–5 business days.",
        },
      }}
    />
  );
}

export function AreaFAQSchema({ faqs }: { faqs: AreaFAQ[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.a,
          },
        })),
      }}
    />
  );
}

export function AreaBreadcrumbSchema({
  cityName,
  stateName,
  stateSlug,
}: {
  cityName: string;
  stateName: string;
  stateSlug: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Areas", item: `${BASE_URL}/areas` },
          { "@type": "ListItem", position: 3, name: stateName, item: `${BASE_URL}/areas/${stateSlug}` },
          { "@type": "ListItem", position: 4, name: cityName },
        ],
      }}
    />
  );
}
