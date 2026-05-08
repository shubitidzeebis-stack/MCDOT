import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BreadcrumbSchema, ItemListSchema } from "@/components/seo/Schema";
import { listPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Insights — trucking LLC seller field notes",
  description:
    "Field notes on selling US trucking LLCs — MC authority, Amazon Relay, insurance, FMCSA filings, and owner-operator exits. Written by operators.",
  keywords: [
    "trucking LLC sale blog",
    "Amazon Relay acquisition guide",
    "MC authority transfer guide",
    "owner-operator exit blog",
    "logistics M&A insights",
    "selling trucking business advice",
  ],
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Insights — Veritor Group",
    description: "Long-form field notes on selling US logistics LLCs.",
    url: "/blog",
    images: ["/blog/default-cover.webp"],
  },
};

export default async function BlogIndex() {
  const posts = await listPosts();
  const [latest, ...rest] = posts;

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Insights" }]} />
      <ItemListSchema
        name="Veritor Group — Insights"
        items={posts.map((p) => ({
          name: p.title,
          url: `/blog/${p.slug}`,
          description: p.description,
        }))}
      />
      <Header locale="en" />
      <main id="main" className="relative pt-16">
        <section className="bg-[#0a0a0b] py-16 md:py-20">
          <div className="mx-auto max-w-[1200px] px-5 md:px-6">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] md:text-[11px]">
              Insights
            </p>
            <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl md:text-6xl">
              Field notes from{" "}
              <span className="italic font-light text-white/85">the buy side.</span>
            </h1>
            <p className="mt-6 max-w-[640px] text-[15px] leading-relaxed text-white/65 md:text-[17px]">
              What we&rsquo;ve learned acquiring logistics LLCs across the United States — written
              for the people who own them.
            </p>

            {latest && (
              <Link
                href={`/blog/${latest.slug}`}
                className="group mt-12 block overflow-hidden rounded-2xl ring-1 ring-white/10 transition-all hover:ring-white/25 md:mt-14 md:rounded-3xl"
              >
                <div className="relative aspect-[3/2] w-full md:aspect-[2.4/1]">
                  <Image
                    src={latest.cover}
                    alt={latest.title}
                    fill
                    priority
                    sizes="(min-width: 1200px) 1200px, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b]/95 via-[#0a0a0b]/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#ff8a1a]/40 bg-[#ff8a1a]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ffb371]">
                      Latest
                    </span>
                    <h2 className="mt-4 max-w-[720px] text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] text-white md:text-[2rem]">
                      {latest.title}
                    </h2>
                    <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-white/70 md:text-[15px]">
                      {latest.description}
                    </p>
                    <div className="mt-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-white/50">
                      <time dateTime={latest.publishedAt}>
                        {new Date(latest.publishedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                      <span>·</span>
                      <span>{latest.readMinutes} min</span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {rest.length > 0 && (
              <div className="mt-10 grid gap-5 md:mt-12 md:grid-cols-2 md:gap-6">
                {rest.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl bg-white/[0.025] ring-1 ring-white/10 transition-all hover:ring-white/25 md:rounded-3xl"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden">
                      <Image
                        src={p.cover}
                        alt={p.title}
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-6 md:p-7">
                      <h2 className="text-[1.125rem] font-semibold leading-snug text-white transition-colors group-hover:text-[#ffb371] md:text-[1.25rem]">
                        {p.title}
                      </h2>
                      <p className="text-[14px] leading-relaxed text-white/60">
                        {p.description}
                      </p>
                      <div className="mt-auto flex items-center gap-3 pt-2 text-[11px] uppercase tracking-[0.18em] text-white/40">
                        <time dateTime={p.publishedAt}>
                          {new Date(p.publishedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </time>
                        <span>·</span>
                        <span>{p.readMinutes} min</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {posts.length === 0 && (
              <div className="mt-12 rounded-2xl bg-white/[0.025] p-12 text-center text-sm text-white/55 ring-1 ring-white/10">
                No posts yet — check back soon.
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer locale="en" />
    </>
  );
}
