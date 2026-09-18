"use client";

import { useState } from "react";
import type { OrganizationOut } from "@/lib/api";
import { Input, SubmitButton } from "@/components/LoginScreen";

const CLIENT_ROLES = ["CLIENT_ADMIN", "CLIENT_VIEWER"];

export function ClientsTab({
  orgs,
  onCreateOrg,
  onInvite,
}: {
  orgs: OrganizationOut[];
  onCreateOrg: (name: string, domain: string) => Promise<OrganizationOut | null>;
  onInvite: (orgId: string, email: string, fullName: string, role: string) => Promise<boolean>;
}) {
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState(CLIENT_ROLES[0]);

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    const org = await onCreateOrg(orgName, orgDomain);
    if (org) {
      setOrgName("");
      setOrgDomain("");
      setSelectedOrgId(org.id);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrgId) return;
    const ok = await onInvite(selectedOrgId, inviteEmail, inviteName, inviteRole);
    if (ok) {
      setInviteEmail("");
      setInviteName("");
    }
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-white">Clients</h2>
      <p className="mt-1 text-sm text-zinc-400">Create organizations and invite their users into the portal.</p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-medium text-white">Create organization</h3>
          <form onSubmit={handleCreateOrg} className="mt-4 space-y-3">
            <Input label="Name" value={orgName} onChange={setOrgName} required />
            <Input label="Domain (optional)" value={orgDomain} onChange={setOrgDomain} />
            <SubmitButton>Create organization</SubmitButton>
          </form>

          <h4 className="mt-8 text-sm font-medium text-zinc-300">Existing organizations</h4>
          <ul className="mt-3 space-y-2">
            {orgs.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => setSelectedOrgId(o.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedOrgId === o.id
                      ? "border-accent bg-accent/10 text-white"
                      : "border-white/10 text-zinc-300 hover:border-white/30"
                  }`}
                >
                  {o.name} <span className="text-zinc-500">({o.plan_tier})</span>
                </button>
              </li>
            ))}
            {orgs.length === 0 && <p className="text-sm text-zinc-500">None yet.</p>}
          </ul>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-medium text-white">Invite client user</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Selected org: {orgs.find((o) => o.id === selectedOrgId)?.name ?? "none — pick one on the left"}
          </p>
          <form onSubmit={handleInvite} className="mt-4 space-y-3">
            <Input label="Email" value={inviteEmail} onChange={setInviteEmail} required type="email" />
            <Input label="Full name" value={inviteName} onChange={setInviteName} required />
            <label className="block text-sm text-zinc-300">
              Role
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              >
                {CLIENT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton>Send invite</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
