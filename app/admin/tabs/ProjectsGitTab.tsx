"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  createMilestone,
  listMilestones,
  listProjectUpdates,
  postProjectUpdate,
  syncProjectGithub,
  updateMilestone,
  updateProject,
  type MilestoneOut,
  type OrganizationOut,
  type ProjectOut,
  type ProjectUpdateOut,
} from "@/lib/api";
import { Input, SubmitButton } from "@/components/LoginScreen";

export function ProjectsGitTab({
  token,
  orgs,
  projects,
  onCreateProject,
  onError,
  onProjectChanged,
}: {
  token: string;
  orgs: OrganizationOut[];
  projects: ProjectOut[];
  onCreateProject: (orgId: string, title: string, slug: string) => Promise<ProjectOut | null>;
  onError: (e: unknown) => void;
  onProjectChanged: () => void;
}) {
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectSlug, setProjectSlug] = useState("");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrgId) {
      onError(new Error("Select an organization first"));
      return;
    }
    const project = await onCreateProject(selectedOrgId, projectTitle, projectSlug);
    if (project) {
      setProjectTitle("");
      setProjectSlug("");
    }
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-white">Projects &amp; Git</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Spin up a project, point it at a GitHub repo, and manage milestones and status updates.
      </p>

      <div className="glass-card mt-6 max-w-md rounded-2xl p-6">
        <h3 className="text-sm font-medium text-white">Create project</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Org: {orgs.find((o) => o.id === selectedOrgId)?.name ?? "none — pick one below"}
        </p>
        <label className="mt-3 block text-sm text-zinc-300">
          Organization
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          >
            <option value="">— select —</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <form onSubmit={handleCreateProject} className="mt-3 space-y-3">
          <Input label="Title" value={projectTitle} onChange={setProjectTitle} required />
          <Input label="Slug" value={projectSlug} onChange={setProjectSlug} required />
          <SubmitButton>Create project</SubmitButton>
        </form>
      </div>

      <div className="mt-10">
        <h3 className="text-sm font-medium text-white">All projects</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Click a project to configure its repo, sync from GitHub, and manage milestones.
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
                <ProjectGitPanel token={token} project={p} onError={onError} onProjectChanged={onProjectChanged} />
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
    </div>
  );
}

const MILESTONE_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED"];

type MilestoneDraft = { progress_percentage: string; amount: string; status: string };

function ProjectGitPanel({
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
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function refresh() {
    try {
      const [m, u] = await Promise.all([listMilestones(token, project.id), listProjectUpdates(token, project.id)]);
      setMilestones(m);
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
          {syncMessage && <span className="text-xs text-zinc-400">{syncMessage}</span>}
        </div>

        <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500">
          {projectDetail.latest_commit_sha && (
            <span>
              Latest commit: <code className="text-zinc-300">{projectDetail.latest_commit_sha.slice(0, 7)}</code>{" "}
              {projectDetail.latest_commit_message}
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
