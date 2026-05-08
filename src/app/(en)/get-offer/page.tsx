import type { Metadata } from "next";
import { Suspense } from "react";
import { ValuationWizard } from "@/components/ValuationWizard";
import { BreadcrumbSchema, ServiceSchema } from "@/components/seo/Schema";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Get a written offer on your trucking LLC",
  description:
    "Enter your MC or DOT number and get a written valuation range, pulled from FMCSA. No obligation, no listing fees, no commission.",
  alternates: {
    canonical: "/get-offer",
    languages: {
      "en-US": "/get-offer",
      es: "/es/get-offer",
      ru: "/ru/get-offer",
      "x-default": "/get-offer",
    },
  },
  robots: {
    // Indexable — the wizard itself is the SEO landing experience.
    index: true,
    follow: true,
  },
  openGraph: {
    title: `Free valuation — ${SITE.name}`,
    description:
      "Enter your MC or DOT. We pull FMCSA and return a value range. Written offer in 48 hours, in-person close in 3–5 business days.",
    url: "/get-offer",
  },
};

export default function GetOfferPage() {
  return (
    <>
      <ServiceSchema
        name="Free trucking LLC valuation — FMCSA-powered"
        description="Free valuation for US logistics LLCs. Enter MC or DOT number, we pull FMCSA data and return a written value range. Written offer in 48 hours, in-person bank close in 3–5 business days."
        url="/get-offer"
      />
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Get an offer" }]}
      />
      <main id="main">
        <h1 className="sr-only">Get a free valuation — sell your trucking LLC</h1>
        <Suspense fallback={null}>
          <ValuationWizard locale="en" />
        </Suspense>
      </main>
    </>
  );
}
