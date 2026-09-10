"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  createOrganization,
  createProject,
  estimatePdfUrl,
  inviteUser,
  listEstimates,
  listOrganizations,
  listProjects,
  type EstimateOut,
  type OrganizationOut,
  type ProjectOut,
} from "@/lib/api";

// Roles mirrored from backend-fastapi/app/models/user.py USER_ROLES.
const STAFF_ROLES = ["SUPER_ADMIN", "PROJECT_MANAGER", "LEAD_ENGINEER"];
const CLIENT_ROLES = ["CLIENT_ADMIN", "CLIENT_VIEWER"];

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function AdminPage() {
  // Dev-role fallback: stands in for a real signed-in user until Clerk is
  // configured (see backend-fastapi/app/services/auth.py). Once
  // NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set, this whole switcher goes away
  // and the real Clerk session token is sent instead — see lib/api.ts.
  const [devRole, setDevRole] = useState("SUPER_ADMIN");

  const [orgs, setOrgs] = useState<OrganizationOut[]>([]);
  const [projects, setProjects] = useState<ProjectOut[]>([]);
  const [estimates, setEstimates] = useState<EstimateOut[]>([]);
  const [expandedEstimateId, setExpandedEstimateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");

  const [projectTitle, setProjectTitle] = useState("");
  const [projectSlug, setProjectSlug] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState(CLIENT_ROLES[0]);

  async function refresh() {
    try {
      const [orgsRes, projectsRes, estimatesRes] = await Promise.all([
        listOrganizations(devRole),
        listProjects(devRole),
        listEstimates(devRole),
      ]);
      setOrgs(orgsRes);
      setProjects(projectsRes);
      setEstimates(estimatesRes);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : "Could not reach the API");
    }
  }

  useEffect(() => {
    // Fetch-on-mount/dep-change: refresh() sets state only after its awaits
    // resolve, not synchronously within this effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devRole]);

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    try {
      const org = await createOrganization(devRole, { name: orgName, domain: orgDomain || undefined });
      setOrgName("");
      setOrgDomain("");
      setSelectedOrgId(org.id);
      setNotice(`Organization "${org.name}" created.`);
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : "Failed to create organization");
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!selectedOrgId) {
      setError("Select an organization first");
      return;
    }
    try {
      const project = await createProject(devRole, {
        org_id: selectedOrgId,
        title: projectTitle,
        slug: projectSlug,
      });
      setProjectTitle("");
      setProjectSlug("");
      setNotice(`Project "${project.title}" created.`);
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : "Failed to create project");
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!selectedOrgId) {
      setError("Select an organization first");
      return;
    }
    try {
      await inviteUser(devRole, {
        org_id: selectedOrgId,
        email: inviteEmail,
        full_name: inviteName,
        role: inviteRole,
      });
      setInviteEmail("");
      setInviteName("");
      setNotice(`Invited ${inviteEmail}. (Email delivery is stubbed — see app/services/email.py.)`);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : "Failed to invite user");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Back-Office</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Create organizations, spin up projects, and invite clients (GGH-401).
          </p>
        </div>

        {!clerkEnabled && (
          <label className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs text-amber-200">
            Acting as
            <select
              value={devRole}
              onChange={(e) => setDevRole(e.target.value)}
              className="rounded bg-black/40 px-2 py-1 text-amber-100"
            >
              {[...STAFF_ROLES, ...CLIENT_ROLES].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {!clerkEnabled && (
        <p className="mb-6 text-xs text-zinc-500">
          Clerk isn&apos;t configured yet, so this page uses the dev-auth header above instead of a
          real sign-in. Fill in NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY (frontend) and
          CLERK_* (backend) to switch to real auth.
        </p>
      )}

      {error && <p className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
      {notice && (
        <p className="mb-6 rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-3 text-sm text-cyan-200">{notice}</p>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-medium text-white">1. Create organization</h2>
          <form onSubmit={handleCreateOrg} className="mt-4 space-y-3">
            <Input label="Name" value={orgName} onChange={setOrgName} required />
            <Input label="Domain (optional)" value={orgDomain} onChange={setOrgDomain} />
            <SubmitButton>Create organization</SubmitButton>
          </form>

          <h3 className="mt-8 text-sm font-medium text-zinc-300">Existing organizations</h3>
          <ul className="mt-3 space-y-2">
            {orgs.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => setSelectedOrgId(o.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedOrgId === o.id
                      ? "border-cyan-400 bg-cyan-400/10 text-white"
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

        <div className="flex flex-col gap-8">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-medium text-white">2. Create project</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Selected org: {orgs.find((o) => o.id === selectedOrgId)?.name ?? "none — pick one on the left"}
            </p>
            <form onSubmit={handleCreateProject} className="mt-4 space-y-3">
              <Input label="Title" value={projectTitle} onChange={setProjectTitle} required />
              <Input label="Slug" value={projectSlug} onChange={setProjectSlug} required />
              <SubmitButton>Create project</SubmitButton>
            </form>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-medium text-white">3. Invite client user</h2>
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

      <div className="mt-10">
        <h2 className="text-lg font-medium text-white">All projects</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Health</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-white/10 text-zinc-200">
                  <td className="px-4 py-3">{p.title}</td>
                  <td className="px-4 py-3 text-zinc-400">{p.slug}</td>
                  <td className="px-4 py-3">{p.status}</td>
                  <td className="px-4 py-3">{p.health_score}</td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                    No projects yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-medium text-white">Estimate leads</h2>
        <p className="mt-1 text-sm text-zinc-400">
          What clients typed in the estimator&apos;s &quot;tell us exactly what you want&quot;
          field, next to the price the toggles calculated — check it holds up before following up.
        </p>
        <div className="mt-4 space-y-3">
          {estimates.map((est) => {
            const isOpen = expandedEstimateId === est.id;
            const scope = est.scope_configuration as {
              project_type?: string;
              features?: string[];
              design_tier?: string;
            };
            return (
              <div key={est.id} className="glass-card rounded-xl p-4">
                <button
                  onClick={() => setExpandedEstimateId(isOpen ? null : est.id)}
                  className="flex w-full flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="text-sm font-medium text-white">
                      {est.client_email ?? "No email given"}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500">
                      {scope.project_type?.replace(/_/g, " ")} · {scope.design_tier}
                    </span>
                  </div>
                  <div className="text-sm text-cyan-300">
                    ${est.calculated_min_price.toLocaleString()} - $
                    {est.calculated_max_price.toLocaleString()}
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      What they said they want
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">
                      {est.project_description || "— nothing entered —"}
                    </p>
                    <a
                      href={estimatePdfUrl(est.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-xs text-cyan-300 underline"
                    >
                      View PDF proposal
                    </a>
                  </div>
                )}
              </div>
            );
          })}
          {estimates.length === 0 && (
            <p className="rounded-xl border border-white/10 p-4 text-center text-sm text-zinc-500">
              No estimates submitted yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm text-zinc-300">
      {label}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
      />
    </label>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.01]"
    >
      {children}
    </button>
  );
}
