"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  createInvoice,
  createMilestone,
  createOrganization,
  createProject,
  estimatePdfUrl,
  inviteUser,
  listEstimates,
  listInvoices,
  listMilestones,
  listOrganizations,
  listProjects,
  listProjectUpdates,
  markInvoicePaid,
  postProjectUpdate,
  syncProjectGithub,
  syncProjectJira,
  updateMilestone,
  updateProject,
  type EstimateOut,
  type InvoiceOut,
  type MilestoneOut,
  type OrganizationOut,
  type ProjectOut,
  type ProjectUpdateOut,
  type StoredAuth,
} from "@/lib/api";
import { AuthGate } from "@/components/AuthGate";
import { Input, SubmitButton } from "@/components/LoginScreen";

// Roles mirrored from backend-fastapi/app/models/user.py USER_ROLES.
const CLIENT_ROLES = ["CLIENT_ADMIN", "CLIENT_VIEWER"];

export default function AdminPage() {
  return (
    <AuthGate title="Admin sign in" subtitle="GG HighTech staff only.">
      {({ auth, onSessionExpired, onLogout }) => (
        <AdminDashboard auth={auth} onSessionExpired={onSessionExpired} onLogout={onLogout} />
      )}
    </AuthGate>
  );
}

function AdminDashboard({
  auth,
  onSessionExpired,
  onLogout,
}: {
  auth: StoredAuth;
  onSessionExpired: () => void;
  onLogout: () => void;
}) {
  const [orgs, setOrgs] = useState<OrganizationOut[]>([]);
  const [projects, setProjects] = useState<ProjectOut[]>([]);
  const [estimates, setEstimates] = useState<EstimateOut[]>([]);
  const [expandedEstimateId, setExpandedEstimateId] = useState<string | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
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

  function handleError(e: unknown, fallback: string) {
    if (e instanceof ApiError) {
      if (e.status === 401) {
        onSessionExpired();
        return;
      }
      setError(`${e.status}: ${e.message}`);
      return;
    }
    setError(fallback);
  }

  async function refresh() {
    try {
      const [orgsRes, projectsRes, estimatesRes] = await Promise.all([
        listOrganizations(auth.token),
        listProjects(auth.token),
        listEstimates(auth.token),
      ]);
      setOrgs(orgsRes);
      setProjects(projectsRes);
      setEstimates(estimatesRes);
      setError(null);
    } catch (e) {
      handleError(e, "Could not reach the API");
    }
  }

  useEffect(() => {
    // Fetch-on-mount: refresh() sets state only after its awaits resolve,
    // not synchronously within this effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    try {
      const org = await createOrganization(auth.token, { name: orgName, domain: orgDomain || undefined });
      setOrgName("");
      setOrgDomain("");
      setSelectedOrgId(org.id);
      setNotice(`Organization "${org.name}" created.`);
      refresh();
    } catch (e) {
      handleError(e, "Failed to create organization");
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
      const project = await createProject(auth.token, {
        org_id: selectedOrgId,
        title: projectTitle,
        slug: projectSlug,
      });
      setProjectTitle("");
      setProjectSlug("");
      setNotice(`Project "${project.title}" created.`);
      refresh();
    } catch (e) {
      handleError(e, "Failed to create project");
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
      await inviteUser(auth.token, {
        org_id: selectedOrgId,
        email: inviteEmail,
        full_name: inviteName,
        role: inviteRole,
      });
      setInviteEmail("");
      setInviteName("");
      setNotice(`Invited ${inviteEmail}. (Email delivery is stubbed — see app/services/email.py.)`);
    } catch (e) {
      handleError(e, "Failed to invite user");
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

        <div className="flex items-center gap-3">
          <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent-light">
            {auth.full_name} · {auth.role}
          </span>
          <button
            onClick={onLogout}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 hover:border-white/30"
          >
            Log out
          </button>
        </div>
      </div>

      {error && <p className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
      {notice && (
        <p className="mb-6 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent-light">{notice}</p>
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
        <p className="mt-1 text-sm text-zinc-400">
          Click a project to manage milestones, post team updates, and track invoices.
        </p>
        <div className="mt-4 space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="glass-card rounded-xl p-4">
              <button
                onClick={() => setExpandedProjectId(expandedProjectId === p.id ? null : p.id)}
                className="flex w-full flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="text-sm font-medium text-white">{p.title}</span>
                  <span className="ml-2 text-xs text-zinc-500">{p.slug}</span>
                </div>
                <div className="text-sm text-zinc-400">
                  {p.status} · Health {p.health_score}
                </div>
              </button>

              {expandedProjectId === p.id && (
                <ProjectManagementPanel
                  token={auth.token}
                  project={p}
                  onError={(e) => handleError(e, "Request failed")}
                  onProjectChanged={refresh}
                />
              )}
            </div>
          ))}
          {projects.length === 0 && (
            <p className="rounded-xl border border-white/10 p-4 text-center text-sm text-zinc-500">
              No projects yet.
            </p>
          )}
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
                    {est.client_phone && (
                      <span className="ml-2 text-sm text-zinc-400">· {est.client_phone}</span>
                    )}
                    <span className="ml-2 text-xs text-zinc-500">
                      {scope.project_type?.replace(/_/g, " ")} · {scope.design_tier}
                    </span>
                  </div>
                  <div className="text-sm text-accent-light">
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
                      className="mt-3 inline-block text-xs text-accent-light underline"
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

const MILESTONE_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED"];

type MilestoneDraft = { progress_percentage: string; amount: string; status: string };

function ProjectManagementPanel({
  token,
  project,
  onError,
  onProjectChanged,
}: {
  token: string;
  project: ProjectOut;
  onError: (e: unknown) => void;
  onProjectChanged: () => void;
}) {
  const [projectDetail, setProjectDetail] = useState<ProjectOut>(project);
  const [milestones, setMilestones] = useState<MilestoneOut[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOut[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdateOut[]>([]);
  const [drafts, setDrafts] = useState<Record<string, MilestoneDraft>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");

  const [repoUrl, setRepoUrl] = useState(project.repository_url ?? "");
  const [stagingUrl, setStagingUrl] = useState(project.staging_url ?? "");
  const [jiraKey, setJiraKey] = useState(project.jira_project_key ?? "");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function refresh() {
    try {
      const [m, i, u] = await Promise.all([
        listMilestones(token, project.id),
        listInvoices(token, project.id),
        listProjectUpdates(token, project.id),
      ]);
      setMilestones(m);
      setInvoices(i);
      setUpdates(u);
      setDrafts(
        Object.fromEntries(
          m.map((ms) => [
            ms.id,
            {
              progress_percentage: String(ms.progress_percentage),
              amount: ms.amount != null ? String(ms.amount) : "",
              status: ms.status,
            },
          ]),
        ),
      );
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
  }, [project.id]);

  async function handleSaveMilestone(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setBusyId(id);
    try {
      await updateMilestone(token, id, {
        progress_percentage: Number(draft.progress_percentage),
        status: draft.status,
        amount: draft.amount ? Number(draft.amount) : undefined,
      });
      await refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateMilestone(e: React.FormEvent) {
    e.preventDefault();
    setBusyId("new");
    try {
      await createMilestone(token, {
        project_id: project.id,
        title: newTitle,
        amount: newAmount ? Number(newAmount) : undefined,
      });
      setNewTitle("");
      setNewAmount("");
      await refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function handlePostUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!updateMessage.trim()) return;
    setBusyId("update");
    try {
      await postProjectUpdate(token, project.id, updateMessage);
      setUpdateMessage("");
      await refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkPaid(id: string) {
    setBusyId(id);
    try {
      await markInvoicePaid(token, id);
      await refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveRepoSettings(e: React.FormEvent) {
    e.preventDefault();
    setBusyId("repo-settings");
    setSyncMessage(null);
    try {
      const updated = await updateProject(token, project.id, {
        repository_url: repoUrl || undefined,
        staging_url: stagingUrl || undefined,
        jira_project_key: jiraKey || undefined,
      });
      setProjectDetail(updated);
      onProjectChanged();
      setSyncMessage("Saved.");
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSyncGithub() {
    setBusyId("sync-github");
    setSyncMessage(null);
    try {
      const updated = await syncProjectGithub(token, project.id);
      setProjectDetail(updated);
      onProjectChanged();
      setSyncMessage(`Synced: ${updated.latest_commit_sha?.slice(0, 7)} — ${updated.latest_commit_message}`);
    } catch (e) {
      setSyncMessage(e instanceof ApiError ? e.message : "Could not reach the API");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSyncJira() {
    setBusyId("sync-jira");
    setSyncMessage(null);
    try {
      const updated = await syncProjectJira(token, project.id);
      setProjectDetail(updated);
      onProjectChanged();
      setSyncMessage(`Synced: ${updated.jira_done_count}/${updated.jira_issue_count} issues done`);
    } catch (e) {
      // Expected today: 503 "Jira isn't connected yet..." — shown plainly,
      // same honesty standard as the portal's Stripe-stubbed "Pay" button.
      setSyncMessage(e instanceof ApiError ? e.message : "Could not reach the API");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceDescription.trim() || !invoiceAmount) return;
    setBusyId("new-invoice");
    try {
      await createInvoice(token, {
        project_id: project.id,
        amount: Number(invoiceAmount),
        description: invoiceDescription,
      });
      setInvoiceDescription("");
      setInvoiceAmount("");
      await refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="mt-4 text-sm text-zinc-500">Loading…</p>;

  return (
    <div className="mt-4 space-y-6 border-t border-white/10 pt-4">
      <div>
        <h3 className="text-sm font-medium text-zinc-300">Repository &amp; Integrations</h3>
        <form onSubmit={handleSaveRepoSettings} className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-xs text-zinc-400">
            Repository URL
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="mt-1 block w-56 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
            />
          </label>
          <label className="text-xs text-zinc-400">
            Staging URL
            <input
              value={stagingUrl}
              onChange={(e) => setStagingUrl(e.target.value)}
              placeholder="https://staging.example.com"
              className="mt-1 block w-56 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
            />
          </label>
          <label className="text-xs text-zinc-400">
            Jira project key
            <input
              value={jiraKey}
              onChange={(e) => setJiraKey(e.target.value)}
              placeholder="ALPHA"
              className="mt-1 block w-28 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
            />
          </label>
          <button
            type="submit"
            disabled={busyId === "repo-settings"}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 hover:border-accent/50 disabled:opacity-50"
          >
            {busyId === "repo-settings" ? "Saving…" : "Save"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncGithub}
            disabled={busyId === "sync-github"}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 hover:border-accent/50 disabled:opacity-50"
          >
            {busyId === "sync-github" ? "Syncing…" : "Sync from GitHub"}
          </button>
          <button
            onClick={handleSyncJira}
            disabled={busyId === "sync-jira"}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 hover:border-accent/50 disabled:opacity-50"
          >
            {busyId === "sync-jira" ? "Syncing…" : "Sync from Jira"}
          </button>
          {syncMessage && <span className="text-xs text-zinc-400">{syncMessage}</span>}
        </div>

        <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500">
          {projectDetail.latest_commit_sha && (
            <span>
              Latest commit: <code className="text-zinc-300">{projectDetail.latest_commit_sha.slice(0, 7)}</code>{" "}
              {projectDetail.latest_commit_message}
            </span>
          )}
          {projectDetail.jira_synced_at && (
            <span>
              Jira: {projectDetail.jira_done_count}/{projectDetail.jira_issue_count} issues done
            </span>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-300">Milestones</h3>
        <ul className="mt-2 space-y-2">
          {milestones.map((m) => {
            const draft = drafts[m.id] ?? { progress_percentage: "0", amount: "", status: m.status };
            return (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 p-2 text-sm"
              >
                <span className="min-w-30 text-zinc-200">{m.title}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.progress_percentage}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [m.id]: { ...draft, progress_percentage: e.target.value } }))
                  }
                  className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 text-white"
                />
                <span className="text-xs text-zinc-500">%</span>
                <select
                  value={draft.status}
                  onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: { ...draft, status: e.target.value } }))}
                  className="rounded border border-white/10 bg-white/5 px-2 py-1 text-white"
                >
                  {MILESTONE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Amount $"
                  value={draft.amount}
                  onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: { ...draft, amount: e.target.value } }))}
                  className="w-24 rounded border border-white/10 bg-white/5 px-2 py-1 text-white"
                />
                <button
                  onClick={() => handleSaveMilestone(m.id)}
                  disabled={busyId === m.id}
                  className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-black disabled:opacity-50"
                >
                  {busyId === m.id ? "…" : "Save"}
                </button>
                {m.approved_at && <span className="text-xs text-emerald-300">Approved</span>}
              </li>
            );
          })}
          {milestones.length === 0 && <p className="text-sm text-zinc-500">No milestones yet.</p>}
        </ul>
        <form onSubmit={handleCreateMilestone} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs text-zinc-400">
            New milestone
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="mt-1 block w-48 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
            />
          </label>
          <label className="text-xs text-zinc-400">
            Amount $
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="mt-1 block w-24 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
            />
          </label>
          <button
            type="submit"
            disabled={busyId === "new"}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 hover:border-accent/50 disabled:opacity-50"
          >
            {busyId === "new" ? "Adding…" : "Add"}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-300">Invoices</h3>
        <ul className="mt-2 space-y-2">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between rounded-lg border border-white/10 p-2 text-sm">
              <span className="text-zinc-200">
                ${inv.amount.toLocaleString()} · {inv.status}
                {inv.description && <span className="text-zinc-500"> — {inv.description}</span>}
              </span>
              {inv.status === "PENDING" && (
                <button
                  onClick={() => handleMarkPaid(inv.id)}
                  disabled={busyId === inv.id}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 hover:border-accent/50 disabled:opacity-50"
                >
                  {busyId === inv.id ? "…" : "Mark Paid"}
                </button>
              )}
            </li>
          ))}
          {invoices.length === 0 && <p className="text-sm text-zinc-500">No invoices yet.</p>}
        </ul>
        <form onSubmit={handleCreateInvoice} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs text-zinc-400">
            New invoice — for
            <input
              value={invoiceDescription}
              onChange={(e) => setInvoiceDescription(e.target.value)}
              placeholder="e.g. March 2026 retainer"
              required
              className="mt-1 block w-56 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
            />
          </label>
          <label className="text-xs text-zinc-400">
            Amount $
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={invoiceAmount}
              onChange={(e) => setInvoiceAmount(e.target.value)}
              required
              className="mt-1 block w-24 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
            />
          </label>
          <button
            type="submit"
            disabled={busyId === "new-invoice"}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 hover:border-accent/50 disabled:opacity-50"
          >
            {busyId === "new-invoice" ? "Creating…" : "Create invoice"}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-300">Post an update</h3>
        <form onSubmit={handlePostUpdate} className="mt-2 flex flex-col gap-2">
          <textarea
            value={updateMessage}
            onChange={(e) => setUpdateMessage(e.target.value)}
            rows={2}
            placeholder="e.g. Integrated Stripe payment webhooks for tier upgrades."
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busyId === "update"}
            className="self-start rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-black disabled:opacity-50"
          >
            {busyId === "update" ? "Posting…" : "Post update"}
          </button>
        </form>
        <ul className="mt-3 space-y-2">
          {updates.map((u) => (
            <li key={u.id} className="text-xs text-zinc-400">
              <span className="text-zinc-300">{u.author_name}:</span> {u.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
