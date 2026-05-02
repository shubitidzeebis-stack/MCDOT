import type { ReactNode } from "react";

// Wide editorial layout — section heading anchored on the left, body
// content flowing the right column. Wrapped in the same glass-morphism
// card used elsewhere on the site so it matches the Requirements /
// HowItWorks pattern. Stacks on mobile.
//
// Designed to be the canonical container for any long-form prose block
// on a marketing page. Use it instead of the ad-hoc `max-w-[820px]`
// blocks in About / Requirements / HowItWorks so we have one place to
// adjust width / padding / typography.

export function EditorialBlock({
  eyebrow,
  heading,
  children,
}: {
  eyebrow?: string;
  heading: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="relative bg-[#0a0a0b] pb-20 md:pb-28">
      <div className="mx-auto max-w-[1300px] px-5 md:px-6">
        <div className="rounded-2xl bg-white/[0.025] p-6 ring-1 ring-white/10 backdrop-blur-md md:rounded-3xl md:p-12 lg:p-16">
          <div className="grid gap-8 md:grid-cols-12 md:gap-10 lg:gap-16">
            <div className="md:col-span-4">
              {eyebrow && (
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#ff8a1a] md:mb-5 md:text-[11px]">
                  {eyebrow}
                </p>
              )}
              <h2 className="text-[1.625rem] font-semibold leading-[1.05] tracking-[-0.025em] text-white md:text-[2rem] lg:text-[2.25rem]">
                {heading}
              </h2>
            </div>
            <div className="md:col-span-8">
              <div className="blog-body !mt-0">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
