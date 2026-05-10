import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { PageHero } from "@/components/PageHero";
import { ContactForm } from "@/components/ContactForm";
import { BreadcrumbSchema } from "@/components/seo/Schema";
import { ALL_STATES, getState } from "@/lib/areas";
import { GlassCityCard } from "@/components/areas/GlassCityCard";
import { AreasFAQAccordion } from "@/components/areas/AreasFAQAccordion";

export async function generateStaticParams() {
  return ALL_STATES.map((s) => ({ state: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = getState(stateSlug);
  if (!state) return {};
  return {
    title: state.metaTitle,
    description: state.metaDescription,
    keywords: state.keywords,
    alternates: { canonical: `/areas/${stateSlug}` },
    openGraph: {
      title: state.metaTitle,
      description: state.metaDescription,
      url: `/areas/${stateSlug}`,
    },
  };
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state: stateSlug } = await params;
  const stateData = getState(stateSlug);
  if (!stateData) notFound();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Areas", url: "/areas" },
          { name: stateData.name },
        ]}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/areas/hero.webp"
          alt={`Trucking highway in ${stateData.name} — sell your logistics LLC to Veritor Group`}
          eyebrow={`${stateData.abbr} · Areas`}
          headlineLine1={stateData.heroLine1}
          headlineLine2={stateData.heroLine2}
          subhead={stateData.heroSubhead}
        />

        {/* State intro */}
        <section className="bg-[#0a0a0b] py-16 md:py-24">
          <div className="mx-auto max-w-[1300px] px-5 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 lg:gap-20">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] mb-5 md:text-[11px]">
                  Selling in {stateData.name}
                </p>
                <div className="prose prose-invert max-w-none">
                  {stateData.intro.split("\n\n").map((para, i) => (
                    <p key={i} className="text-[15px] md:text-[17px] leading-relaxed text-white/70 mb-4 last:mb-0">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
              {/* Quick facts sidebar */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8 h-fit">
                <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] mb-4 md:text-[11px]">Quick facts</p>
                <div className="space-y-4">
                  {[
                    { label: "Cities covered", value: `${stateData.cities.length}` },
                    { label: "Average close", value: "3–5 business days" },
                    { label: "Wire transfer", value: "At your bank" },
                    { label: "Broker fees", value: "None — we're the buyer" },
                  ].map((fact) => (
                    <div key={fact.label} className="flex justify-between items-center py-3 border-b border-white/8 last:border-0">
                      <span className="text-sm text-white/50">{fact.label}</span>
                      <span className="text-sm font-medium text-white">{fact.value}</span>
                    </div>
                  ))}
                </div>
                <a
                  href="/get-offer"
                  className="mt-6 flex w-full items-center justify-center rounded-full border border-[#ff8a1a]/40 bg-[#ff8a1a]/10 px-5 py-3 text-[14px] font-medium text-[#ffb371] transition-all duration-300 hover:border-[#ff8a1a]/70 hover:bg-[#ff8a1a]/20"
                >
                  Get your offer →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Cities grid */}
        <section className="bg-[#0a0a0b] pb-16 md:pb-24">
          <div className="mx-auto max-w-[1300px] px-5 md:px-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] mb-6 md:text-[11px]">
              Cities in {stateData.name}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stateData.cities.map((city, i) => (
                <GlassCityCard
                  key={city.slug}
                  city={city}
                  href={`/areas/${stateSlug}/${city.slug}`}
                  index={i}
                />
              ))}
            </div>
          </div>
        </section>

        {/* State FAQs */}
        <AreasFAQAccordion
          faqs={stateData.faqs}
          heading={`Questions about selling in ${stateData.name}`}
        />

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
