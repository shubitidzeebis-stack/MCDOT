"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowIcon, ChevronIcon } from "@/components/Icons";
import { attributionPayload } from "@/lib/attribution";
import { SITE } from "@/lib/site";

// Multi-step valuation wizard.
//
// Flow:
//   step 1 — MC / DOT input (with toggle)
//   step 2 — confirm FMCSA snapshot ("Is this your company?")
//   step 3 — contact (email required, name + phone optional)
//   step 4 — Amazon Relay yes/no + (optional) authority age in months
//   step 5 — reveal: valuation range + "Schedule a call" CTA
//
// All steps animate in/out with framer-motion. Progress bar pinned at
// top. Veritor branding applied throughout.

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
  flags: {
    hasActiveAuthority: boolean;
    hasInsuranceOnFile: boolean;
    isAllowedToOperate: boolean;
    driverOosBetterThanAvg: boolean;
    vehicleOosBetterThanAvg: boolean;
    driverOosCritical: boolean;
    vehicleOosCritical: boolean;
  };
};

const EASE = [0.16, 1, 0.3, 1] as const;

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

const TOTAL_STEPS = 5;

export function ValuationWizard() {
  const [step, setStep] = useState<StepId>(1);

  // Inputs
  const [kind, setKind] = useState<"mc" | "dot">("mc");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hasRelay, setHasRelay] = useState<"" | "yes" | "no">("");
  const [authorityMonths, setAuthorityMonths] = useState<string>(""); // freeform months as text
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
  }, []);

  function isEmailValid(e: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  }

  async function submitLookup() {
    setError("");
    if (!number.trim()) {
      setError("Please enter your MC or DOT number.");
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Lookup failed.");
        return;
      }
      setValuationId(data.valuationId);
      setCarrier(data.carrier);
      setStep(2);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitFinalize() {
    setError("");
    if (!tcpaConsent) {
      setError("Please agree to the contact terms to continue.");
      return;
    }
    if (hasRelay === "") {
      setError("Please pick yes or no for the Amazon Relay question.");
      return;
    }
    setLoading(true);
    try {
      const months = parseInt(authorityMonths, 10);
      const authorityAgeDays = Number.isFinite(months) && months >= 0 ? months * 30 : null;
      const res = await fetch("/api/valuation/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          valuationId,
          number: number.trim(),
          kind,
          hasAmazonRelay: hasRelay === "yes",
          authorityAgeDays,
          contact: { name, email, phone },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not compute valuation.");
        return;
      }
      setRange(data.range);
      setFloorReason(data.flooredReason);
      setStep(5);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Step navigation guards
  function nextFromStep2() {
    setError("");
    setStep(3);
  }

  function nextFromStep3() {
    setError("");
    if (!isEmailValid(email)) {
      setError("Please enter a valid email so we can send your written offer.");
      return;
    }
    if (name.trim().length < 1) {
      setError("Please enter your name.");
      return;
    }
    setStep(4);
  }

  return (
    <section className="min-h-[calc(100svh-80px)] bg-[#0a0a0b] py-10 md:py-16">
      <div className="mx-auto max-w-3xl px-5 md:px-6">
        {/* Brand row */}
        <div className="mb-8 flex items-center justify-between md:mb-10">
          <Link href="/" className="flex items-center gap-3" aria-label="Veritor home">
            <Image
              src="/brand/logo-on-dark.png"
              alt="Veritor Group"
              width={32}
              height={32}
              className="h-8 w-auto"
              priority
            />
            <span className="text-sm font-semibold tracking-[-0.01em] text-white">
              {SITE.name}
            </span>
          </Link>
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/45">
            Free Valuation
          </p>
        </div>

        {/* Progress */}
        <Progress step={step} />

        {/* Step content */}
        <div className="mt-10 rounded-2xl bg-white/[0.025] p-6 ring-1 ring-white/10 backdrop-blur-md md:rounded-3xl md:p-10 lg:p-12">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <StepShell key="1">
                <Step1
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
                <Step2 carrier={carrier} onBack={() => setStep(1)} onNext={nextFromStep2} />
              </StepShell>
            )}
            {step === 3 && (
              <StepShell key="3">
                <Step3
                  name={name}
                  setName={setName}
                  email={email}
                  setEmail={setEmail}
                  phone={phone}
                  setPhone={setPhone}
                  error={error}
                  onBack={() => setStep(2)}
                  onNext={nextFromStep3}
                />
              </StepShell>
            )}
            {step === 4 && (
              <StepShell key="4">
                <Step4
                  hasRelay={hasRelay}
                  setHasRelay={setHasRelay}
                  authorityMonths={authorityMonths}
                  setAuthorityMonths={setAuthorityMonths}
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
                <Step5 range={range} floorReason={floorReason} carrier={carrier} />
              </StepShell>
            )}
          </AnimatePresence>
        </div>

        {/* Footer note */}
        <p className="mt-8 text-center text-[12px] leading-relaxed text-white/40">
          Indicative valuation based on FMCSA public data. Final offer
          confirmed after a short call and document review. No obligation,
          no listing fees, no commissions.
        </p>
      </div>
    </section>
  );
}

