"use client";

import { useEffect, useState } from "react";
import { ApiError, createJiraTicket, listJiraTickets, type JiraTicketOut, type ProjectOut } from "@/lib/api";

const ISSUE_TYPES = ["Task", "Bug", "Story"];

export function JiraTicketsTab({
  token,
  projects,
  onError,
}: {
  token: string;
  projects: ProjectOut[];
  onError: (e: unknown) => void;
}) {
  const jiraProjects = projects.filter((p) => p.jira_project_key);
  const [projectId, setProjectId] = useState(jiraProjects[0]?.id ?? "");
  const [tickets, setTickets] = useState<JiraTicketOut[]>([]);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh(id: string) {
    if (!id) {
      setTickets([]);
      return;
    }
    try {
      setTickets(await listJiraTickets(token, id));
    } catch (e) {
      onError(e);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !summary.trim() || !description.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const ticket = await createJiraTicket(token, projectId, { summary, description, issue_type: issueType });
      setSummary("");
      setDescription("");
      setMessage(`Created ${ticket.jira_issue_key}.`);
      await refresh(projectId);
    } catch (e) {
      // Expected today: 503 "Jira isn't connected yet..." — shown plainly,
      // same honesty standard as the GitHub/Jira sync buttons.
      setMessage(e instanceof ApiError ? e.message : "Could not reach the API");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-white">Jira Tickets</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Write a ticket straight into a project&apos;s Jira backlog for developers to pick up.
      </p>

      {jiraProjects.length === 0 ? (
        <p className="mt-6 max-w-md rounded-xl border border-white/10 p-4 text-sm text-zinc-500">
          No project has a Jira project key set yet — set one on the Projects &amp; Git tab first.
        </p>
      ) : (
        <div className="glass-card mt-6 max-w-lg rounded-2xl p-6">
          <label className="block text-sm text-zinc-300">
            Project
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            >
              {jiraProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.jira_project_key})
                </option>
              ))}
            </select>
          </label>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label className="block text-sm text-zinc-300">
              Summary
              <input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-zinc-300">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-zinc-300">
              Issue type
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              >
                {ISSUE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.01] disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create ticket"}
            </button>
          </form>
          {message && <p className="mt-3 text-xs text-zinc-400">{message}</p>}

          <h3 className="mt-8 text-sm font-medium text-zinc-300">Tickets created here</h3>
          <ul className="mt-2 space-y-2">
            {tickets.map((t) => (
              <li key={t.id} className="rounded-lg border border-white/10 p-2 text-sm">
                <a href={t.jira_url} target="_blank" rel="noreferrer" className="text-accent-light underline">
                  {t.jira_issue_key}
                </a>{" "}
                <span className="text-zinc-300">{t.summary}</span>
                <span className="ml-2 text-xs text-zinc-500">{t.issue_type}</span>
              </li>
            ))}
            {tickets.length === 0 && <p className="text-sm text-zinc-500">None yet for this project.</p>}
          </ul>
        </div>
      )}
    </div>
  );
}
