// Progress charts for the client dashboard (app/portal/tabs/ProjectsTab.tsx).
//
// One data series per chart, so one hue: the brand gold (--accent) for
// progress and activity, on a track that is a faint step of the same gold.
// Done is the only status shown in color (emerald), and it always comes with
// a ✓ and the word "Done", never color alone. Every mark has a hover/focus
// tooltip, and every chart has an equivalent screen-reader table.

import type { MilestoneOut, ProjectOut } from "@/lib/api";

// Card surface (glass-card on --background): used for the 2px ring that keeps
// dots legible where they overlap the axis or each other.
const SURFACE = "#0f0f0f";

const DAY = 86_400_000;
const shortDate = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const parseDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`);

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isDone(m: MilestoneOut) {
  return m.progress_percentage >= 100 || m.status === "COMPLETED";
}

export function isOverdue(m: MilestoneOut, today = startOfToday()) {
  return !isDone(m) && !!m.due_date && parseDay(m.due_date) < today;
}

function relativeDays(target: Date, today = startOfToday()) {
  const days = Math.round((target.getTime() - today.getTime()) / DAY);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

// ---------- Tooltip ----------
// A focusable mark with a tooltip that appears on hover or keyboard focus.
// The same text is the mark's accessible name.
function Tip({
  text,
  children,
  className = "",
  style,
  side = "top",
}: {
  text: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  side?: "top" | "bottom";
}) {
  return (
    <span
      tabIndex={0}
      role="img"
      aria-label={text}
      className={`group/tip outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${className}`}
      style={style}
    >
      {children}
      <span
        role="presentation"
        className={`pointer-events-none absolute left-1/2 z-20 w-max max-w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-900/95 px-2.5 py-1.5 text-left text-xs leading-snug text-zinc-100 opacity-0 shadow-xl backdrop-blur transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100 ${
          side === "top" ? "bottom-full mb-2" : "top-full mt-2"
        }`}
      >
        {text}
      </span>
    </span>
  );
}

// ---------- Stat tile ----------
export function StatTile({
  label,
  value,
  detail,
  children,
}: {
  label: string;
  value: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass-card flex min-w-0 flex-col rounded-2xl p-5">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold text-white">{value}</p>
      {detail && <p className="mt-1 truncate text-xs text-zinc-500">{detail}</p>}
      {children && <div className="mt-auto pt-3">{children}</div>}
    </div>
  );
}

// ---------- Sparkline (stat tile trend) ----------
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const w = 120;
  const h = 28;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => [i * step, h - 3 - (v / max) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full max-w-[140px] overflow-visible" role="img" aria-label={label}>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="var(--accent)" opacity={0.1} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {last && <circle cx={last[0]} cy={last[1]} r={3.5} fill="var(--accent)" stroke={SURFACE} strokeWidth={2} />}
    </svg>
  );
}

// ---------- Stage tracker ----------
const STAGES = [
  { id: "DISCOVERY", label: "Discovery" },
  { id: "IN_PROGRESS", label: "Build" },
  { id: "QA", label: "Testing" },
  { id: "DELIVERED", label: "Launched" },
];

export function StageTracker({ status }: { status: string }) {
  const current = Math.max(0, STAGES.findIndex((s) => s.id === status));
  const delivered = status === "DELIVERED";
  return (
    <ol className="flex w-full items-start" aria-label={`Project stage: ${STAGES[current].label}`}>
      {STAGES.map((stage, i) => {
        const done = i < current || delivered;
        const active = i === current && !delivered;
        return (
          <li key={stage.id} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-[9px] h-0.5 w-full ${i <= current ? "bg-accent" : "bg-white/10"}`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                done
                  ? "bg-accent text-black"
                  : active
                    ? "bg-[#0f0f0f] ring-2 ring-accent"
                    : "bg-[#0f0f0f] ring-1 ring-white/20"
              }`}
            >
              {done ? "✓" : active ? <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> : null}
            </span>
            <span className={`mt-2 text-[11px] ${active ? "font-semibold text-white" : done ? "text-zinc-300" : "text-zinc-500"}`}>
              {stage.label}
              {active && <span className="sr-only"> (current stage)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Meter ----------
export function Meter({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2.5 w-full overflow-hidden rounded-full bg-accent/15"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-1000 ease-out ${pct === 100 ? "bg-emerald-400" : "bg-accent"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------- Milestone bars ----------
function statusOf(m: MilestoneOut, today: Date) {
  if (m.approved_at) return { icon: "✓", text: "Approved", tone: "text-emerald-300" };
  if (isDone(m)) return { icon: "✓", text: "Done", tone: "text-emerald-300" };
  if (isOverdue(m, today)) return { icon: "!", text: "Past due", tone: "text-amber-300" };
  if (m.status === "IN_PROGRESS" || m.progress_percentage > 0) return { icon: "●", text: "In progress", tone: "text-zinc-300" };
  return { icon: "○", text: "Planned", tone: "text-zinc-500" };
}

export function MilestoneBars({ milestones }: { milestones: MilestoneOut[] }) {
  const today = startOfToday();
  return (
    <div>
      <ul className="space-y-3">
        {milestones.map((m) => {
          const pct = Math.max(0, Math.min(100, m.progress_percentage));
          const st = statusOf(m, today);
          const due = m.due_date ? `due ${shortDate(parseDay(m.due_date))}` : "no due date";
          return (
            <li
              key={m.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,12rem)_1fr_auto]"
            >
              <span className="truncate text-sm text-zinc-200" title={m.title}>
                {m.title}
              </span>
              {/* On phones the bar gets its own full-width row below the name. */}
              <Tip
                text={`${m.title}: ${pct}% · ${st.text} · ${due}`}
                className="relative order-last col-span-2 block h-3 rounded-r bg-accent/10 sm:order-none sm:col-span-1"
              >
                <span
                  className={`block h-full rounded-r transition-[width] duration-1000 ease-out ${
                    isDone(m) ? "bg-emerald-400" : "bg-accent"
                  }`}
                  style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
                />
              </Tip>
              <span className="flex items-center justify-end gap-2 text-xs sm:w-28">
                <span className="tabular-nums text-zinc-300">{pct}%</span>
                <span className={`${st.tone} whitespace-nowrap`}>
                  <span aria-hidden="true">{st.icon} </span>
                  {st.text}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <table className="sr-only">
        <caption>Milestone progress</caption>
        <thead>
          <tr>
            <th>Milestone</th>
            <th>Progress</th>
            <th>Status</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {milestones.map((m) => (
            <tr key={m.id}>
              <td>{m.title}</td>
              <td>{m.progress_percentage}%</td>
              <td>{statusOf(m, today).text}</td>
              <td>{m.due_date ?? "None"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Schedule strip ----------
// Milestone due dates on a time axis, with a marker for today.
export function ScheduleStrip({ project, milestones }: { project: ProjectOut; milestones: MilestoneOut[] }) {
  const dated = milestones.filter((m) => m.due_date);
  if (dated.length === 0) return null;
  const today = startOfToday();
  const dues = dated.map((m) => parseDay(m.due_date!).getTime());
  const start = Math.min(new Date(project.created_at).setHours(0, 0, 0, 0), ...dues, today.getTime());
  const end = Math.max(...dues, today.getTime());
  const span = Math.max(end - start, 7 * DAY);
  const pad = span * 0.04;
  const x = (t: number) => ((t - start + pad) / (span + 2 * pad)) * 100;
  const todayX = x(today.getTime());

  return (
    <div>
      <div className="relative mx-1 h-16">
        {/* axis */}
        <span aria-hidden="true" className="absolute inset-x-0 top-8 h-px bg-white/10" />
        {/* completed span up to today */}
        <span
          aria-hidden="true"
          className="absolute top-8 h-px bg-accent/50"
          style={{ left: `${x(start)}%`, width: `${Math.max(0, todayX - x(start))}%` }}
        />
        {/* today */}
        <span aria-hidden="true" className="absolute top-2 bottom-2 w-px bg-white/40" style={{ left: `${todayX}%` }} />
        <span
          className="absolute top-0 -translate-x-1/2 rounded-full bg-white/10 px-1.5 text-[10px] leading-4 text-zinc-200"
          style={{ left: `${todayX}%` }}
        >
          Today
        </span>
        {dated.map((m) => {
          const t = parseDay(m.due_date!);
          const done = isDone(m);
          const late = isOverdue(m, today);
          return (
            <Tip
              key={m.id}
              text={`${m.title}: due ${shortDate(t)} (${relativeDays(t, today)}) · ${
                done ? "Done" : late ? "Past due" : `${m.progress_percentage}% complete`
              }`}
              className="absolute top-8 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left: `${x(t.getTime())}%` }}
            >
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-black ${
                  done ? "bg-emerald-400" : late ? "bg-amber-400" : "bg-accent"
                }`}
                style={{ boxShadow: `0 0 0 2px ${SURFACE}` }}
              >
                {done ? "✓" : late ? "!" : ""}
              </span>
            </Tip>
          );
        })}
        <span className="absolute bottom-0 left-0 text-[10px] text-zinc-500">{shortDate(new Date(start))}</span>
        <span className="absolute bottom-0 right-0 text-[10px] text-zinc-500">{shortDate(new Date(end))}</span>
      </div>
    </div>
  );
}

