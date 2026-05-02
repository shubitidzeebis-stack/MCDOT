import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ContactForm } from "@/components/ContactForm";
import { MobileCTA } from "@/components/MobileCTA";
import { BlogPostingSchema, BreadcrumbSchema } from "@/components/seo/Schema";
import { getPost, listPostSlugs } from "@/lib/posts";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await listPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.meta.title,
    description: post.meta.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.meta.title,
      description: post.meta.description,
      url: `/blog/${slug}`,
      publishedTime: post.meta.publishedAt,
      images: [post.meta.cover],
      authors: ["Veritor Group"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.meta.title,
      description: post.meta.description,
      images: [post.meta.cover],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const { meta, Content } = post;

  return (
    <>
      <BlogPostingSchema
        title={meta.title}
        description={meta.description}
        slug={meta.slug}
        publishedAt={meta.publishedAt}
        cover={meta.cover}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Insights", url: "/blog" },
          { name: meta.title },
        ]}
      />
      <Header locale="en" />
      <main id="main" className="relative pt-16">
        <article className="bg-[#0a0a0b] pb-20 pt-10 md:pb-28 md:pt-14">
          <div className="mx-auto max-w-[1100px] px-5 md:px-6">
            <Link
              href="/blog"
              className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/50 transition-colors hover:text-[#ff8a1a]"
            >
              ← Insights
            </Link>

            <div className="relative mt-6 aspect-[3/2] w-full overflow-hidden rounded-2xl ring-1 ring-white/10 md:aspect-[2.4/1] md:rounded-3xl">
              <Image
                src={meta.cover}
                alt={meta.title}
                fill
                priority
                sizes="(min-width: 1100px) 1100px, 100vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-[820px] px-5 md:mt-14 md:px-6">
            <h1 className="text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-white sm:text-4xl md:text-[2.75rem]">
              {meta.title}
            </h1>
            <div className="mt-4 flex items-center gap-4 text-[12px] uppercase tracking-[0.18em] text-white/40">
              <time dateTime={meta.publishedAt}>
                {new Date(meta.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span>·</span>
              <span>{meta.readMinutes} min read</span>
            </div>

            <div className="blog-body mt-12">
              <Content />
            </div>
          </div>
        </article>

        <ContactForm locale="en" />
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </>
  );
}
