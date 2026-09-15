"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, listProjects, type ProjectOut, type StoredAuth } from "@/lib/api";
import { AuthGate } from "@/components/AuthGate";

export default function PortalPage() {
  return (
    <AuthGate title="Client portal sign-in" subtitle="Sign in to view your project status.">
      {({ auth, onSessionExpired, onLogout }) => (
        <ProjectList auth={auth} onSessionExpired={onSessionExpired} onLogout={onLogout} />
      )}
    </AuthGate>
  );
}

function ProjectList({
  auth,
  onSessionExpired,
  onLogout,
}: {
  auth: StoredAuth;
  onSessionExpired: () => void;
  onLogout: () => void;
}) {
  const [projects, setProjects] = useState<ProjectOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProjects(auth.token)
      .then((res) => {
        setProjects(res);
        setError(null);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          onSessionExpired();
          return;
        }
        setError(e instanceof ApiError ? e.message : "Could not reach the API");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Your projects</h1>
          <p className="mt-1 text-sm text-zinc-400">Live status, milestones, and staging previews.</p>
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

      {error && (
        <p className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>
      )}

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/portal/${p.id}`}
            className="glass-card block rounded-2xl p-6 transition-transform hover:scale-[1.01]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">{p.title}</h2>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400">
                {p.status}
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Progress</span>
                <span>{p.overall_progress}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${p.overall_progress}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
        {!loading && projects.length === 0 && (
          <p className="col-span-full rounded-2xl border border-white/10 p-6 text-center text-sm text-zinc-500">
            No projects yet.
          </p>
        )}
      </div>
    </div>
  );
}
