"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowIcon, CheckIcon } from "@/components/Icons";
import { CalEmbed } from "@/components/CalEmbed";
import { fireConversion, setEnhancedUserData } from "@/lib/analytics";
import { isTestMode } from "@/lib/test-mode";
import { attributionPayload } from "@/lib/attribution";
import { SITE } from "@/lib/site";
import { DICT, type Locale } from "@/lib/i18n";

// Multi-step valuation wizard.
//
// UX decisions per user feedback:
// - One question visible at a time (no anxiety from a 5-step preview).
// - Thin top progress bar showing % complete + small "Step N of 5" label.
// - Veritor color logo on a white pill (cream-on-dark contrast).
// - Custom dark-themed checkbox for TCPA consent.
//
// Data decisions:
// - SAFER scrape gives us telephone — pre-filled in step 3.
// - SAFER MCS-150 Form Date gives us authority age — used silently in
//   pricing, not shown to user.

type StepId = 1 | 2 | 3 | 4 | 5;

type Carrier = {
  legalName: string;
  dbaName: string | null;
  dotNumber: string;
  mcNumbers: string[];
  address: { street: string | null; city: string | null; state: string | null; zip: string | null };
  powerUnits: number;
  drivers: number;
  crashes24mo: number;
  safetyRating: string | null;
  authorityStatus: string;
  allowedToOperate: boolean;
  vehicleOosRate: number;
  driverOosRate: number;
  vehicleOosNationalAvg: number | null;
  driverOosNationalAvg: number | null;
  telephone: string | null;
  mcs150FormDate: string | null;
  authorityAgeDays: number | null;
  flags: {
    hasActiveAuthority: boolean;
    hasInsuranceOnFile: boolean;
    insuranceStatus: "active" | "lapsed" | "not_required" | "unknown";
    isAllowedToOperate: boolean;
    driverOosBetterThanAvg: boolean;
    vehicleOosBetterThanAvg: boolean;
    driverOosCritical: boolean;
    vehicleOosCritical: boolean;
  };
};

const EASE = [0.16, 1, 0.3, 1] as const;
const TOTAL_STEPS = 5;

function formatSlot(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

function isEmailValid(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

// Focus + scroll an element. Every click on a step's Continue/Submit
// button that lands on an invalid form calls this on the first invalid
// field, so each click produces a DOM mutation (focus change). Without
// this, Clarity classifies a repeat-click on a button whose only effect
// is the same error message as a "dead click" — the signal that pushed
// /get-offer to a 33% dead-click rate.
function focusInvalid(el: HTMLElement | null | undefined) {
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "center", behavior: "smooth" });
}

