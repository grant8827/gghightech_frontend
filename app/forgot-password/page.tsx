"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError, forgotPassword } from "@/lib/api";
import { Input } from "@/components/LoginScreen";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reach the API");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <h1 className="text-2xl font-semibold text-white">Reset your password</h1>

      {sent ? (
        <>
          <p className="mt-3 text-sm text-zinc-300">
            If <span className="text-white">{email.trim()}</span> has an account, we&apos;ve emailed it a
            link to reset the password. The link expires in 60 minutes.
          </p>
          <p className="mt-3 text-sm text-zinc-400">Not there? Check your spam folder.</p>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-zinc-400">
            Enter your account email and we&apos;ll send you a link to choose a new password.
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input label="Email" value={email} onChange={setEmail} required type="email" />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.01] disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-sm">
        <Link href="/login" className="text-accent-light hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
