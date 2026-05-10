// Server component — just layout/copy
export function AreasHeroText() {
  return (
    <section className="relative bg-[#0a0a0b] pt-32 pb-16 md:pt-40 md:pb-20">
      <div className="mx-auto max-w-[1400px] px-5 md:px-6">
        <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] md:text-[11px]">
          Coverage
        </p>
        <h1 className="max-w-[52rem] text-[2.5rem] font-semibold leading-[0.97] tracking-[-0.04em] text-white sm:text-5xl md:text-[3.75rem] lg:text-[5rem]">
          We buy trucking LLCs
          <br />
          <span className="italic font-light text-white/75">
            across America.
          </span>
        </h1>
        <p className="mt-6 max-w-[580px] text-[15px] leading-relaxed text-white/60 md:mt-8 md:text-[17px]">
          All 50 states. 300+ cities. If you own a logistics LLC and you&rsquo;re
          ready to exit — Veritor Group is the direct buyer, not a broker. Wire
          transfer at your bank, 3–5 business days.
        </p>
      </div>
    </section>
  );
}
