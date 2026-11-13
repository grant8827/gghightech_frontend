import Link from "next/link";
import type { MilestoneOut, ProjectOut } from "@/lib/api";
import { RecentWork, SiteLinks } from "@/components/RecentWork";

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  DISCOVERY: "Discovery",
  QA: "Testing",
  DELIVERED: "Delivered",
};

function label(status: string) {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function ProgressBar({ value, label: name, large = false }: { value: number; label: string; large?: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={name}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full overflow-hidden rounded-full bg-white/10 ${large ? "h-3" : "h-1.5"}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ${pct === 100 ? "bg-emerald-400" : "bg-accent"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// Every project the client's organization has, each with its overall
// progress and a bar per milestone.
export function ProjectsTab({
  projects,
  milestones,
}: {
  projects: ProjectOut[];
  milestones: Record<string, MilestoneOut[]>;
}) {
  if (projects.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 p-8 text-center text-sm text-zinc-500">
        No projects yet. They&apos;ll appear here as soon as our team sets one up for you.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {projects.map((p) => {
        const items = milestones[p.id] ?? [];
        const done = items.filter((m) => m.progress_percentage === 100).length;
        return (
          <section key={p.id} aria-labelledby={`project-${p.id}`} className="glass-card rounded-2xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id={`project-${p.id}`} className="text-xl font-semibold text-white">
                  {p.title}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {label(p.status)}
                  {items.length > 0 && ` · ${done} of ${items.length} milestones complete`}
                </p>
              </div>
              <span className="text-3xl font-semibold tabular-nums text-accent">{p.overall_progress}%</span>
            </div>

            <div className="mt-4">
              <ProgressBar value={p.overall_progress} label={`${p.title} overall progress`} large />
            </div>

            {(p.live_url || p.staging_url) && (
              <div className="mt-4">
                <SiteLinks project={p} />
              </div>
            )}

            {items.length > 0 && (
              <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {items.map((m) => (
                  <li key={m.id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-zinc-200">{m.title}</span>
                      <span className="tabular-nums text-zinc-400">{m.progress_percentage}%</span>
                    </div>
                    <div className="mt-1.5">
                      <ProgressBar value={m.progress_percentage} label={`${m.title} progress`} />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                      <span>{m.approved_at ? "Approved" : label(m.status)}</span>
                      {m.due_date && <span>Due {new Date(`${m.due_date}T00:00:00`).toLocaleDateString()}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {(p.recent_commits?.length ?? 0) > 0 && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <RecentWork project={p} limit={3} />
              </div>
            )}

            <Link
              href={`/portal/${p.id}`}
              className="mt-6 inline-block text-sm font-medium text-accent-light hover:underline"
            >
              Open project: preview, updates and approvals <span aria-hidden="true">→</span>
            </Link>
          </section>
        );
      })}
    </div>
  );
}
