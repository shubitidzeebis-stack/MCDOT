import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — Veritor Admin",
  robots: { index: false, follow: false },
};

// Suspense wraps `LoginForm` because it calls `useSearchParams()`, which
// requires a Suspense boundary during static prerender per Next.js 16.
export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0b] p-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
