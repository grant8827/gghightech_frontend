"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { STAFF_ROLES, clearAuth, dashboardPathFor, logout, saveAuth, type StoredAuth } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { LoginScreen } from "@/components/LoginScreen";

export { STAFF_ROLES };

export type AuthGateRenderProps = {
  auth: StoredAuth;
  onSessionExpired: () => void;
  onLogout: () => void;
};

// Signs the current browser out: ends the session on the server (best
// effort) and forgets it locally. Shared by the dashboards and the site nav.
export function signOut(auth: StoredAuth | null) {
  if (auth) logout(auth.token).catch(() => {});
  clearAuth();
}

// Login gate for /admin, /portal and /login. Shows LoginScreen when there's
// no session; otherwise hands it to children (useAuth re-checks it with the
// server). With `allowedRoles`, any other role is sent to its own
// dashboard instead (a client can only ever reach /portal, staff /admin).
// This is UX only — the API enforces every role itself.
export function AuthGate({
  title,
  subtitle,
  allowedRoles,
  children,
}: {
  title: string;
  subtitle: string;
  allowedRoles?: string[];
  children: (props: AuthGateRenderProps) => React.ReactNode;
}) {
  const router = useRouter();
  const { auth, ready, verified } = useAuth();
  const allowed = !auth || !allowedRoles || allowedRoles.includes(auth.role);

  // Only redirect on the server-confirmed role, never on a stored one.
  useEffect(() => {
    if (auth && verified && !allowed) router.replace(dashboardPathFor(auth.role));
  }, [auth, verified, allowed, router]);

  if (!ready) return null; // avoid a login-form flash before localStorage is read

  if (!auth) {
    return <LoginScreen title={title} subtitle={subtitle} onLoggedIn={saveAuth} />;
  }

  // Nothing role-specific renders until the server has confirmed the
  // session — a hand-edited role in localStorage never even gets the shell.
  if (!verified || !allowed) {
    return (
      <div className="mx-auto max-w-sm px-6 py-24 text-center">
        <p className="text-sm text-zinc-500">{verified ? "Taking you to your dashboard…" : "Checking your session…"}</p>
      </div>
    );
  }

  return <>{children({ auth, onSessionExpired: clearAuth, onLogout: () => signOut(auth) })}</>;
}
