import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CheckIcon } from "@/components/Icons";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Unsubscribed",
  description: `Manage your email preferences with ${SITE.name}.`,
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const ok = status === "ok";

  return (
    <>
      <Header locale="en" />
      <main id="main" className="relative flex min-h-[80vh] items-center justify-center pt-16">
        <section className="mx-auto max-w-[640px] px-5 py-20 md:px-6 md:py-28">
          <div className="flex flex-col items-start">
            {ok ? (
              <>
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff8a1a]/15 text-[#ff8a1a] ring-1 ring-[#ff8a1a]/30">
                  <CheckIcon size={22} />
                </span>
                <h1 className="mt-6 text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl">
                  You&rsquo;re unsubscribed.
                </h1>
                <p className="mt-5 max-w-[480px] text-[15px] leading-relaxed text-white/65 md:text-[17px]">
                  We won&rsquo;t send you any more follow-ups. If you ever change your mind,
                  just reply to one of our previous emails and we&rsquo;ll re-add you.
                </p>
                <p className="mt-3 max-w-[480px] text-[14px] leading-relaxed text-white/45">
                  This won&rsquo;t affect a transaction in progress &mdash; we&rsquo;ll still
                  reply to direct messages you send us.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl">
                  That link didn&rsquo;t work.
                </h1>
                <p className="mt-5 max-w-[480px] text-[15px] leading-relaxed text-white/65 md:text-[17px]">
                  The unsubscribe link expired or wasn&rsquo;t valid. Email{" "}
                  <a
                    href={`mailto:${SITE.email}?subject=Unsubscribe`}
                    className="text-[#ffb371] underline-offset-2 hover:underline"
                  >
                    {SITE.email}
                  </a>{" "}
                  with the word &ldquo;unsubscribe&rdquo; in the subject and we&rsquo;ll remove
                  you within one business day.
                </p>
              </>
            )}
            <Link
              href="/"
              className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10"
            >
              ← Back to home
            </Link>
          </div>
        </section>
      </main>
      <Footer locale="en" />
    </>
  );
}
