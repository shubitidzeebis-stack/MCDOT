"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MaskWords } from "@/components/MaskWords";
import { HoneypotField } from "@/components/HoneypotField";
import { Turnstile } from "@/components/Turnstile";
import {
  ArrowIcon,
  ChevronIcon,
  MailIcon,
  PhoneIcon,
  WhatsAppIcon,
} from "@/components/Icons";
import { AsYouType, isValidPhoneNumber } from "libphonenumber-js";
import { attributionPayload } from "@/lib/attribution";
import { DICT, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

// Format a phone number as the user types. Defaults to US format because
// our audience is US-based; if they paste a +country prefix we honor it.
function formatPhone(input: string): string {
  if (!input) return "";
  // If user explicitly types +X, treat as international.
  if (input.trim().startsWith("+")) {
    return new AsYouType().input(input);
  }
  return new AsYouType("US").input(input);
}

// Stable per-tab session id used to upsert partial form state on the
// server. Stored in sessionStorage so it survives reloads within the
// tab but resets on tab close — no cross-session tracking.
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "veritor.session";
  let id = window.sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(KEY, id);
  }
  return id;
}

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
  const pathname = usePathname();

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
  // Pre-form qualifier — 2 quick yes/no questions to set expectations
  // and pre-fill hasRelay / mcAgeDays. Only shown on first visit per
  // tab + only in English; ES/RU skip straight to the form. Skip link
  // available for users who just want the form.
  const [step, setStep] = useState<"qualifier" | "form">(
    locale === "en" ? "qualifier" : "form",
  );
  // Track whether we've started saving partials — gated on a valid
  // email so we don't store half-typed garbage that won't be useful for
  // re-engagement anyway.
  const [partialActive, setPartialActive] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  // Inline validation — surface field-level errors only AFTER the field
  // has been blurred at least once, so the user isn't yelled at while
  // they're still typing.
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const sessionIdRef = useRef<string>("");
  // Mirror of `form` state in a ref so blur handlers always see the
  // latest values without re-binding on every keystroke.
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  // Latest partial-save fetch — used to coalesce blur events.
  const lastSaveRef = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    sessionIdRef.current = getSessionId();
  }, []);

  const update =
    <K extends keyof FormState>(key: K) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      let value = e.target.value;
      // Phone field: format as the user types so they see "(415) 555-1234"
      // rather than raw "4155551234".
      if (key === "phone") value = formatPhone(value);
      setForm((prev) => ({ ...prev, [key]: value as FormState[K] }));
    };

  function isEmailLikeValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  // Field-level validation — only surface the error if the user has
  // already touched (blurred) the field. Returns null when valid.
  function fieldError(key: keyof FormState): string | null {
    if (!touched[key]) return null;
    const v = form[key]?.trim() ?? "";
    if (key === "name" && v.length < 1) return t.nameRequired;
    if (key === "email") {
      if (v.length < 1) return t.emailRequired;
      if (!isEmailLikeValid(v)) return t.emailRequired;
    }
    if (key === "phone") {
      if (v.length < 1) return t.phoneRequired;
      // libphonenumber: defaults to US-format validation if no country code.
      if (!isValidPhoneNumber(v, "US") && !isValidPhoneNumber(v)) {
        return locale === "es"
          ? "Número de teléfono no válido."
          : locale === "ru"
            ? "Неверный номер телефона."
            : "Please enter a valid phone number.";
      }
    }
    return null;
  }
  const markTouched = (key: keyof FormState) =>
    setTouched((prev) => ({ ...prev, [key]: true }));

  // Fires from any field's onBlur once we have a usable email. Best-effort:
  // we don't await, we don't surface errors — the user shouldn't notice.
  function flushPartial(snapshot: FormState) {
    if (!partialActive && !isEmailLikeValid(snapshot.email)) return;
    if (!partialActive && isEmailLikeValid(snapshot.email)) {
      setPartialActive(true);
    }
    if (!isEmailLikeValid(snapshot.email)) return;
    if (!sessionIdRef.current) return;

    const body = {
      sessionId: sessionIdRef.current,
      name: snapshot.name,
      email: snapshot.email,
      phone: snapshot.phone,
      company: snapshot.company,
      mc: snapshot.mc,
      hasRelay: snapshot.hasRelay,
      mcAgeDays: snapshot.mcAgeDays,
      insurance: snapshot.insurance,
      state: snapshot.state,
      notes: snapshot.notes,
      locale,
      page: pathname ?? "",
      website: snapshot.website, // honeypot mirrored
    };

    lastSaveRef.current = fetch("/api/contact/partial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // Swallow — partial-save failures are intentional silent.
    });
  }

  // Wraps the per-field onChange so we can also fire a blur-side save
  // AND mark the field touched (gates inline validation messages).
  // The ref read happens inside the event handler closure, not during
  // render — lint is being conservative about ref access.
  const blurHandler = (key: keyof FormState) => () => {
    markTouched(key);
    // eslint-disable-next-line react-hooks/refs
    flushPartial(formRef.current);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Mark required fields touched so validation messages surface even
    // if the user hits submit without ever blurring them.
    setTouched((prev) => ({ ...prev, name: true, email: true, phone: true }));
    // Re-validate inline. Using `form` directly here (not `touched`) since
    // we already forced touched=true for these.
    const v = form;
    if (
      v.name.trim().length < 1 ||
      !isEmailLikeValid(v.email) ||
      v.phone.trim().length < 1 ||
      (!isValidPhoneNumber(v.phone, "US") && !isValidPhoneNumber(v.phone))
    ) {
      // Stop — fieldError() will render under each invalid field.
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          locale,
          sessionId: sessionIdRef.current,
          turnstileToken,
          attribution: attributionPayload(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t.error);
      }
      // Fire GA4 lead conversion. Guarded — gtag is undefined when the
      // visitor declined analytics consent or the GA env var isn't set.
      // Best-effort: don't block redirect on this.
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", "generate_lead", {
          locale,
          has_relay: form.hasRelay || "unknown",
          mc_present: Boolean(form.mc.trim()),
        });
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
            {step === "qualifier" && (
              <Qualifier
                onAnswer={(answers) => {
                  // Pre-fill the corresponding fields on the full form
                  // so the seller doesn't re-answer.
                  setForm((prev) => ({
                    ...prev,
                    hasRelay: answers.hasRelay,
                    mcAgeDays: answers.mcAgeDays ?? prev.mcAgeDays,
                  }));
                  setStep("form");
                }}
                onSkip={() => setStep("form")}
              />
            )}
            {step === "form" && (
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
                    onBlur={blurHandler("name")}
                    className={inputClass}
                    placeholder="Jane Smith"
                  />
                  {fieldError("name") && (
                    <span className="text-[12px] text-red-400/90">{fieldError("name")}</span>
                  )}
                </label>
                <label className="flex flex-col gap-2">
                  <span className={labelClass}>{t.email} *</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={update("email")}
                    onBlur={blurHandler("email")}
                    className={inputClass}
                    placeholder="you@company.com"
                  />
                  {fieldError("email") && (
                    <span className="text-[12px] text-red-400/90">{fieldError("email")}</span>
                  )}
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
                    onBlur={blurHandler("phone")}
                    className={inputClass}
                    placeholder="(555) 555-1234"
                  />
                  {fieldError("phone") && (
                    <span className="text-[12px] text-red-400/90">{fieldError("phone")}</span>
                  )}
                </label>
                <label className="flex flex-col gap-2">
                  <span className={labelClass}>{t.company}</span>
                  <input
                    autoComplete="organization"
                    value={form.company}
                    onChange={update("company")}
                    onBlur={blurHandler("company")}
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
                    onBlur={blurHandler("mc")}
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
                    onBlur={blurHandler("state")}
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
                    onBlur={blurHandler("hasRelay")}
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
                      onBlur={blurHandler("insurance")}
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
                      onBlur={blurHandler("mcAgeDays")}
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
                  onBlur={blurHandler("notes")}
                  className={`${inputClass} resize-none`}
                  placeholder=""
                />
              </label>

              {/* Cloudflare Turnstile — invisible to most users; only shows
                  a challenge when CF's heuristics flag the visit as
                  suspicious. Renders nothing visible here unless it fires. */}
              {TURNSTILE_SITE_KEY && (
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onToken={setTurnstileToken}
                  onExpire={() => setTurnstileToken("")}
                  onError={() => setTurnstileToken("")}
                />
              )}

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
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Pre-form qualifier — two quick yes/no questions that set expectations
// and pre-fill hasRelay / mcAgeDays on the full form. Improves lead
// quality (sellers self-select) and feels less like a wall of fields.
function Qualifier({
  onAnswer,
  onSkip,
}: {
  onAnswer: (answers: { hasRelay: "yes" | "no"; mcAgeDays?: string }) => void;
  onSkip: () => void;
}) {
  const [phase, setPhase] = useState<"relay" | "mc-age">("relay");
  const [hasRelay, setHasRelay] = useState<"yes" | "no" | null>(null);

  function pickRelay(value: "yes" | "no") {
    setHasRelay(value);
    if (value === "yes") {
      // Active Relay = qualifies regardless of MC age. Skip the second
      // question and proceed straight to the form.
      onAnswer({ hasRelay: "yes" });
      return;
    }
    // No Relay → ask MC age.
    setPhase("mc-age");
  }

  function pickMcAge(answer: "fresh" | "old" | "unknown") {
    onAnswer({
      hasRelay: "no",
      mcAgeDays:
        answer === "fresh" ? "120" : answer === "old" ? "365" : "",
    });
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
          Quick check — 2 questions
        </p>
        <button
          type="button"
          onClick={onSkip}
          className="text-[12px] text-white/45 underline-offset-2 hover:text-white/75 hover:underline"
        >
          Skip, just show the form
        </button>
      </div>

      {phase === "relay" && (
        <>
          <h3 className="mt-5 text-[1.5rem] font-semibold leading-tight tracking-[-0.015em] text-white md:text-[1.875rem]">
            Does your LLC have an active Amazon Relay contract?
          </h3>
          <p className="mt-3 text-[14px] leading-relaxed text-white/55">
            Active Amazon Relay carriers are our highest priority — fastest close, best
            terms, insurance flexibility.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => pickRelay("yes")}
              className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-5 text-left transition-all hover:border-[#ff8a1a]/50 hover:bg-[#ff8a1a]/[0.06]"
            >
              <span className="text-[16px] font-semibold text-white">Yes, active Relay</span>
              <span className="mt-1 text-[13px] text-white/55 group-hover:text-white/75">
                You&rsquo;re in our highest-priority bucket.
              </span>
            </button>
            <button
              type="button"
              onClick={() => pickRelay("no")}
              className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-5 text-left transition-all hover:border-white/30 hover:bg-white/[0.08]"
            >
              <span className="text-[16px] font-semibold text-white">No Relay</span>
              <span className="mt-1 text-[13px] text-white/55 group-hover:text-white/75">
                One more question about your MC authority.
              </span>
            </button>
          </div>
        </>
      )}

      {phase === "mc-age" && (
        <>
          <h3 className="mt-5 text-[1.5rem] font-semibold leading-tight tracking-[-0.015em] text-white md:text-[1.875rem]">
            How old is your MC authority?
          </h3>
          <p className="mt-3 text-[14px] leading-relaxed text-white/55">
            Fresh MC authority (under 180 days) is what we look for in non-Relay LLCs.
            Older authorities can still work depending on history.
          </p>
          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => pickMcAge("fresh")}
              className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-5 text-left transition-all hover:border-[#ff8a1a]/50 hover:bg-[#ff8a1a]/[0.06]"
            >
              <span className="text-[16px] font-semibold text-white">
                Less than 180 days
              </span>
              <span className="mt-1 text-[13px] text-white/55 group-hover:text-white/75">
                You&rsquo;re a fit. Tell us a little more on the next step.
              </span>
            </button>
            <button
              type="button"
              onClick={() => pickMcAge("old")}
              className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-5 text-left transition-all hover:border-white/30 hover:bg-white/[0.08]"
            >
              <span className="text-[16px] font-semibold text-white">
                More than 180 days
              </span>
              <span className="mt-1 text-[13px] text-white/55 group-hover:text-white/75">
                We&rsquo;ll still answer questions — submit and we&rsquo;ll be honest about
                whether it works.
              </span>
            </button>
            <button
              type="button"
              onClick={() => pickMcAge("unknown")}
              className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-5 text-left transition-all hover:border-white/30 hover:bg-white/[0.08]"
            >
              <span className="text-[16px] font-semibold text-white">I&rsquo;m not sure</span>
              <span className="mt-1 text-[13px] text-white/55 group-hover:text-white/75">
                Submit anyway — we pull FMCSA records ourselves to check.
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
