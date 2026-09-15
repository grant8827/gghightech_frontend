"use client";

import type { ProjectOut } from "@/lib/api";

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  FAILED: "border-red-400/30 bg-red-400/10 text-red-300",
  PENDING: "border-accent/30 bg-accent/10 text-accent-light",
};

// GGH-302 — embeds the project's staging_url. If the target sets
// X-Frame-Options/frame-ancestors, the iframe will silently refuse to
// render (nothing client-side can detect or work around that), so the
// "open in new tab" link is a real fallback, not just a convenience.
export function StagingPreview({ project }: { project: ProjectOut }) {
  if (!project.staging_url) {
    return (
      <div className="glass-card rounded-2xl p-6 text-sm text-zinc-500">
        No staging URL set for this project yet.
      </div>
    );
  }

  const statusStyle = project.last_deploy_status
    ? (STATUS_STYLES[project.last_deploy_status] ?? "border-white/10 bg-white/5 text-zinc-300")
    : "border-white/10 bg-white/5 text-zinc-500";

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-2 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs ${statusStyle}`}>
            {project.last_deploy_status ?? "NO DEPLOY YET"}
          </span>
          {project.last_deploy_commit_sha && (
            <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-zinc-400">
              {project.last_deploy_commit_sha.slice(0, 7)}
            </span>
          )}
          {project.last_deployed_at && (
            <span className="text-xs text-zinc-500">
              {new Date(project.last_deployed_at).toLocaleString()}
            </span>
          )}
        </div>
        <a
          href={project.staging_url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-accent-light underline"
        >
          Open in new tab
        </a>
      </div>
      <iframe
        src={project.staging_url}
        sandbox="allow-scripts allow-same-origin allow-forms"
        className="h-[480px] w-full bg-black/20"
        title={`${project.title} staging preview`}
      />
    </div>
  );
}
