import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CheckIcon } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Thanks — your enquiry is in",
  description: "We received your details and will be in touch shortly.",
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  return (
    <>
      <Header locale="en" />
      <main id="main" className="relative flex min-h-[80vh] items-center justify-center pt-16">
        <section className="mx-auto max-w-[640px] px-5 py-20 md:px-6 md:py-28">
          <div className="flex flex-col items-start">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff8a1a]/15 text-[#ff8a1a] ring-1 ring-[#ff8a1a]/30">
              <CheckIcon size={22} />
            </span>
            <h1 className="mt-6 text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl">
              Got it. We&rsquo;re on it.
            </h1>
            <p className="mt-5 max-w-[480px] text-[15px] leading-relaxed text-white/65 md:text-[17px]">
              Thanks for sending your details. A member of our acquisitions team will review
              and come back to you within a few hours during the working week.
            </p>
            <p className="mt-3 max-w-[480px] text-[14px] leading-relaxed text-white/45">
              In the meantime, check your inbox — you should have a confirmation email from us already.
            </p>
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
