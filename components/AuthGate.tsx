"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearAuth, loadAuth, logout, saveAuth, type StoredAuth } from "@/lib/api";
import { LoginScreen } from "@/components/LoginScreen";

export type AuthGateRenderProps = {
  auth: StoredAuth;
  onSessionExpired: () => void;
  onLogout: () => void;
};

// Shared login-gate for /admin and /portal: reads a stored session on mount,
// shows LoginScreen if there isn't one, and hands the authenticated session
// (plus logout/session-expired handlers) to children once there is.
export const STAFF_ROLES = ["SUPER_ADMIN", "PROJECT_MANAGER", "LEAD_ENGINEER"];

export function AuthGate({
  title,
  subtitle,
  allowedRoles,
  wrongRole,
  children,
}: {
  title: string;
  subtitle: string;
  // /admin and /portal share one stored session, so a client who signed in
  // on /portal can land on /admin (and vice versa). When given, any other
  // role sees a "wrong account" notice instead of a page whose API calls
  // would all fail with 403.
  allowedRoles?: string[];
  wrongRole?: { message: string; href: string; linkLabel: string };
  children: (props: AuthGateRenderProps) => React.ReactNode;
}) {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);

  useEffect(() => {
    // localStorage isn't available during SSR, so this can only be read
    // client-side on mount — not synchronous app state, an external system.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuth(loadAuth());
    setCheckedStorage(true);
  }, []);

  function handleLoggedIn(next: StoredAuth) {
    saveAuth(next);
    setAuth(next);
  }

  // The server already rejected the token — just forget it locally.
  function handleSessionExpired() {
    clearAuth();
    setAuth(null);
  }

  function handleLogout() {
    // Best-effort: sign out locally even if the API can't be reached.
    if (auth) logout(auth.token).catch(() => {});
    handleSessionExpired();
  }

  if (!checkedStorage) return null; // avoid a login-form flash before localStorage is read

  if (!auth) {
    return <LoginScreen title={title} subtitle={subtitle} onLoggedIn={handleLoggedIn} />;
  }

  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-4 text-sm text-zinc-300">
          You&apos;re signed in as <span className="text-white">{auth.email}</span>.{" "}
          {wrongRole?.message ?? "This account doesn't have access to this page."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {wrongRole && (
            <Link
              href={wrongRole.href}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-105"
            >
              {wrongRole.linkLabel}
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-zinc-200 hover:border-white/30"
          >
            Sign in with another account
          </button>
        </div>
      </div>
    );
  }

  return <>{children({ auth, onSessionExpired: handleSessionExpired, onLogout: handleLogout })}</>;
}