function Progress({ step }: { step: StepId }) {
  const labels = ["Lookup", "Confirm", "Contact", "Details", "Result"];
  return (
    <div>
      <div className="flex items-center gap-2">
        {labels.map((label, i) => {
          const idx = i + 1;
          const active = idx <= step;
          const current = idx === step;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                  active
                    ? "bg-[#ff8a1a] text-[#0a0a0b]"
                    : "bg-white/10 text-white/40"
                } ${current ? "ring-2 ring-[#ff8a1a]/40 ring-offset-2 ring-offset-[#0a0a0b]" : ""}`}
              >
                {idx}
              </span>
              {idx < TOTAL_STEPS && (
                <span
                  className={`h-px flex-1 transition-colors ${
                    idx < step ? "bg-[#ff8a1a]/60" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {labels.map((label, i) => (
          <div key={label} className="flex flex-1">
            <span
              className={`text-[10px] font-medium uppercase tracking-[0.2em] ${
                i + 1 === step ? "text-white/85" : "text-white/35"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
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

function Step1({
  kind,
  setKind,
  number,
  setNumber,
  loading,
  error,
  onSubmit,
}: {
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
        Get a written valuation in <span className="italic font-light text-white/85">90 seconds.</span>
      </h2>
      <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/65">
        Enter your MC or DOT number. We&rsquo;ll pull your FMCSA record,
        confirm the company, and return a value range — no calls
        required to find out.
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
            MC Number
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
            DOT Number
          </button>
        </div>

        <label className="flex flex-col gap-2">
          <span className={labelClass}>{kind === "mc" ? "Your MC number" : "Your DOT number"}</span>
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

        <div className="mt-2 flex items-center justify-between gap-4">
          <Link
            href="/contact"
            className="text-[13px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
          >
            Don&rsquo;t have an MC yet?
          </Link>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="group inline-flex items-center gap-3 rounded-full bg-[#ff8a1a] py-2 pl-5 pr-2 text-sm font-semibold text-[#0a0a0b] transition-all duration-300 hover:bg-[#ffb371] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{loading ? "Looking up…" : "Look up FMCSA"}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0b]/90 text-[#ff8a1a] transition-transform duration-300 group-hover:translate-x-0.5">
              <ArrowIcon />
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

function Step2({
  carrier,
  onBack,
  onNext,
}: {
  carrier: Carrier;
  onBack: () => void;
  onNext: () => void;
}) {
  const addressLine = [carrier.address.street, carrier.address.city, carrier.address.state, carrier.address.zip]
    .filter(Boolean)
    .join(", ");
  return (
    <>
      <h2 className="text-[1.625rem] font-semibold leading-[1.05] tracking-[-0.025em] text-white md:text-[2rem]">
        Confirm your company.
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-white/65">
        Pulled from FMCSA. If anything below looks wrong, go back and check
        the number.
      </p>

      <div className="mt-6 grid gap-3 rounded-xl bg-white/[0.04] p-5 ring-1 ring-white/10">
        <Row label="Legal name" value={carrier.legalName} />
        {carrier.dbaName && <Row label="DBA" value={carrier.dbaName} />}
        <Row
          label="DOT / MC"
          value={`USDOT ${carrier.dotNumber}${
            carrier.mcNumbers[0] ? ` · MC-${carrier.mcNumbers[0]}` : ""
          }`}
        />
        {addressLine && <Row label="Address" value={addressLine} />}
        <Row
          label="Authority"
          value={
            carrier.flags.hasActiveAuthority
              ? "Active for-hire"
              : "Inactive / not for-hire"
          }
          tone={carrier.flags.hasActiveAuthority ? "good" : "warn"}
        />
        <Row
          label="Power units · drivers"
          value={`${carrier.powerUnits} · ${carrier.drivers}`}
        />
        <Row label="Crashes (24 mo)" value={String(carrier.crashes24mo)} />
        {carrier.safetyRating && (
          <Row
            label="Safety rating"
            value={
              carrier.safetyRating === "S"
                ? "Satisfactory"
                : carrier.safetyRating === "C"
                  ? "Conditional"
                  : carrier.safetyRating === "U"
                    ? "Unsatisfactory"
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
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="group inline-flex items-center gap-3 rounded-full bg-[#ff8a1a] py-2 pl-5 pr-2 text-sm font-semibold text-[#0a0a0b] transition-all duration-300 hover:bg-[#ffb371]"
        >
          <span>That&rsquo;s us — continue</span>
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
      <span className={`text-right text-[14px] font-medium ${colorClass}`}>
        {value}
      </span>
    </div>
  );
}

function Step3({
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  error,
  onBack,
  onNext,
}: {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  error: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <h2 className="text-[1.625rem] font-semibold leading-[1.05] tracking-[-0.025em] text-white md:text-[2rem]">
        Where should we send the written offer?
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-white/65">
        FMCSA doesn&rsquo;t share email addresses publicly, so we&rsquo;ll
        need yours. We&rsquo;ll send the written offer + a calendar link
        to schedule a quick call.
      </p>
      <div className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Your name *</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className={inputClass}
            autoComplete="name"
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Email *</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className={inputClass}
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Phone (optional)</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="group inline-flex items-center gap-3 rounded-full bg-[#ff8a1a] py-2 pl-5 pr-2 text-sm font-semibold text-[#0a0a0b] transition-all duration-300 hover:bg-[#ffb371]"
        >
          <span>Continue</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0b]/90 text-[#ff8a1a] transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowIcon />
          </span>
        </button>
      </div>
    </>
  );
}

function Step4({
  hasRelay,
  setHasRelay,
  authorityMonths,
  setAuthorityMonths,
  tcpaConsent,
  setTcpaConsent,
  loading,
  error,
  onBack,
  onSubmit,
}: {
  hasRelay: "" | "yes" | "no";
  setHasRelay: (v: "" | "yes" | "no") => void;
  authorityMonths: string;
  setAuthorityMonths: (v: string) => void;
  tcpaConsent: boolean;
  setTcpaConsent: (v: boolean) => void;
  loading: boolean;
  error: string;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <h2 className="text-[1.625rem] font-semibold leading-[1.05] tracking-[-0.025em] text-white md:text-[2rem]">
        Two final details.
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-white/65">
        These shape the valuation. Both honest answers — no wrong choice.
      </p>

      <div className="mt-6 grid gap-6">
        <div>
          <p className={`${labelClass} mb-3`}>Active Amazon Relay contract? *</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setHasRelay("yes")}
              className={`group flex flex-col rounded-xl border p-4 text-left transition-all ${
                hasRelay === "yes"
                  ? "border-[#ff8a1a]/60 bg-[#ff8a1a]/[0.08]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]"
              }`}
            >
              <span className="text-[15px] font-semibold text-white">Yes, active Relay</span>
              <span className="mt-1 text-[13px] text-white/55">Highest-priority bucket.</span>
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
              <span className="text-[15px] font-semibold text-white">No Relay</span>
              <span className="mt-1 text-[13px] text-white/55">Still welcome.</span>
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className={labelClass}>Authority age in months (optional)</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={authorityMonths}
            onChange={(e) => setAuthorityMonths(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 4 (months since you got your MC)"
            className={inputClass}
          />
          <span className="text-[12px] text-white/40">
            Skip if you&rsquo;re not sure — we won&rsquo;t penalize you.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
          <input
            type="checkbox"
            checked={tcpaConsent}
            onChange={(e) => setTcpaConsent(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#ff8a1a]"
          />
          <span className="text-[12.5px] leading-relaxed text-white/55">
            I agree to receive emails, calls, texts, and WhatsApp messages
            from {SITE.name} about my valuation, including via automated
            technology. Consent is not a condition of any purchase.
            Message and data rates may apply. Reply STOP to opt out of
            texts. See{" "}
            <Link href="/privacy" className="text-white/80 underline underline-offset-2">
              Privacy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-white/80 underline underline-offset-2">
              Terms
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
          ← Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="group inline-flex items-center gap-3 rounded-full bg-[#ff8a1a] py-2 pl-5 pr-2 text-sm font-semibold text-[#0a0a0b] transition-all duration-300 hover:bg-[#ffb371] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{loading ? "Computing…" : "Show my valuation"}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0b]/90 text-[#ff8a1a] transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowIcon />
          </span>
        </button>
      </div>
    </>
  );
}

function Step5({
  range,
  floorReason,
  carrier,
}: {
  range: string;
  floorReason: string | null;
  carrier: Carrier;
}) {
  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a]">
        Your valuation
      </p>
      <h2 className="mt-3 text-[2rem] font-semibold leading-[1] tracking-[-0.035em] text-white md:text-[2.5rem] lg:text-[3rem]">
        {range}
      </h2>
      <p className="mt-3 text-[14px] text-white/55">
        For {carrier.legalName}, USDOT {carrier.dotNumber}
        {carrier.mcNumbers[0] ? ` · MC-${carrier.mcNumbers[0]}` : ""}.
      </p>

      {floorReason && (
        <div className="mt-5 rounded-xl bg-amber-500/[0.08] p-4 ring-1 ring-amber-400/20">
          <p className="text-[13px] leading-relaxed text-amber-200">
            <strong className="font-semibold">Note:</strong> {floorReason} —
            this caps the indicative valuation at our floor. We can still
            buy, but final terms will be confirmed on a call.
          </p>
        </div>
      )}

      <div className="mt-7 rounded-xl bg-white/[0.04] p-5 ring-1 ring-white/10">
        <p className="text-[13px] leading-relaxed text-white/65">
          This is an indicative range based on your FMCSA snapshot.
          Final offer is confirmed on a 15-minute call after we review
          your insurance, MC age, and contract status — then in writing
          within 48 hours.
        </p>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/contact"
          className="text-[13px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
        >
          Have questions? Contact us →
        </Link>
        <a
          href={`mailto:${SITE.email}?subject=Schedule a call about my LLC&body=My USDOT ${carrier.dotNumber} valuation came back as ${encodeURIComponent(range)}.`}
          className="group inline-flex items-center gap-3 rounded-full bg-[#ff8a1a] py-2 pl-5 pr-2 text-sm font-semibold text-[#0a0a0b] transition-all duration-300 hover:bg-[#ffb371]"
        >
          <span>Schedule a call</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0b]/90 text-[#ff8a1a] transition-transform duration-300 group-hover:translate-x-0.5">
            <ChevronIcon />
          </span>
        </a>
      </div>
    </>
  );
}
