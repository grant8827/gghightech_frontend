// Tracks which signed contracts this admin has already seen, for the
// "newly signed" badge on the admin Invoicing / Contracts tab. Stored per
// browser: it's a convenience, not a record. Storage can be unavailable
// (private mode, blocked site data), so every access is guarded and the
// fallback is "never seen" — the badge then shows signed contracts again
// rather than hiding any.

import type { ContractOut } from "@/lib/api";

const KEY = "gghightech_contracts_signed_seen_at";

export function signedSeenAt(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function markSignedSeen(): void {
  try {
    localStorage.setItem(KEY, new Date().toISOString());
  } catch {
    // Not persisted; the badge will show again next visit.
  }
}

// ISO timestamps compare correctly as strings when both are UTC.
export const isNewlySigned = (c: ContractOut, seenAt: string) =>
  c.status === "SIGNED" && !!c.signed_at && new Date(c.signed_at).toISOString() > seenAt;
