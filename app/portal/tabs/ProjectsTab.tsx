import Link from "next/link";
import type { MilestoneOut, ProjectOut } from "@/lib/api";
import {
  ActivityColumns,
  isDone,
  isOverdue,
  Meter,
  MilestoneBars,
  ScheduleStrip,
  Sparkline,
  StageTracker,
  StatTile,
  startOfToday,
} from "@/components/ProjectCharts";
import { RecentWork, SiteLinks } from "@/components/RecentWork";

const sectionTitle = "text-xs font-medium uppercase tracking-[0.14em] text-zinc-500";

function nextDeadline(projects: ProjectOut[], milestones: Record<string, MilestoneOut[]>) {
  const today = startOfToday();
  const open = projects.flatMap((p) =>
    (milestones[p.id] ?? []).filter((m) => m.due_date && !isDone(m)).map((m) => ({ m, project: p })),
  );
  const overdue = open.filter(({ m }) => isOverdue(m, today));
  const upcoming = open
    .filter(({ m }) => !isOverdue(m, today))
    .sort((a, b) => a.m.due_date!.localeCompare(b.m.due_date!));
  return { overdue, next: upcoming[0] ?? null };
}

// The client's "View projects" tab: a summary row, then one card per project
// with its stage, completion, milestone chart, schedule and code activity.
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

  const all = projects.flatMap((p) => milestones[p.id] ?? []);
  const done = all.filter(isDone).length;
  const avg = Math.round(projects.reduce((s, p) => s + p.overall_progress, 0) / projects.length);
  const { overdue, next } = nextDeadline(projects, milestones);

  // Weekly activity summed across projects (all share the same 12 weeks).
  const activityWeeks = projects.map((p) => p.commit_activity?.weeks ?? []).filter((w) => w.length > 0);
  const combined = activityWeeks.length
    ? activityWeeks[0].map((_, i) => activityWeeks.reduce((s, w) => s + (w[i]?.commits ?? 0), 0))
    : [];
  const lastFour = combined.slice(-4).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-8">
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={projects.length > 1 ? "Average completion" : "Completion"}
          value={`${avg}%`}
          detail={`${projects.length} project${projects.length === 1 ? "" : "s"}`}
        >
          <Meter value={avg} label="Average completion" />
        </StatTile>
        <StatTile
          label="Milestones done"
          value={all.length ? `${done} of ${all.length}` : "—"}
          detail={all.length ? `${all.length - done} still to go` : "None planned yet"}
        />
        <StatTile
          label="Next deadline"
          value={
            next
              ? new Date(`${next.m.due_date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              : "—"
          }
          detail={overdue.length ? `! ${overdue.length} past due` : next ? next.m.title : "No upcoming dates"}
        />
        {combined.length > 0 ? (
          <StatTile label="Code updates, last 4 weeks" value={String(lastFour)}>
            <Sparkline values={combined} label={`Code updates per week, last ${combined.length} weeks`} />
          </StatTile>
        ) : (
          <StatTile
            label="Projects launched"
            value={String(projects.filter((p) => p.status === "DELIVERED").length)}
            detail={`of ${projects.length}`}
          />
        )}
      </section>

      {projects.map((p) => {
        const items = milestones[p.id] ?? [];
        const hasActivity = (p.commit_activity?.weeks.length ?? 0) > 0;
        const hasCommits = (p.recent_commits?.length ?? 0) > 0;
        return (
          <section key={p.id} aria-labelledby={`project-${p.id}`} className="glass-card overflow-hidden rounded-3xl">
            <div className="border-b border-white/10 p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 id={`project-${p.id}`} className="text-xl font-semibold text-white sm:text-2xl">
                    {p.title}
                  </h2>
                  <div className="mt-3">
                    <SiteLinks project={p} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-5xl font-semibold leading-none text-white">
                    {p.overall_progress}
                    <span className="text-2xl text-zinc-400">%</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">complete</p>
                </div>
              </div>
              <div className="mt-6">
                <Meter value={p.overall_progress} label={`${p.title} overall progress`} />
              </div>
              <div className="mt-8">
                <StageTracker status={p.status} />
              </div>
            </div>

            <div className="grid gap-px bg-white/10 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-8 bg-[#0b0b0b] p-6 sm:p-8">
                <div>
                  <h3 className={sectionTitle}>Milestones</h3>
                  <div className="mt-4">
                    {items.length ? (
                      <MilestoneBars milestones={items} />
                    ) : (
                      <p className="text-sm text-zinc-500">Milestones will appear here once they&apos;re planned.</p>
                    )}
                  </div>
                </div>
                {items.some((m) => m.due_date) && (
                  <div>
                    <h3 className={sectionTitle}>Schedule</h3>
                    <div className="mt-4">
                      <ScheduleStrip project={p} milestones={items} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-8 bg-[#0b0b0b] p-6 sm:p-8">
                {hasActivity && (
                  <div>
                    <h3 className={sectionTitle}>Development activity</h3>
                    <div className="mt-3">
                      <ActivityColumns project={p} />
                    </div>
                  </div>
                )}
                {hasCommits && <RecentWork project={p} limit={3} />}
                {!hasActivity && !hasCommits && (
                  <p className="text-sm text-zinc-500">Development activity will show here once work begins.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-white/10 px-6 py-4 sm:px-8">
              <Link href={`/portal/${p.id}`} className="text-sm font-medium text-accent-light hover:underline">
                Preview, team updates &amp; approvals <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        );
      })}
    </div>
  );
}
