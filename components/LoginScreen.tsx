"use client";

import { useState } from "react";
import { ApiError, login, type StoredAuth } from "@/lib/api";

// Shared by /admin and /portal — both authenticate the same way against
// backend-fastapi's self-issued JWT (see lib/api.ts's login()), which works
// for any role with a password_hash set, not just SUPER_ADMIN.
export function LoginScreen({
  title,
  subtitle,
  onLoggedIn,
}: {
  title: string;
  subtitle: string;
  onLoggedIn: (auth: StoredAuth) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await login(email, password);
      onLoggedIn({ token: res.access_token, role: res.role, email: res.email, full_name: res.full_name });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reach the API");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block text-sm text-zinc-300">
          Email
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-accent"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-accent"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.01] disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-xs text-zinc-600">
        Self-issued login (backend-fastapi/app/services/local_auth.py). Invited a new user? They
        need to follow the link emailed to them (see POST /auth/accept-invite) to set a password
        before they can sign in here.
      </p>
    </div>
  );
}

export function Input({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm text-zinc-300">
      {label}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-accent"
      />
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.01]"
    >
      {children}
    </button>
  );
}
