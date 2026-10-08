"use client";

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
export function AuthGate({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
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

  return <>{children({ auth, onSessionExpired: handleSessionExpired, onLogout: handleLogout })}</>;
}
