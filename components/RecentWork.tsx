import type { ProjectOut } from "@/lib/api";

export function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return rtf.format(-Math.floor(seconds / size), unit);
  }
  return "just now";
}

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

// Live site and preview links for a project, for the client dashboard.
export function SiteLinks({ project }: { project: ProjectOut }) {
  if (!project.live_url && !project.staging_url) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {project.live_url && (
        <a
          href={project.live_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200 transition-colors hover:border-emerald-400/60"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          Live site: {hostOf(project.live_url)}
          <span aria-hidden="true">↗</span>
        </a>
      )}
      {project.staging_url && (
        <a
          href={project.staging_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:border-accent/50"
        >
          Preview: {hostOf(project.staging_url)}
          <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
  );
}

// The latest commits from the project's GitHub repo, so clients can see
// work landing between milestone updates.
export function RecentWork({ project, limit = 5 }: { project: ProjectOut; limit?: number }) {
  const commits = (project.recent_commits ?? []).slice(0, limit);
  if (commits.length === 0) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-white">Latest from our developers</h3>
        {project.latest_commit_synced_at && (
          <span className="text-[11px] text-zinc-500">Checked {timeAgo(project.latest_commit_synced_at)}</span>
        )}
      </div>
      <ol className="mt-3 space-y-2.5 border-l border-white/10 pl-4">
        {commits.map((c) => (
          <li key={c.sha} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            <p className="text-sm text-zinc-200">{c.message}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {c.committed_at ? timeAgo(c.committed_at) : null}
              {c.author ? ` · ${c.author}` : null}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
