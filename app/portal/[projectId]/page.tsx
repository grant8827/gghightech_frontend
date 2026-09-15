"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  getProject,
  listMilestones,
  projectUpdatesSocketUrl,
  type MilestoneOut,
  type ProjectOut,
  type StoredAuth,
} from "@/lib/api";
import { AuthGate } from "@/components/AuthGate";
import { StagingPreview } from "@/components/StagingPreview";

export default function PortalProjectPage() {
  return (
    <AuthGate title="Client portal sign-in" subtitle="Sign in to view your project status.">
      {({ auth, onSessionExpired }) => <ProjectDetail auth={auth} onSessionExpired={onSessionExpired} />}
    </AuthGate>
  );
}

function ProjectDetail({ auth, onSessionExpired }: { auth: StoredAuth; onSessionExpired: () => void }) {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectOut | null>(null);
  const [milestones, setMilestones] = useState<MilestoneOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  async function refresh() {
    try {
      const [projectRes, milestonesRes] = await Promise.all([
        getProject(auth.token, projectId),
        listMilestones(auth.token, projectId),
      ]);
      setProject(projectRes);
      setMilestones(milestonesRes);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        onSessionExpired();
        return;
      }
      setError(e instanceof ApiError ? e.message : "Could not reach the API");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // GGH-301 — live updates: any message means "something changed, refetch"
  // (see app/ws.py on the backend). Reconnects with a fixed backoff so a
  // dropped connection (server restart, network blip) doesn't leave the
  // dashboard silently stale; a normal REST refresh() above already
  // rendered the page before this ever connects, so there's no loading
  // state gated on the socket.
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;

    function connect() {
      if (cancelled) return;
      socket = new WebSocket(projectUpdatesSocketUrl(auth.token, projectId));
      socket.onopen = () => setLive(true);
      socket.onmessage = () => refresh();
      socket.onclose = () => {
        setLive(false);
        if (!cancelled) reconnectRef.current = setTimeout(connect, 3000);
      };
      socket.onerror = () => socket?.close();
    }

    connect();
    return () => {
      cancelled = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      socket?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (!project) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        {error ? (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>
        ) : (
          <p className="text-sm text-zinc-500">Loading…</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link href="/portal" className="text-xs text-zinc-500 hover:text-zinc-300">
        ← All projects
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">{project.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {project.status} · {project.overall_progress}% complete
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${
            live
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-white/10 bg-white/5 text-zinc-500"
          }`}
        >
          {live ? "Live" : "Reconnecting…"}
        </span>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-medium text-white">Milestones</h2>
          <ul className="mt-4 space-y-4">
            {milestones.map((m) => (
              <li key={m.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-200">{m.title}</span>
                  <span className="text-zinc-500">{m.progress_percentage}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${m.progress_percentage}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                  <span>{m.status}</span>
                  {m.due_date && <span>Due {m.due_date}</span>}
                </div>
              </li>
            ))}
            {milestones.length === 0 && <p className="text-sm text-zinc-500">No milestones yet.</p>}
          </ul>
        </div>

        <StagingPreview project={project} />
      </div>
    </div>
  );
}
