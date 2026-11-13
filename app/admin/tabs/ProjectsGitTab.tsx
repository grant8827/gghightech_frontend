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
  type ProjectCreate,
  type ProjectOut,
  type ProjectUpdateOut,
} from "@/lib/api";
import { RecentWork } from "@/components/RecentWork";

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
  onCreateProject: (payload: ProjectCreate) => Promise<ProjectOut | null>;
  onError: (e: unknown) => void;
  onProjectChanged: () => void;
}) {
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectSlug, setProjectSlug] = useState("");
  // Until the slug is edited by hand, it follows the title.
  const [slugEdited, setSlugEdited] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [newLiveUrl, setNewLiveUrl] = useState("");
  const [newStagingUrl, setNewStagingUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const slugify = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrgId) {
      onError(new Error("Select an organization first"));
      return;
    }
    setCreating(true);
    const project = await onCreateProject({
      org_id: selectedOrgId,
      title: projectTitle.trim(),
      slug: projectSlug.trim(),
      repository_url: newRepoUrl.trim() || undefined,
      live_url: newLiveUrl.trim() || undefined,
      staging_url: newStagingUrl.trim() || undefined,
    });
    setCreating(false);
    if (project) {
      setProjectTitle("");
      setProjectSlug("");
      setSlugEdited(false);
      setNewRepoUrl("");
      setNewLiveUrl("");
      setNewStagingUrl("");
      // Open the new project's settings so milestones can be added next.
      setExpandedProjectId(project.id);
    }
  }

  const fieldClass = "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white";

  return (
    <div>
      <h2 className="text-lg font-medium text-white">Projects &amp; Git</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Create a project with its GitHub repo and domain, then manage milestones and updates. Everything here shows
        on the client&apos;s dashboard.
      </p>

      <div className="glass-card mt-6 max-w-2xl rounded-2xl p-6">
        <h3 className="text-sm font-medium text-white">Create project</h3>
        <form onSubmit={handleCreateProject} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Organization (client)
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              required
              className={fieldClass}
            >
              <option value="">Select a client</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-zinc-300">
            Title
            <input
              value={projectTitle}
              onChange={(e) => {
                setProjectTitle(e.target.value);
                if (!slugEdited) setProjectSlug(slugify(e.target.value));
              }}
              required
              placeholder="Acme website"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Slug <span className="text-xs text-zinc-500">(short ID, auto-filled)</span>
            <input
              value={projectSlug}
              onChange={(e) => {
                setProjectSlug(e.target.value);
                setSlugEdited(true);
              }}
              required
              pattern="[a-z0-9-]+"
              title="Lowercase letters, numbers and dashes"
              placeholder="acme-website"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            GitHub repository <span className="text-xs text-zinc-500">(optional)</span>
            <input
              value={newRepoUrl}
              onChange={(e) => setNewRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Live domain <span className="text-xs text-zinc-500">(optional)</span>
            <input
              value={newLiveUrl}
              onChange={(e) => setNewLiveUrl(e.target.value)}
              placeholder="clientsite.com"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Staging / preview URL <span className="text-xs text-zinc-500">(optional)</span>
            <input
              value={newStagingUrl}
              onChange={(e) => setNewStagingUrl(e.target.value)}
              placeholder="staging.clientsite.com"
              className={fieldClass}
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-[1.01] disabled:opacity-50 sm:col-span-2"
          >
            {creating ? "Creating…" : "Create project"}
          </button>
        </form>
      </div>

      <div className="mt-10">
        <h3 className="text-sm font-medium text-white">All projects</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Click a project to edit its GitHub repo, domain and staging URL, sync from GitHub, and manage milestones.
        </p>
        <div className="mt-4 space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="glass-card rounded-xl p-4">
              <button
                onClick={() => setExpandedProjectId(expandedProjectId === p.id ? null : p.id)}
                aria-expanded={expandedProjectId === p.id}
                className="flex w-full flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="text-sm font-medium text-white">{p.title}</span>
                  <span className="ml-2 text-xs text-zinc-500">{p.slug}</span>
                  {p.live_url && <span className="ml-2 text-xs text-emerald-300/80">{p.live_url.replace(/^https?:\/\//, "")}</span>}
                  {p.repository_url && (
                    <span className="ml-2 text-xs text-zinc-500">{p.repository_url.replace("https://github.com/", "")}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <span>
                    {STAGES.find((st) => st.id === p.status)?.label ?? p.status} · Health {p.health_score}
                  </span>
                  <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-zinc-300">
                    {expandedProjectId === p.id ? "Close ▴" : "Repo, domain & milestones ▾"}
                  </span>
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

// The client dashboard's stage tracker (components/ProjectCharts.tsx), in
// order. A project's status is the furthest stage it has reached.
const STAGES = [
  { id: "DISCOVERY", label: "Discovery" },
  { id: "IN_PROGRESS", label: "Build" },
  { id: "QA", label: "Testing" },
  { id: "DELIVERED", label: "Launched" },
] as const;

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
  const [liveUrl, setLiveUrl] = useState(project.live_url ?? "");
  const [syncFailed, setSyncFailed] = useState(false);
  const [stageMessage, setStageMessage] = useState<string | null>(null);
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

  async function handleStageToggle(index: number, checked: boolean) {
    // Ticking a stage marks it and everything before it as reached;
    // unticking it steps back to the stage before. Discovery is the start
    // and can't be unticked.
    const target = checked ? index : index - 1;
    const status = STAGES[Math.max(0, target)].id;
    if (status === projectDetail.status) return;
    setBusyId("stage");
    setStageMessage(null);
    try {
      const updated = await updateProject(token, project.id, { status });
      setProjectDetail(updated);
      setStageMessage(`Saved. The client now sees “${STAGES[Math.max(0, target)].label}”.`);
      onProjectChanged();
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function syncNow(): Promise<ProjectOut | null> {
    try {
      const updated = await syncProjectGithub(token, project.id);
      setProjectDetail(updated);
      setSyncFailed(false);
      return updated;
    } catch (e) {
      setSyncFailed(true);
      setSyncMessage(`GitHub sync failed: ${e instanceof ApiError ? e.message : "could not reach the API"}`);
      return null;
    }
  }

  async function handleSaveRepoSettings(e: React.FormEvent) {
    e.preventDefault();
    setBusyId("repo-settings");
    setSyncMessage(null);
    setSyncFailed(false);
    try {
      // Blank sends null, which clears the field.
      const updated = await updateProject(token, project.id, {
        repository_url: repoUrl.trim() || null,
        live_url: liveUrl.trim() || null,
        staging_url: stagingUrl.trim() || null,
        jira_project_key: jiraKey.trim() || null,
      });
      setProjectDetail(updated);
      // Show the cleaned-up values the server stored (e.g. https:// added).
      setRepoUrl(updated.repository_url ?? "");
      setLiveUrl(updated.live_url ?? "");
      setStagingUrl(updated.staging_url ?? "");
      setSyncMessage("Saved.");
      if (updated.repository_url) {
        const synced = await syncNow();
        if (synced) setSyncMessage(`Saved and synced ${synced.recent_commits?.length ?? 0} recent commits.`);
      }
      onProjectChanged();
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSyncGithub() {
    setBusyId("sync-github");
    setSyncMessage(null);
    const synced = await syncNow();
    if (synced) {
      setSyncMessage(`Synced: ${synced.latest_commit_sha?.slice(0, 7)} ${synced.latest_commit_message ?? ""}`);
      onProjectChanged();
    }
    setBusyId(null);
  }

  if (loading) return <p className="mt-4 text-sm text-zinc-500">Loading…</p>;

  return (
    <div className="mt-4 space-y-6 border-t border-white/10 pt-4">
      <fieldset>
        <legend className="text-sm font-medium text-zinc-300">Project stage</legend>
        <p className="mt-1 text-xs text-zinc-500">
          Tick each stage as the project reaches it. The client&apos;s dashboard updates straight away.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STAGES.map((stage, i) => {
            const reached = Math.max(0, STAGES.findIndex((st) => st.id === projectDetail.status));
            const checked = i <= reached;
            const locked = i === 0;
            return (
              <label
                key={stage.id}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  checked ? "border-accent/50 bg-accent/10 text-white" : "border-white/10 text-zinc-400 hover:border-white/30"
                } ${locked || busyId === "stage" ? "cursor-default" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={locked || busyId === "stage"}
                  onChange={(e) => handleStageToggle(i, e.target.checked)}
                  className="h-4 w-4 accent-[#e8b84b]"
                />
                <span className="text-xs text-zinc-500">{i + 1}.</span>
                {stage.label}
              </label>
            );
          })}
        </div>
        {stageMessage && (
          <p role="status" className="mt-2 text-xs text-zinc-400">
            {stageMessage}
          </p>
        )}
      </fieldset>

      <div>
        <h3 className="text-sm font-medium text-zinc-300">Git repository &amp; domain</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Shown on the client&apos;s dashboard. The repo&apos;s latest commits appear there as &ldquo;Latest from our
          developers&rdquo; and refresh automatically every 15 minutes.
        </p>
        <form onSubmit={handleSaveRepoSettings} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-zinc-400">
            GitHub repository
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="mt-1 block w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            />
          </label>
          <label className="text-xs text-zinc-400">
            Live domain
            <input
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="clientsite.com"
              className="mt-1 block w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            />
          </label>
          <label className="text-xs text-zinc-400">
            Staging / preview URL
            <input
              value={stagingUrl}
              onChange={(e) => setStagingUrl(e.target.value)}
              placeholder="https://staging.clientsite.com"
              className="mt-1 block w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            />
          </label>
          <label className="text-xs text-zinc-400">
            Jira project key <span className="text-zinc-600">(optional)</span>
            <input
              value={jiraKey}
              onChange={(e) => setJiraKey(e.target.value)}
              placeholder="ALPHA"
              className="mt-1 block w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={busyId === "repo-settings"}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-black disabled:opacity-50"
            >
              {busyId === "repo-settings" ? "Saving…" : "Save & sync"}
            </button>
            <button
              type="button"
              onClick={handleSyncGithub}
              disabled={busyId !== null || !projectDetail.repository_url}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:border-accent/50 disabled:opacity-50"
            >
              {busyId === "sync-github" ? "Syncing…" : "Sync from GitHub now"}
            </button>
            {syncMessage && (
              <span role="status" className={`text-xs ${syncFailed ? "text-red-300" : "text-zinc-400"}`}>
                {syncMessage}
              </span>
            )}
          </div>
        </form>

        {(projectDetail.recent_commits?.length ?? 0) > 0 ? (
          <div className="mt-4 rounded-lg border border-white/10 p-3">
            <p className="mb-2 text-xs text-zinc-500">What the client sees:</p>
            <RecentWork project={projectDetail} limit={3} />
          </div>
        ) : (
          projectDetail.repository_url && (
            <p className="mt-3 text-xs text-zinc-500">No commits synced yet.</p>
          )
        )}
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
