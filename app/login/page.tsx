"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import type { StoredAuth } from "@/lib/api";

// Roles mirrored from backend-fastapi/app/models/user.py USER_ROLES.
const CLIENT_ROLES = ["CLIENT_ADMIN", "CLIENT_VIEWER"];

// Single entry point for both audiences: the nav just says "Login" (no
// more separate "Client Portal" / "Admin" links giving away that a staff
// area exists). AuthGate handles the actual sign-in; this page's only job
// is routing the signed-in user to the right place afterward — and doing
// the same immediately if they already have a stored session, so
// revisiting /login while signed in skips the form entirely.
export default function LoginPage() {
  return (
    <AuthGate title="Sign in" subtitle="Sign in to your GG HighTech account.">
      {({ auth }) => <RoleRedirect auth={auth} />}
    </AuthGate>
  );
}

function RoleRedirect({ auth }: { auth: StoredAuth }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(CLIENT_ROLES.includes(auth.role) ? "/portal" : "/admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.role]);

  return (
    <div className="mx-auto max-w-sm px-6 py-24 text-center">
      <p className="text-sm text-zinc-500">Signing you in…</p>
    </div>
  );
}
