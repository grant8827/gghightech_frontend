"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { dashboardPathFor, type StoredAuth } from "@/lib/api";

// Single entry point for both audiences: the nav just says "Login" (no
// more separate "Client Portal" / "Admin" links giving away that a staff
// area exists). AuthGate handles the actual sign-in; this page's only job
// is routing the signed-in user to their dashboard afterward — and doing
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
    router.replace(dashboardPathFor(auth.role));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.role]);

  return (
    <div className="mx-auto max-w-sm px-6 py-24 text-center">
      <p className="text-sm text-zinc-500">Signing you in…</p>
    </div>
  );
}