export function ValuationWizard({ locale = "en" as Locale }: { locale?: Locale }) {
  const t = DICT[locale].wizard;
  const searchParams = useSearchParams();
  const [step, setStep] = useState<StepId>(1);

  // Initialize from URL params if Hero handed us a number+kind. We
  // auto-run the lookup once the session id is ready so the seller
  // lands directly on step 2 (the carrier confirmation).
  const initialKind = (searchParams.get("kind") === "dot" ? "dot" : "mc") as "mc" | "dot";
  const initialNumber = (searchParams.get("number") ?? "").replace(/[^0-9]/g, "");

  // Inputs
  const [kind, setKind] = useState<"mc" | "dot">(initialKind);
  const [number, setNumber] = useState(initialNumber);
  const [autoRan, setAutoRan] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hasRelay, setHasRelay] = useState<"" | "yes" | "no">("");
  const [tcpaConsent, setTcpaConsent] = useState(false);

  // Derived from API
  const [valuationId, setValuationId] = useState<number | null>(null);
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [range, setRange] = useState<string>("");
  const [floorReason, setFloorReason] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    sessionIdRef.current = getSessionId();
    // Auto-run lookup if hero passed a number via URL params.
    if (!autoRan && initialNumber && step === 1) {
      setAutoRan(true);
      // Defer one frame so sessionId is captured.
      requestAnimationFrame(() => submitLookup());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitLookup() {
    setError("");
    if (!number.trim()) {
      setError(t.errorNumber);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/valuation/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          number: number.trim(),
          kind,
          attribution: attributionPayload(),
          test: isTestMode(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.errorGeneric);
        return;
      }
      setValuationId(data.valuationId);
      setCarrier(data.carrier);
      // Pre-fill phone from SAFER if available; user can still edit.
      if (data.carrier?.telephone && !phone) {
        setPhone(data.carrier.telephone);
      }
      setStep(2);
    } catch {
      setError(t.errorNetwork);
    } finally {
      setLoading(false);
    }
  }

  async function submitFinalize() {
    setError("");
    if (!tcpaConsent) {
      setError(t.errorConsent);
      return;
    }
    if (hasRelay === "") {
      setError(t.errorRelay);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/valuation/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          valuationId,
          number: number.trim(),
          kind,
          hasAmazonRelay: hasRelay === "yes",
          // Authority age is computed server-side from SAFER's MCS-150
          // Form Date — no need to send from client.
          authorityAgeDays: null,
          contact: { name, email, phone },
          test: isTestMode(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.errorGeneric);
        return;
      }
      setRange(data.range);
      setFloorReason(data.flooredReason);
      // GA4 conversion event for Campaign 2 (valuation wedge) +
      // matching Google Ads conversion. Distinct from homepage
      // `generate_lead` so reporting stays separable across the two
      // Google Ads campaigns. Enhanced conversions (hashed email +
      // phone) raise Google Ads match rate for users without ad cookies.
      await setEnhancedUserData({ email, phone });
      fireConversion("valuation_completed", {
        locale,
        has_amazon_relay: hasRelay === "yes",
        kind,
        mc_present: kind === "mc",
        currency: "USD",
        legal_name: carrier?.legalName ?? null,
      });
      setStep(5);
    } catch {
      setError(t.errorNetwork);
    } finally {
      setLoading(false);
    }
  }

  function nextFromStep2() {
    setError("");
    // Mid-funnel signal: user saw the FMCSA-pulled carrier card and
    // confirmed it's the right company. Distinct from valuation_completed
    // (which only fires after Step 4 submit). Useful for optimizing
    // Google Ads bidding on "qualified intent" earlier in the funnel.
    fireConversion("valuation_started", {
      locale,
      kind,
      mc_number: carrier?.mcNumbers[0] ?? null,
      dot_number: carrier?.dotNumber ?? null,
      legal_name: carrier?.legalName ?? null,
    });
    setStep(3);
  }

  function nextFromStep3() {
    setError("");
    if (name.trim().length < 1) {
      setError(t.errorName);
      return;
    }
    if (!isEmailValid(email)) {
      setError(t.errorEmail);
      return;
    }
    setStep(4);
  }

  return (
    <section className="min-h-[calc(100svh-80px)] bg-[#0a0a0b] py-8 md:py-14">
      <div className="mx-auto max-w-2xl px-5 md:px-6">
        {/* Top bar — small inline wordmark + free-valuation tag */}
        <div className="mb-7 flex items-center justify-between md:mb-9">
          <Link
            href={locale === "en" ? "/" : `/${locale}`}
            aria-label="Veritor home"
            className="inline-flex items-center"
          >
            <Image
              src="/brand/logo-on-dark.png"
              alt="Veritor Group"
              width={140}
              height={28}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/45">
            {t.brandTag}
          </p>
        </div>

        {/* Thin progress strip — fill only, no percentage or step labels */}
        <Progress step={step} />

        {/* Step content */}
        <div className="mt-8 rounded-2xl bg-white/[0.025] p-6 ring-1 ring-white/10 backdrop-blur-md md:rounded-3xl md:p-10 lg:p-12">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <StepShell key="1">
                <Step1
                  t={t}
                  kind={kind}
                  setKind={setKind}
                  number={number}
                  setNumber={setNumber}
                  loading={loading}
                  error={error}
                  onSubmit={submitLookup}
                />
              </StepShell>
            )}
            {step === 2 && carrier && (
              <StepShell key="2">
                <Step2 t={t} carrier={carrier} onBack={() => setStep(1)} onNext={nextFromStep2} />
              </StepShell>
            )}
            {step === 3 && (
              <StepShell key="3">
                <Step3
                  t={t}
                  name={name}
                  setName={setName}
                  email={email}
                  setEmail={setEmail}
                  phone={phone}
                  setPhone={setPhone}
                  phonePreFilled={!!carrier?.telephone}
                  error={error}
                  onBack={() => setStep(2)}
                  onNext={nextFromStep3}
                />
              </StepShell>
            )}
            {step === 4 && (
              <StepShell key="4">
                <Step4
                  t={t}
                  hasRelay={hasRelay}
                  setHasRelay={setHasRelay}
                  tcpaConsent={tcpaConsent}
                  setTcpaConsent={setTcpaConsent}
                  loading={loading}
                  error={error}
                  onBack={() => setStep(3)}
                  onSubmit={submitFinalize}
                />
              </StepShell>
            )}
            {step === 5 && carrier && (
              <StepShell key="5">
                <Step5
                  t={t}
                  range={range}
                  floorReason={floorReason}
                  carrier={carrier}
                  contact={{ name, email, phone }}
                  hasRelay={hasRelay === "yes" ? "yes" : "no"}
                />
              </StepShell>
            )}
          </AnimatePresence>
        </div>

        {/* Indicative note */}
        <p className="mt-7 text-center text-[12px] leading-relaxed text-white/40">
          {t.indicativeNote}
        </p>

        {/* Wordmark below the form — transparent background, larger
            scale, decorative footer to anchor the page brand. Wrapped in
            a Link so users who scroll to the bottom and click the
            wordmark land on the homepage (the top-bar wordmark trains
            them that the logo IS a link — without this Link, the bottom
            wordmark generated dead clicks). */}
        <div className="mt-12 flex flex-col items-center md:mt-16">
          <Link
            href={locale === "en" ? "/" : `/${locale}`}
            aria-label="Veritor home"
            className="inline-flex"
          >
            <Image
              src="/brand/logo-on-dark.png"
              alt="Veritor Group"
              width={420}
              height={84}
              className="h-12 w-auto opacity-50 transition-opacity duration-200 hover:opacity-80 md:h-16"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Progress({ step }: { step: StepId }) {
  const pct = (step / TOTAL_STEPS) * 100;
  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/8">
      <motion.div
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: EASE }}
        className="h-full rounded-full bg-[#ff8a1a]"
      />
    </div>
  );
}

function StepShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/35 outline-none transition-all focus:border-[#ff8a1a]/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#ff8a1a]/20";
const labelClass =
  "text-[11px] font-medium uppercase tracking-[0.22em] text-white/55";

type Strings = (typeof DICT)["en"]["wizard"];

function Step1({
  t,
  kind,
  setKind,
  number,
  setNumber,
  loading,
  error,
  onSubmit,
}: {
  t: Strings;
  kind: "mc" | "dot";
  setKind: (k: "mc" | "dot") => void;
  number: string;
  setNumber: (v: string) => void;
  loading: boolean;
  error: string;
  onSubmit: () => void;
}) {
  return (
    <>
      <h2 className="text-[1.625rem] font-semibold leading-[1.05] tracking-[-0.025em] text-white md:text-[2rem] lg:text-[2.25rem]">
        {t.step1Headline1}{" "}
        <span className="italic font-light text-white/85">{t.step1Headline2}</span>
      </h2>
      <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/65">
        {t.step1Intro}
      </p>

      <div className="mt-8 grid gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setKind("mc")}
            className={`flex-1 rounded-xl border px-4 py-3 text-[14px] font-semibold transition-all ${
              kind === "mc"
                ? "border-[#ff8a1a]/50 bg-[#ff8a1a]/[0.08] text-white"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
            }`}
          >
            {t.mcLabel}
          </button>
          <button
            type="button"
            onClick={() => setKind("dot")}
            className={`flex-1 rounded-xl border px-4 py-3 text-[14px] font-semibold transition-all ${
              kind === "dot"
                ? "border-[#ff8a1a]/50 bg-[#ff8a1a]/[0.08] text-white"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
            }`}
          >
            {t.dotLabel}
          </button>
        </div>

        <label className="flex flex-col gap-2">
          <span className={labelClass}>{kind === "mc" ? t.yourMc : t.yourDot}</span>
          <input
            type="text"
            inputMode="numeric"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder={kind === "mc" ? "MC-123456" : "USDOT 1234567"}
            className={inputClass}
            autoFocus
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="mt-2 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <Link
            href="/contact"
            className="text-[13px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
          >
            {t.noMcLink}
          </Link>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#ff8a1a] py-2 pl-5 pr-2 text-sm font-semibold text-[#0a0a0b] transition-all duration-300 hover:bg-[#ffb371] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{loading ? t.lookingUp : t.lookupCta}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0b]/90 text-[#ff8a1a] transition-transform duration-300 group-hover:translate-x-0.5">
              {loading ? <Spinner /> : <ArrowIcon />}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

// Inline 12px spinner — used in CTA buttons when the next action is
// fetching. `animate-spin` ships with Tailwind by default.
function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Step2({
  t,
  carrier,
  onBack,
  onNext,
}: {
  t: Strings;
  carrier: Carrier;
  onBack: () => void;
  onNext: () => void;
}) {
  const addressLine = [
    carrier.address.street,
    carrier.address.city,
    carrier.address.state,
    carrier.address.zip,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <>
      <h2 className="text-[1.625rem] font-semibold leading-[1.05] tracking-[-0.025em] text-white md:text-[2rem]">
        {t.step2Headline}
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-white/65">{t.step2Intro}</p>

      <div className="mt-6 grid gap-3 rounded-xl bg-white/[0.04] p-5 ring-1 ring-white/10">
        <Row label={t.legalName} value={carrier.legalName} />
        {carrier.dbaName && <Row label={t.dba} value={carrier.dbaName} />}
        <Row
          label="DOT / MC"
          value={`USDOT ${carrier.dotNumber}${carrier.mcNumbers[0] ? ` · MC-${carrier.mcNumbers[0]}` : ""}`}
        />
        {addressLine && <Row label={t.address} value={addressLine} />}
        <Row
          label={t.authority}
          value={carrier.flags.hasActiveAuthority ? t.authorityActive : t.authorityInactive}
          tone={carrier.flags.hasActiveAuthority ? "good" : "warn"}
        />
        <Row
          label={t.insurance}
          value={
            carrier.flags.insuranceStatus === "active"
              ? t.insuranceActive
              : carrier.flags.insuranceStatus === "lapsed"
                ? t.insuranceLapsed
                : carrier.flags.insuranceStatus === "not_required"
                  ? t.insuranceNotRequired
                  : "—"
          }
          tone={
            carrier.flags.insuranceStatus === "active"
              ? "good"
              : carrier.flags.insuranceStatus === "lapsed"
                ? "warn"
                : "neutral"
          }
        />
        <Row label={t.fleetSize} value={`${carrier.powerUnits} · ${carrier.drivers}`} />
        <Row label={t.crashes} value={String(carrier.crashes24mo)} />
        {carrier.safetyRating && (
          <Row
            label={t.safety}
            value={
              carrier.safetyRating === "S"
                ? t.safetySatisfactory
                : carrier.safetyRating === "C"
                  ? t.safetyConditional
                  : carrier.safetyRating === "U"
                    ? t.safetyUnsatisfactory
                    : carrier.safetyRating
            }
            tone={
              carrier.safetyRating === "S"
                ? "good"
                : carrier.safetyRating === "U"
                  ? "warn"
                  : "neutral"
            }
          />
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="text-[13px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
        >
          {t.back}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="group inline-flex items-center gap-3 rounded-full bg-[#ff8a1a] py-2 pl-5 pr-2 text-sm font-semibold text-[#0a0a0b] transition-all duration-300 hover:bg-[#ffb371]"
        >
          <span>{t.confirmCta}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0b]/90 text-[#ff8a1a] transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowIcon />
          </span>
        </button>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const colorClass =
    tone === "good"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-white/85";
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">
        {label}
      </span>
      <span className={`text-right text-[14px] font-medium ${colorClass}`}>{value}</span>
    </div>
  );
}

function Step3({
  t,
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  phonePreFilled,
  error,
  onBack,
  onNext,
}: {
  t: Strings;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  phonePreFilled: boolean;
  error: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  function handleNext() {
    // Focus the first invalid field BEFORE calling parent's onNext. The
    // parent also validates and sets the global error, but the focus
    // change here guarantees a DOM mutation per click — defeats Clarity's
    // dead-click classification on repeat clicks against the same error.
    if (name.trim().length < 1) {
      focusInvalid(nameRef.current);
    } else if (!isEmailValid(email)) {
      focusInvalid(emailRef.current);
    }
    onNext();
  }

  return (
    <>
      <h2 className="text-[1.625rem] font-semibold leading-[1.05] tracking-[-0.025em] text-white md:text-[2rem]">
        {t.step3Headline}
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-white/65">{t.step3Intro}</p>
      <div className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>{t.name} *</span>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleNext();
              }
            }}
            placeholder="Jane Smith"
            className={inputClass}
            autoComplete="name"
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>{t.email} *</span>
          <input
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleNext();
              }
            }}
            placeholder="you@company.com"
            className={inputClass}
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>
            {t.phone}
            {phonePreFilled && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-300 ring-1 ring-emerald-400/20">
                {t.fromFmcsa}
              </span>
            )}
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleNext();
              }
            }}
            placeholder="(555) 555-1234"
            className={inputClass}
            autoComplete="tel"
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
      <div className="mt-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="text-[13px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
        >
          {t.back}
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="group inline-flex items-center gap-3 rounded-full bg-[#ff8a1a] py-2 pl-5 pr-2 text-sm font-semibold text-[#0a0a0b] transition-all duration-300 hover:bg-[#ffb371]"
        >
          <span>{t.continue}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0b]/90 text-[#ff8a1a] transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowIcon />
          </span>
        </button>
      </div>
    </>
  );
}

