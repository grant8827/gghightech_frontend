"use client";

import { useEffect, useState } from "react";
import { deleteUser, inviteUser, listUsers, type OrganizationOut, type UserOut } from "@/lib/api";
import { Input, SubmitButton } from "@/components/LoginScreen";

// Mirrored from backend-fastapi/app/models/user.py USER_ROLES — the
// non-client subset. Staff always belong to the internal org (plan_tier
// "INTERNAL"), not a client organization, even though the User row's
// org_id column is required either way.
const STAFF_ROLES = ["LEAD_ENGINEER", "PROJECT_MANAGER", "SUPER_ADMIN"];

export function StaffTab({
  token,
  orgs,
  currentUserEmail,
  currentUserRole,
  onError,
}: {
  token: string;
  orgs: OrganizationOut[];
  currentUserEmail: string;
  currentUserRole: string;
  onError: (e: unknown) => void;
}) {
  const internalOrg = orgs.find((o) => o.plan_tier === "INTERNAL");

  const [users, setUsers] = useState<UserOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState(STAFF_ROLES[0]);

  async function refresh() {
    try {
      setUsers(await listUsers(token));
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!internalOrg) return;
    setBusyId("new");
    setNotice(null);
    try {
      await inviteUser(token, { org_id: internalOrg.id, email, full_name: fullName, role });
      setEmail("");
      setFullName("");
      setNotice(`Invited ${email}. (Email delivery is stubbed — see app/services/email.py.)`);
      await refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(id: string) {
    setBusyId(id);
    try {
      await deleteUser(token, id);
      await refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  const staff = users.filter((u) => STAFF_ROLES.includes(u.role));

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div>
      <h2 className="text-lg font-medium text-white">Staff</h2>
      <p className="mt-1 text-sm text-zinc-400">Add developers and office staff — everyone who isn&apos;t a client.</p>

      {!internalOrg ? (
        <p className="mt-6 max-w-md rounded-xl border border-white/10 p-4 text-sm text-zinc-500">
          No internal organization found. Create one named e.g. &quot;GG HighTech (Internal)&quot; on the Clients
          tab first — staff accounts are attached to it.
        </p>
      ) : (
        <div className="glass-card mt-6 max-w-md rounded-2xl p-6">
          <h3 className="text-sm font-medium text-white">Add staff member</h3>
          <form onSubmit={handleInvite} className="mt-4 space-y-3">
            <Input label="Full name" value={fullName} onChange={setFullName} required />
            <Input label="Email" value={email} onChange={setEmail} required type="email" />
            <label className="block text-sm text-zinc-300">
              Role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton>{busyId === "new" ? "Sending…" : "Send invite"}</SubmitButton>
          </form>
          {notice && <p className="mt-3 text-xs text-accent-light">{notice}</p>}
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-sm font-medium text-white">Current staff</h3>
        <ul className="mt-3 space-y-2">
          {staff.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-3 text-sm"
            >
              <span className="text-zinc-200">
                <span className="text-white">{u.full_name}</span> · {u.email}
                <span className="ml-2 text-xs text-zinc-500">{u.role}</span>
              </span>
              {currentUserRole === "SUPER_ADMIN" && u.email !== currentUserEmail && (
                <button
                  onClick={() => handleRemove(u.id)}
                  disabled={busyId === u.id}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300 hover:border-red-400/50 disabled:opacity-50"
                >
                  {busyId === u.id ? "…" : "Remove"}
                </button>
              )}
            </li>
          ))}
          {staff.length === 0 && (
            <p className="rounded-xl border border-white/10 p-4 text-center text-sm text-zinc-500">
              No staff added yet.
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}
