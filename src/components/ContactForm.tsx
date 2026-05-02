"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MaskWords } from "@/components/MaskWords";
import { HoneypotField } from "@/components/HoneypotField";
import {
  ArrowIcon,
  ChevronIcon,
  MailIcon,
  PhoneIcon,
  WhatsAppIcon,
} from "@/components/Icons";
import { DICT, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

const EASE = [0.16, 1, 0.3, 1] as const;

type FormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  mc: string;
  hasRelay: "" | "yes" | "no";
  mcAgeDays: string;
  insurance: "" | "active" | "inactive";
  state: string;
  notes: string;
  website: string; // honeypot
};

function DirectChannel({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="group flex items-center gap-4 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.06] hover:ring-white/20"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff8a1a]/10 text-[#ff8a1a] ring-1 ring-[#ff8a1a]/25">
        {icon}
      </span>
      <div className="flex flex-1 flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/45">
          {label}
        </span>
        <span className="mt-0.5 text-[15px] font-medium text-white md:text-base">
          {value}
        </span>
      </div>
      <span className="text-white/35 transition-all group-hover:translate-x-0.5 group-hover:text-[#ff8a1a]">
        <ArrowIcon />
      </span>
    </a>
  );
}

export function ContactForm({ locale = "en" as Locale }: { locale?: Locale }) {
  const t = DICT[locale].contact;
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    company: "",
    mc: "",
    hasRelay: "",
    mcAgeDays: "",
    insurance: "",
    state: "",
    notes: "",
    website: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const update =
    <K extends keyof FormState>(key: K) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value as FormState[K] }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t.error);
      }
      // Redirect to thanks page (so we can fire ad conversion pixels later).
      router.push("/thanks");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : t.error);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/35 outline-none transition-all focus:border-[#ff8a1a]/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#ff8a1a]/20";

  const labelClass =
    "text-[11px] font-medium uppercase tracking-[0.22em] text-white/55";

  return (
    <section id="contact" className="relative bg-[#0a0a0b] py-20 md:py-28 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-5 md:px-6">
        <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20">
          {/* Left: headline + direct channels */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.8, ease: EASE }}
              className="mb-5 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] md:mb-7 md:text-[11px]"
            >
              {t.eyebrow}
            </motion.p>

            <h2 className="text-[2rem] font-semibold leading-[1] tracking-[-0.035em] text-white sm:text-5xl md:text-6xl lg:text-[4.25rem]">
              <span className="block">
                <MaskWords text={t.headline1} delay={0.1} />
              </span>
              <span className="mt-1 block italic font-light text-white/85">
                <MaskWords text={t.headline2} delay={0.45} />
              </span>
            </h2>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.9, delay: 1, ease: EASE }}
              className="mt-6 max-w-[460px] text-[15px] leading-relaxed text-white/65 md:mt-8 md:text-[17px]"
            >
              {t.intro}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 1, delay: 1.3, ease: EASE }}
              className="mt-8 flex flex-col gap-3 md:mt-10"
            >
              <DirectChannel
                href={`tel:${SITE.phoneTel}`}
                icon={<PhoneIcon />}
                label={t.callLabel}
                value={SITE.phoneDisplay}
              />
              <DirectChannel
                href={`mailto:${SITE.email}`}
                icon={<MailIcon />}
                label={t.emailLabel}
                value={SITE.email}
              />
              <DirectChannel
                href={`https://wa.me/${SITE.whatsappTel}`}
                icon={<WhatsAppIcon />}
                label={t.whatsappLabel}
                value={t.whatsappValue}
              />
            </motion.div>
          </div>

          {/* Right: form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 1, ease: EASE }}
            className="relative rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 backdrop-blur-md md:rounded-3xl md:p-10"
          >
            <form onSubmit={handleSubmit} className="relative flex flex-col gap-4">
              <HoneypotField value={form.website} onChange={update("website")} />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className={labelClass}>{t.name} *</span>
                  <input
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={update("name")}
                    className={inputClass}
                    placeholder="Jane Smith"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={labelClass}>{t.email} *</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={update("email")}
                    className={inputClass}
                    placeholder="you@company.com"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className={labelClass}>{t.phone} *</span>
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={update("phone")}
                    className={inputClass}
                    placeholder="(555) 555-1234"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={labelClass}>{t.company}</span>
                  <input
                    autoComplete="organization"
                    value={form.company}
                    onChange={update("company")}
                    className={inputClass}
                    placeholder="—"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className={labelClass}>{t.mc}</span>
                  <input
                    value={form.mc}
                    onChange={update("mc")}
                    className={inputClass}
                    placeholder="MC-123456"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={labelClass}>{t.state}</span>
                  <input
                    autoComplete="address-level1"
                    value={form.state}
                    onChange={update("state")}
                    className={inputClass}
                    placeholder="CA, TX, NY…"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className={labelClass}>{t.relayQ}</span>
                <div className="relative">
                  <select
                    value={form.hasRelay}
                    onChange={update("hasRelay")}
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    <option value="" className="bg-[#0a0a0b]">Select…</option>
                    <option value="yes" className="bg-[#0a0a0b]">{t.relayYes}</option>
                    <option value="no" className="bg-[#0a0a0b]">{t.relayNo}</option>
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                    <ChevronIcon />
                  </span>
                </div>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className={labelClass}>{t.insurance}</span>
                  <div className="relative">
                    <select
                      value={form.insurance}
                      onChange={update("insurance")}
                      className={`${inputClass} appearance-none pr-10`}
                    >
                      <option value="" className="bg-[#0a0a0b]">Select…</option>
                      <option value="active" className="bg-[#0a0a0b]">{t.insuranceActive}</option>
                      <option value="inactive" className="bg-[#0a0a0b]">{t.insuranceInactive}</option>
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                      <ChevronIcon />
                    </span>
                  </div>
                </label>
                {form.hasRelay === "no" && (
                  <label className="flex flex-col gap-2">
                    <span className={labelClass}>{t.mcAge}</span>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.mcAgeDays}
                      onChange={update("mcAgeDays")}
                      className={inputClass}
                      placeholder="120"
                    />
                  </label>
                )}
              </div>

              <label className="flex flex-col gap-2">
                <span className={labelClass}>{t.notes}</span>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={update("notes")}
                  className={`${inputClass} resize-none`}
                  placeholder=""
                />
              </label>

              {status === "error" && (
                <p className="text-sm text-red-400" role="alert">{errorMsg}</p>
              )}

              {/* TCPA + e-SIGN consent block. Required at point of collection
                  to capture consent for automated phone/SMS/email/WhatsApp
                  contact and for electronic-signature treatment of the
                  submission. Plain language so it's a real notice, not
                  legal-fine-print theater. */}
              <p className="mt-2 text-[11.5px] leading-relaxed text-white/45">
                By clicking &ldquo;{t.submit}&rdquo; you confirm the information you submitted
                is accurate, you have authority to share it, and you consent to receive
                phone calls, text messages, emails, and WhatsApp messages from {SITE.name}{" "}
                about your enquiry, including via automated technology. Consent is not a
                condition of any purchase. Message and data rates may apply. Reply STOP to
                opt out of texts at any time. You also agree to our{" "}
                <Link href="/privacy" className="text-white/70 underline underline-offset-2 hover:text-white">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/terms" className="text-white/70 underline underline-offset-2 hover:text-white">
                  Terms of Use
                </Link>
                .
              </p>

              <div className="mt-2 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] text-white/40 sm:max-w-[320px]">
                  {t.privacyNote}
                </p>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="group inline-flex items-center gap-3 rounded-full bg-[#ff8a1a] py-2 pl-5 pr-2 text-sm font-semibold text-[#0a0a0b] transition-all duration-300 hover:bg-[#ffb371] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{status === "loading" ? t.submitting : t.submit}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0b]/90 text-[#ff8a1a] transition-transform duration-300 group-hover:translate-x-0.5">
                    <ArrowIcon />
                  </span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