function Step4({
  t,
  hasRelay,
  setHasRelay,
  tcpaConsent,
  setTcpaConsent,
  loading,
  error,
  onBack,
  onSubmit,
}: {
  t: Strings;
  hasRelay: "" | "yes" | "no";
  setHasRelay: (v: "" | "yes" | "no") => void;
  tcpaConsent: boolean;
  setTcpaConsent: (v: boolean) => void;
  loading: boolean;
  error: string;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const relayYesRef = useRef<HTMLButtonElement>(null);
  const tcpaRef = useRef<HTMLInputElement>(null);

  function handleSubmit() {
    // Same pattern as Step 3 handleNext — focus first invalid before
    // delegating to parent. Without this, clicking Show Valuation with
    // unchecked TCPA or unselected Relay produces the same error text
    // on every click, which Clarity flags as a dead click after the
    // first one (no visible DOM mutation between attempts).
    if (hasRelay === "") {
      focusInvalid(relayYesRef.current);
    } else if (!tcpaConsent) {
      // The actual input is sr-only; focusing it triggers
      // peer-focus-visible on the styled checkbox so the user sees
      // the orange ring.
      focusInvalid(tcpaRef.current);
    }
    onSubmit();
  }

  return (
    <>
      <h2 className="text-[1.625rem] font-semibold leading-[1.05] tracking-[-0.025em] text-white md:text-[2rem]">
        {t.step4Headline}
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-white/65">{t.step4Intro}</p>

      <div className="mt-6 grid gap-6">
        <div>
          <p className={`${labelClass} mb-3`}>{t.relayQuestion}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              ref={relayYesRef}
              type="button"
              onClick={() => setHasRelay("yes")}
              className={`group flex flex-col rounded-xl border p-4 text-left transition-all ${
                hasRelay === "yes"
                  ? "border-[#ff8a1a]/60 bg-[#ff8a1a]/[0.08]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]"
              }`}
            >
              <span className="text-[15px] font-semibold text-white">{t.relayYes}</span>
              <span className="mt-1 text-[13px] text-white/55">{t.relayYesNote}</span>
            </button>
            <button
              type="button"
              onClick={() => setHasRelay("no")}
              className={`group flex flex-col rounded-xl border p-4 text-left transition-all ${
                hasRelay === "no"
                  ? "border-[#ff8a1a]/60 bg-[#ff8a1a]/[0.08]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]"
              }`}
            >
              <span className="text-[15px] font-semibold text-white">{t.relayNo}</span>
              <span className="mt-1 text-[13px] text-white/55">{t.relayNoNote}</span>
            </button>
          </div>
        </div>

        {/* Custom dark-themed checkbox. Hides the native input and renders
            a styled box driven by peer-checked. */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10 transition-colors hover:bg-white/[0.05]">
          <input
            ref={tcpaRef}
            type="checkbox"
            checked={tcpaConsent}
            onChange={(e) => setTcpaConsent(e.target.checked)}
            className="peer sr-only"
          />
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/25 bg-white/[0.04] transition-all peer-checked:border-[#ff8a1a] peer-checked:bg-[#ff8a1a] peer-focus-visible:ring-2 peer-focus-visible:ring-[#ff8a1a]/40"
            aria-hidden
          >
            <span className={`text-[#0a0a0b] transition-opacity ${tcpaConsent ? "opacity-100" : "opacity-0"}`}>
              <CheckIcon size={12} />
            </span>
          </span>
          <span className="text-[12.5px] leading-relaxed text-white/65">
            {t.tcpaConsent.replace("{site}", SITE.name)}{" "}
            <Link href="/privacy" className="text-white/85 underline underline-offset-2 hover:text-white">
              {t.privacy}
            </Link>{" "}
            {t.and}{" "}
            <Link href="/terms" className="text-white/85 underline underline-offset-2 hover:text-white">
              {t.terms}
            </Link>
            .
          </span>
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="text-[13px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
        >
          {t.back}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="group inline-flex items-center gap-3 rounded-full bg-[#ff8a1a] py-2 pl-5 pr-2 text-sm font-semibold text-[#0a0a0b] transition-all duration-300 hover:bg-[#ffb371] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{loading ? t.computing : t.showValuation}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0b]/90 text-[#ff8a1a] transition-transform duration-300 group-hover:translate-x-0.5">
            {loading ? <Spinner /> : <ArrowIcon />}
          </span>
        </button>
      </div>
    </>
  );
}

function Step5({
  t,
  range,
  floorReason,
  carrier,
  contact,
  hasRelay,
}: {
  t: Strings;
  range: string;
  floorReason: string | null;
  carrier: Carrier;
  contact: { name: string; email: string; phone: string };
  hasRelay: "yes" | "no";
}) {
  const [slots, setSlots] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/cal/next-slots")
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((data) => setSlots(Array.isArray(data.slots) ? data.slots : []))
      .catch(() => setSlots([]));
  }, []);
  // Pre-fill the Cal.com booking form with the seller's info + carrier
  // context. Cal.com supports name/email as URL params, plus a generic
  // `notes` field that lands in the booking confirmation. The seller
  // can still edit anything in Cal's form before confirming.
  const notes = [
    `Veritor valuation request:`,
    `${carrier.legalName} (USDOT ${carrier.dotNumber}${carrier.mcNumbers[0] ? `, MC-${carrier.mcNumbers[0]}` : ""})`,
    `Indicative range: ${range}`,
    `Active Amazon Relay: ${hasRelay === "yes" ? "yes" : "no"}`,
  ].join("\n");

  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a]">
        {t.yourValuation}
      </p>
      <h2 className="mt-3 text-[2rem] font-semibold leading-[1] tracking-[-0.035em] text-white md:text-[2.5rem] lg:text-[3rem]">
        {range}
      </h2>
      <p className="mt-3 text-[14px] text-white/55">
        {t.forCompany.replace("{name}", carrier.legalName)} USDOT {carrier.dotNumber}
        {carrier.mcNumbers[0] ? ` · MC-${carrier.mcNumbers[0]}` : ""}
      </p>

      {floorReason && (
        <div className="mt-5 rounded-xl bg-amber-500/[0.08] p-4 ring-1 ring-amber-400/20">
          <p className="text-[13px] leading-relaxed text-amber-200">
            <strong className="font-semibold">{t.note}</strong> {floorReason} — {t.floorNote}
          </p>
        </div>
      )}

      <div className="mt-7 rounded-xl bg-white/[0.04] p-5 ring-1 ring-white/10">
        <p className="text-[13px] leading-relaxed text-white/65">{t.indicativeBlock}</p>
      </div>

      {/* Inline Cal.com calendar — booking happens on this same page,
          no extra click, no new tab. The user's name + email + carrier
          context are pre-filled but editable. */}
      <div className="mt-7">
        <div className="mb-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
            {t.scheduleCall}
          </p>
          {slots.length > 0 && (
            <p className="text-[12px] text-white/55">
              {t.nextAvailable}{" "}
              <span className="font-medium text-white/85">
                {formatSlot(slots[0])}
              </span>
            </p>
          )}
        </div>
        {slots.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {slots.slice(0, 3).map((iso) => (
              <span
                key={iso}
                className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1 text-[11px] font-medium text-emerald-300"
              >
                {formatSlot(iso)}
              </span>
            ))}
          </div>
        )}
        <CalEmbed
          calLink="lukaveritor/15min"
          origin="https://cal.eu"
          prefill={{
            name: contact.name || undefined,
            email: contact.email || undefined,
            notes,
          }}
        />
      </div>

      <div className="mt-7 text-center">
        <Link
          href="/contact"
          className="text-[13px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
        >
          {t.haveQuestions}
        </Link>
      </div>
    </>
  );
}
