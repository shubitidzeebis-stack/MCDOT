import type { Metadata } from "next";
import { ValuationWizard } from "@/components/ValuationWizard";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Get a free valuation — ${SITE.name}`,
  description:
    "Get a written valuation range for your trucking LLC in 90 seconds. Pulled from FMCSA, no obligation, no listing fees, no commissions.",
  alternates: { canonical: "/get-offer" },
  robots: {
    // Indexable — the wizard itself is the SEO landing experience.
    index: true,
    follow: true,
  },
  openGraph: {
    title: `Free valuation in 90 seconds — ${SITE.name}`,
    description:
      "Enter your MC or DOT number. We pull FMCSA, return a value range. Written offer in 48 hours, two-week close.",
    url: "/get-offer",
  },
};

export default function GetOfferPage() {
  return (
    <main id="main">
      <ValuationWizard />
    </main>
  );
}
