import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { PageHero } from "@/components/PageHero";
import { ContactForm } from "@/components/ContactForm";
import { ALL_STATES, getCity, getState } from "@/lib/areas";
import { AreasFAQAccordion } from "@/components/areas/AreasFAQAccordion";
import { NearbyAreasBar } from "@/components/areas/NearbyAreasBar";
import { AreaServiceSchema, AreaFAQSchema, AreaBreadcrumbSchema } from "@/components/seo/AreaSchema";

export async function generateStaticParams() {
  return ALL_STATES.flatMap((state) =>
    state.cities.map((city) => ({
      state: state.slug,
      city: city.slug,
    }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const cityData = getCity(stateSlug, citySlug);
  const stateData = getState(stateSlug);
  if (!cityData || !stateData) return {};
  return {
    title: cityData.metaTitle,
    description: cityData.metaDescription,
    keywords: cityData.keywords,
    alternates: { canonical: `/areas/${stateSlug}/${citySlug}` },
    openGraph: {
      title: cityData.metaTitle,
      description: cityData.metaDescription,
      url: `/areas/${stateSlug}/${citySlug}`,
    },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state: stateSlug, city: citySlug } = await params;
  const cityData = getCity(stateSlug, citySlug);
  const stateData = getState(stateSlug);
  if (!cityData || !stateData) notFound();

  return (
    <>
      <AreaServiceSchema
        cityName={cityData.name}
        stateName={stateData.name}
        stateSlug={stateSlug}
        citySlug={citySlug}
      />
      <AreaFAQSchema faqs={cityData.faqs} />
      <AreaBreadcrumbSchema
        cityName={cityData.name}
        stateName={stateData.name}
        stateSlug={stateSlug}
      />
      <Header locale="en" />
      <main id="main" className="relative">
        <PageHero
          image="/areas/hero.webp"
          alt={`Highway in ${cityData.name}, ${stateData.abbr} — sell your trucking LLC to Veritor Group`}
          eyebrow={`${stateData.abbr} · ${cityData.name}`}
          headlineLine1={cityData.heroLine1}
          headlineLine2={cityData.heroLine2}
          subhead={cityData.heroSubhead}
        />

        {/* Intro section */}
        <section className="bg-[#0a0a0b] py-16 md:py-24">
          <div className="mx-auto max-w-[1300px] px-5 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12 lg:gap-20">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] mb-5 md:text-[11px]">
                  Selling in {cityData.name}
                </p>
                <div>
                  {cityData.intro.split("\n\n").map((para, i) => (
                    <p key={i} className="text-[15px] md:text-[17px] leading-relaxed text-white/70 mb-5 last:mb-0">
                      {para}
                    </p>
                  ))}
                </div>
                {/* Why sell block */}
                <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] mb-3 md:text-[11px]">
                    The local market
                  </p>
                  <p className="text-[15px] leading-relaxed text-white/65">{cityData.whySell}</p>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-5 h-fit">
                {/* Requirements */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] mb-4 md:text-[11px]">What we need</p>
                  <ul className="space-y-3">
                    {[
                      "Active insurance policy",
                      "Valid MC number",
                      "Company in good standing",
                      "Transfer: LLC, phone, email, bank",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-white/65">
                        <span className="mt-0.5 text-[#ff8a1a] flex-shrink-0">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="/get-offer"
                    className="mt-6 flex w-full items-center justify-center rounded-full border border-[#ff8a1a]/40 bg-[#ff8a1a]/10 px-5 py-3 text-[14px] font-medium text-[#ffb371] transition-all duration-300 hover:border-[#ff8a1a]/70 hover:bg-[#ff8a1a]/20"
                  >
                    Get your offer →
                  </a>
                </div>

                {/* Keywords/topics covered */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] mb-4 md:text-[11px]">We buy</p>
                  <div className="flex flex-wrap gap-2">
                    {["Trucking LLCs", "Amazon Relay carriers", "Fresh MC authority", "Owner-operator exits", "Small fleets", "Sole proprietor DOTs"].map((tag) => (
                      <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/55">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Nearby cities */}
            <NearbyAreasBar
              stateSlug={stateSlug}
              nearbySlugs={cityData.nearbySlugs}
              allCities={stateData.cities}
            />
          </div>
        </section>

        {/* FAQs */}
        <AreasFAQAccordion
          faqs={cityData.faqs}
          heading={`Questions about selling in ${cityData.name}`}
        />

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
