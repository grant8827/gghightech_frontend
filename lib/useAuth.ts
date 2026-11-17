"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ApiError,
  authSnapshot,
  clearAuth,
  getMe,
  parseStoredAuth,
  saveAuth,
  subscribeAuth,
  type StoredAuth,
} from "@/lib/api";

// One server check per token per page load, shared by every component that
// uses the session (nav + dashboard mount together).
const verified = new Map<string, Promise<void>>();

// The stored role is only a cache: confirm the token is still valid (not
// revoked by "log out", user not deleted) and pick up a role change made
// since sign-in. A rejected token signs this browser out.
function verifySession(auth: StoredAuth): Promise<void> {
  let check = verified.get(auth.token);
  if (!check) {
    check = getMe(auth.token)
      .then((me) => {
        if (me.role !== auth.role || me.email !== auth.email) saveAuth({ ...auth, role: me.role, email: me.email });
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) clearAuth();
        else verified.delete(auth.token); // network blip: try again next time
      });
    verified.set(auth.token, check);
  }
  return check;
}

// The signed-in session, kept live across components and browser tabs.
// `ready` is false during server render / hydration, when localStorage
// can't be read yet — render nothing auth-dependent until it's true.
// `verified` turns true once the server has confirmed this token and role.
export function useAuth(): { auth: StoredAuth | null; ready: boolean; verified: boolean } {
  const raw = useSyncExternalStore(subscribeAuth, authSnapshot, () => undefined);
  const auth = useMemo(() => (raw === undefined ? null : parseStoredAuth(raw)), [raw]);
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    let cancelled = false;
    verifySession(auth).then(() => {
      if (!cancelled) setVerifiedToken(auth.token);
    });
    return () => {
      cancelled = true;
    };
  }, [auth]);

  return { auth, ready: raw !== undefined, verified: !!auth && verifiedToken === auth.token };
}
