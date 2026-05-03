import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { BreadcrumbSchema } from "@/components/seo/Schema";
import { TESTIMONIALS } from "@/lib/testimonials";

export const metadata: Metadata = {
  title: "Closing stories — sellers we've worked with",
  description:
    "Anonymized stories from owner-operators who sold their LLCs to Veritor Group — Amazon Relay carriers, fresh-MC sellers, multi-LLC owners, deals with active loans.",
  alternates: { canonical: "/case-studies" },
  openGraph: {
    title: "Closing stories — Veritor Group",
    description:
      "What sellers say after closing. Specific scenarios, specific outcomes.",
    url: "/case-studies",
  },
};

export default function CaseStudiesPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Closing stories" }]} />
      <Header locale="en" />
      <main id="main" className="relative pt-16">
        <section className="bg-[#0a0a0b] py-20 md:py-28">
          <div className="mx-auto max-w-[1100px] px-5 md:px-6">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] md:text-[11px]">
              Closing stories
            </p>
            <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl md:text-6xl">
              What sellers say{" "}
              <span className="italic font-light text-white/85">
                after we close.
              </span>
            </h1>
            <p className="mt-6 max-w-[640px] text-[15px] leading-relaxed text-white/65 md:text-[17px]">
              Anonymized to first-name + state at the seller&rsquo;s request. Specifics on
              scenario and outcome so you can find the closest match to your own situation.
            </p>

            <div className="mt-14 flex flex-col gap-5 md:gap-6">
              {TESTIMONIALS.map((t, i) => (
                <article
                  key={i}
                  className="rounded-2xl bg-white/[0.025] p-7 ring-1 ring-white/10 backdrop-blur-md md:p-10"
                >
                  <div className="grid gap-6 md:grid-cols-[1fr_2fr] md:gap-10">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
                        {t.outcome}
                      </p>
                      <p className="mt-3 text-[18px] font-semibold text-white">
                        {t.attribution}
                      </p>
                      <p className="mt-1 text-[13.5px] text-white/55 leading-relaxed">
                        {t.scenario}
                      </p>
                    </div>
                    <blockquote className="text-[15.5px] leading-relaxed text-white/85 md:text-[17px]">
                      <p>&ldquo;{t.headline}&rdquo;</p>
                      {t.body && (
                        <p className="mt-4 text-[14.5px] leading-relaxed text-white/65 md:text-[15.5px]">
                          {t.body}
                        </p>
                      )}
                    </blockquote>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