// ---------- Activity columns ----------
export function ActivityColumns({ project }: { project: ProjectOut }) {
  const weeks = project.commit_activity?.weeks ?? [];
  if (weeks.length === 0) return null;
  const max = Math.max(1, ...weeks.map((w) => w.commits));
  const total = weeks.reduce((s, w) => s + w.commits, 0);
  const peak = weeks.reduce((best, w, i) => (w.commits > weeks[best].commits ? i : best), 0);
  const plotH = 72;

  return (
    <div>
      <p className="text-xs text-zinc-500">
        {total}
        {project.commit_activity?.capped ? "+" : ""} code updates in the last {weeks.length} weeks
      </p>
      <div className="relative mt-5 flex items-end gap-1 border-b border-white/10" style={{ height: plotH }}>
        {weeks.map((w, i) => {
          const h = w.commits === 0 ? 2 : Math.max(4, (w.commits / max) * (plotH - 16));
          const thisWeek = i === weeks.length - 1;
          return (
            <Tip
              key={w.start}
              text={`${thisWeek ? "This week" : `Week of ${shortDate(parseDay(w.start))}`}: ${w.commits} update${w.commits === 1 ? "" : "s"}`}
              className="relative flex h-full flex-1 items-end justify-center"
            >
              {i === peak && w.commits > 0 && (
                <span className="absolute text-[10px] tabular-nums text-zinc-300" style={{ bottom: h + 4 }}>
                  {w.commits}
                </span>
              )}
              <span
                className={`block w-full max-w-6 rounded-t ${w.commits === 0 ? "bg-white/10" : "bg-accent"}`}
                style={{ height: h }}
              />
            </Tip>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-zinc-500">
        <span>{shortDate(parseDay(weeks[0].start))}</span>
        <span>This week</span>
      </div>
      <table className="sr-only">
        <caption>Code updates per week</caption>
        <thead>
          <tr>
            <th>Week starting</th>
            <th>Updates</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.start}>
              <td>{w.start}</td>
              <td>{w.commits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
