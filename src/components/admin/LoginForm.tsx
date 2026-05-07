"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowIcon } from "@/components/Icons";
import { SITE } from "@/lib/site";

const EASE = [0.16, 1, 0.3, 1] as const;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      // Server already set the cookie. Navigate to the destination.
      router.push(next);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="w-full max-w-md"
    >
      <div className="mb-8 flex flex-col items-center">
        <Link
          href="/"
          aria-label="Veritor home"
          className="inline-flex items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-white/20 transition-shadow hover:ring-white/40"
        >
          <Image
            src="/brand/logo-color-square.png"
            alt="Veritor Group"
            width={32}
            height={32}
            className="h-7 w-7 object-contain"
            priority
          />
          <span className="text-[13px] font-semibold tracking-[-0.01em] text-[#0a0a0b]">
            {SITE.name}
          </span>
        </Link>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a]">
          Admin
        </p>
        <h1 className="mt-2 text-[1.625rem] font-semibold leading-[1.05] tracking-[-0.025em] text-white md:text-[1.875rem]">
          Sign in to your account.
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl bg-white/[0.025] p-6 ring-1 ring-white/10 backdrop-blur-md md:p-8"
      >
        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            placeholder="luka@groupveritor.com"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/35 outline-none transition-all focus:border-[#ff8a1a]/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#ff8a1a]/20"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/35 outline-none transition-all focus:border-[#ff8a1a]/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#ff8a1a]/20"
          />
        </label>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group mt-2 inline-flex items-center justify-center gap-3 rounded-full bg-[#ff8a1a] py-3 pl-5 pr-3 text-sm font-semibold text-[#0a0a0b] transition-all duration-300 hover:bg-[#ffb371] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{loading ? "Signing in…" : "Sign in"}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0b]/90 text-[#ff8a1a] transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowIcon />
          </span>
        </button>

        <p className="mt-2 text-center text-[11px] text-white/35">
          Trouble signing in? Use the emergency URL{" "}
          <code className="rounded bg-white/[0.06] px-1 text-white/55">
            /admin?key=…
          </code>{" "}
          (legacy fallback only).
        </p>
      </form>
    </motion.div>
  );
}
