import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Branded 404. Next.js routes any unmatched URL here. We deliberately
// keep it warm and route the visitor back to the form rather than
// dead-ending them.

export default function NotFound() {
  return (
    <>
      <Header locale="en" />
      <main id="main" className="relative flex min-h-[80vh] items-center justify-center pt-16">
        <section className="mx-auto max-w-[640px] px-5 py-20 text-center md:px-6 md:py-28">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] md:text-[11px]">
            404 — Not found
          </p>
          <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl md:text-6xl">
            That page <span className="italic font-light text-white/85">doesn&rsquo;t exist.</span>
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-white/65 md:text-[17px]">
            The URL was probably typed wrong, or we moved a page and the link is stale.
            Either way — we&rsquo;d love to hear from you.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10"
            >
              ← Home
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-[#ff8a1a] px-5 py-2.5 text-sm font-semibold text-[#0a0a0b] transition-colors hover:bg-[#ffb371]"
            >
              Get a free LLC valuation
            </Link>
          </div>
        </section>
      </main>
      <Footer locale="en" />
    </>
  );
}
