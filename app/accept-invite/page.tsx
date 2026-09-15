"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, acceptInvite, saveAuth } from "@/lib/api";
import { Input } from "@/components/LoginScreen";

// Roles mirrored from backend-fastapi/app/models/user.py USER_ROLES.
const CLIENT_ROLES = ["CLIENT_ADMIN", "CLIENT_VIEWER"];

export default function AcceptInvitePage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <AcceptInviteForm />
    </Suspense>
  );
}

function AcceptInviteForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await acceptInvite(token, password);
      saveAuth({ token: res.access_token, role: res.role, email: res.email, full_name: res.full_name });
      router.push(CLIENT_ROLES.includes(res.role) ? "/portal" : "/admin");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reach the API");
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
        <h1 className="text-2xl font-semibold text-white">Invalid invite link</h1>
        <p className="mt-1 text-sm text-zinc-400">
          This link is missing its invite token — check you copied the whole URL from the email.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <h1 className="text-2xl font-semibold text-white">Set your password</h1>
      <p className="mt-1 text-sm text-zinc-400">Finish setting up your GG HighTech account.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input label="Password" value={password} onChange={setPassword} required type="password" />
        <Input
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          type="password"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.01] disabled:opacity-50"
        >
          {submitting ? "Setting password…" : "Set password & sign in"}
        </button>
      </form>
    </div>
  );
}
