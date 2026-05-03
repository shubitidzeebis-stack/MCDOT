import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Offline",
  description: "You're offline. Reconnect to load Veritor Group.",
  robots: { index: false, follow: false },
};

// Static page rendered when the visitor is offline. Linked to from
// the future service worker (when we add caching). Useful as a brand
// placeholder rather than the browser's default offline page.

export default function OfflinePage() {
  return (
    <>
      <Header locale="en" />
      <main id="main" className="relative flex min-h-[80vh] items-center justify-center pt-16">
        <section className="mx-auto max-w-[640px] px-5 py-20 text-center md:px-6 md:py-28">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] md:text-[11px]">
            You&rsquo;re offline
          </p>
          <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl">
            We&rsquo;ll be here when you&rsquo;re back.
          </h1>
          <p className="mt-6 max-w-[480px] text-[15px] leading-relaxed text-white/65 md:text-[17px]">
            Check your connection and refresh, or reach us directly:
          </p>
          <div className="mt-8 flex flex-col items-center gap-2 text-[14px]">
            <a href={`tel:${SITE.phoneTel}`} className="text-[#ffb371]">
              {SITE.phoneDisplay}
            </a>
            <a href={`mailto:${SITE.email}`} className="text-[#ffb371]">
              {SITE.email}
            </a>
          </div>
        </section>
      </main>
      <Footer locale="en" />
    </>
  );
}
