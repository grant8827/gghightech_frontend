// Shared pieces for the admin Invoicing / Contracts tab.

import type { OrganizationOut, ProjectOut } from "@/lib/api";

export const money = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

export const todayIso = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const inputClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-accent [color-scheme:dark]";

export const primaryButton =
  "rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100";
export const secondaryButton =
  "rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-accent/50 disabled:opacity-50";
export const smallButton =
  "rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 transition-colors hover:border-accent/50 disabled:opacity-50";

export function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-xs font-medium text-zinc-400 ${className}`}>
      {label}
      {hint && <span className="ml-1 font-normal text-zinc-600">{hint}</span>}
      {children}
    </label>
  );
}

export function Card({ title, step, children, aside }: { title: string; step?: number; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2.5 text-sm font-semibold text-white">
          {step !== undefined && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-xs text-accent-light">
              {step}
            </span>
          )}
          {title}
        </h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

const CHIP_STYLES: Record<string, string> = {
  PAID: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  SIGNED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  OVERDUE: "border-red-400/30 bg-red-400/10 text-red-300",
  VOID: "border-red-400/20 bg-red-400/5 text-red-300/80",
  SENT: "border-accent/30 bg-accent/10 text-accent-light",
  "AWAITING SIGNATURE": "border-accent/30 bg-accent/10 text-accent-light",
  "NOT SENT": "border-white/15 bg-white/5 text-zinc-300",
  DRAFT: "border-white/15 bg-white/5 text-zinc-300",
};

export function Chip({ label }: { label: string }) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${CHIP_STYLES[label] ?? CHIP_STYLES.DRAFT}`}>
      {label}
    </span>
  );
}

export function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1.5 text-xl font-semibold text-white">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-zinc-500">{detail}</p>}
    </div>
  );
}

// "Project — Client" for selects and lists.
export function projectLabel(project: ProjectOut | undefined, orgs: OrganizationOut[]) {
  if (!project) return "Unknown project";
  const org = orgs.find((o) => o.id === project.org_id);
  return org ? `${project.title} — ${org.name}` : project.title;
}
