import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { BreadcrumbSchema } from "@/components/seo/Schema";
import { ALL_STATES } from "@/lib/areas";
import { GlassStateCard } from "@/components/areas/GlassStateCard";
import { AreasHeroText } from "@/components/areas/AreasHeroText";

export const metadata: Metadata = {
  title: "Areas We Cover — Sell Your Trucking LLC Nationwide",
  description: "Veritor Group buys trucking LLCs and logistics companies in all 50 states. Find your state and get a cash offer in 24 hours.",
  keywords: [
    "sell trucking LLC by state",
    "trucking company buyer nationwide",
    "sell logistics LLC near me",
    "trucking LLC acquisition USA",
    "sell Amazon Relay carrier by state",
    "owner operator exit by state",
    "trucking business buyer United States",
  ],
  alternates: { canonical: "/areas" },
  openGraph: {
    title: "Areas We Cover | Veritor Group",
    description: "All 50 states. 300+ cities. Direct buyer — not a broker. Wire transfer at your bank.",
    url: "/areas",
  },
};

export default function AreasPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Areas" }]} />
      <Header locale="en" />
      <main id="main" className="relative">
        <AreasHeroText />

        {/* States grid */}
        <section className="bg-[#0a0a0b] pb-24 md:pb-32">
          <div className="mx-auto max-w-[1400px] px-5 md:px-6">

            {/* Stats bar */}
            <div className="flex flex-wrap gap-8 mb-12 md:mb-16 pb-12 border-b border-white/10">
              {[
                { value: "50", label: "states covered" },
                { value: "300+", label: "cities covered" },
                { value: "400+", label: "LLCs acquired" },
                { value: "3–5 days", label: "average close" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-semibold text-white md:text-4xl">{stat.value}</p>
                  <p className="text-sm text-white/45 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Grid of state cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
              {ALL_STATES.map((state, i) => (
                <GlassStateCard
                  key={state.slug}
                  state={state}
                  href={`/areas/${state.slug}`}
                  index={i}
                />
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-16 md:mt-20 rounded-2xl border border-[#ff8a1a]/20 bg-[#ff8a1a]/[0.04] p-8 md:p-12 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] mb-4 md:text-[11px]">Ready to sell?</p>
              <h2 className="text-2xl font-semibold text-white md:text-3xl mb-4">Don&rsquo;t see your city?</h2>
              <p className="text-[15px] text-white/60 max-w-md mx-auto mb-8">We buy trucking LLCs from all 50 states. If your state isn&rsquo;t listed, we still want to hear from you.</p>
              <Link
                href="/get-offer"
                className="inline-flex rounded-full border border-[#ff8a1a]/40 bg-[#ff8a1a]/10 px-7 py-3 text-[15px] font-medium text-[#ffb371] backdrop-blur-md transition-all duration-300 hover:border-[#ff8a1a]/70 hover:bg-[#ff8a1a]/20"
              >
                Get your offer →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
