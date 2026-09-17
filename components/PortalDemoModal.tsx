"use client";

import Image from "next/image";
import Link from "next/link";

type Phase = {
  label: string;
  title: string;
  status: "done" | "active" | "upcoming";
  statusText: string;
};

const PHASES: Phase[] = [
  { label: "Phase 1", title: "Discovery & Wireframes", status: "done", statusText: "Completed" },
  { label: "Phase 2", title: "Database & API Core", status: "done", statusText: "Completed" },
  { label: "Phase 3", title: "Frontend & Dashboard", status: "active", statusText: "In Progress (85%)" },
  { label: "Phase 4", title: "QA & Store Launch", status: "upcoming", statusText: "Upcoming" },
];

const TERMINAL_LINES = [
  "Syncing latest GitHub commit [main #8aef3]...",
  "Deploying Docker container cluster... Success (1.2s)",
  "Status: All API endpoints responding (200 OK)",
];

// All content here is static sample data for visitors who haven't been
// invited to a real project yet — never touches the network. The real
// thing lives at /portal (see app/portal/), linked below and in the nav.
export function PortalDemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Client portal live demo"
      onClick={onClose}
    >
      <div
        className="glass-card relative w-full max-w-4xl overflow-hidden rounded-3xl bg-[#0b0b0a] p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close demo"
          className="absolute right-5 top-5 text-zinc-400 hover:text-white"
        >
          ✕
        </button>

        <div className="flex items-center gap-3">
          <Image
            src="/gghightech-logo.jpg"
            alt=""
            width={40}
            height={40}
            className="rounded-xl"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-white">GG HighTech Client Portal</h2>
              <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-light">
                Live Demo Workspace
              </span>
            </div>
            <p className="text-xs text-zinc-500">Project: Alpha Cloud SaaS Platform (Sprint #4 Active)</p>
          </div>
        </div>

        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Project Milestones Velocity
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PHASES.map((phase) => (
            <div
              key={phase.label}
              className={`rounded-xl border p-4 ${
                phase.status === "active"
                  ? "border-accent bg-accent/10"
                  : phase.status === "upcoming"
                    ? "border-white/10 bg-white/2 opacity-60"
                    : "border-white/10 bg-white/5"
              }`}
            >
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">{phase.label}</p>
              <p className="mt-1 text-sm font-medium text-white">{phase.title}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <PhaseStatusIcon status={phase.status} />
                <span
                  className={
                    phase.status === "done"
                      ? "text-emerald-300"
                      : phase.status === "active"
                        ? "text-accent-light"
                        : "text-zinc-500"
                  }
                >
                  {phase.statusText}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Staging Build Sandbox</h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Build v2.4.1 Ready
              </span>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/60">
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-2 truncate text-xs text-zinc-500">https://staging.gghightech.lab/alpha-app</span>
              </div>
              <div className="space-y-1 px-3 py-3 font-mono text-xs text-emerald-300">
                {TERMINAL_LINES.map((line) => (
                  <div key={line}>
                    <span className="text-zinc-600">{"> "}</span>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <button className="mt-3 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition-transform hover:scale-105">
              Open Staging Preview
            </button>
          </div>

          <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-medium text-white">Lead Architect Updates</h3>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/10 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-accent-light">Alex (Lead Dev)</span>
                <span className="text-zinc-500">10m ago</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                Integrated Stripe payment webhooks for tier upgrades. Ready for test run!
              </p>
            </div>
            <button className="mt-auto pt-4 text-left text-xs font-medium text-zinc-300 transition-colors hover:text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5">
                Send Quick Message <span aria-hidden="true">↗</span>
              </span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">Sample data — sign in to your real project at Client Portal.</p>
          <Link
            href="/portal"
            className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition-transform hover:scale-105"
          >
            Go to Client Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

function PhaseStatusIcon({ status }: { status: Phase["status"] }) {
  const props = {
    width: 10,
    height: 10,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const badgeClass = "flex h-4 w-4 items-center justify-center rounded-full";

  if (status === "done") {
    return (
      <span className={`${badgeClass} bg-emerald-400/20 text-emerald-300`}>
        <svg {...props}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className={`${badgeClass} bg-accent/25 text-accent-light`}>
        <svg {...props} strokeWidth={2.5}>
          <circle cx="12" cy="12" r="9" strokeOpacity={0.35} />
          <path d="M12 3a9 9 0 0 1 9 9" />
        </svg>
      </span>
    );
  }
  return (
    <span className={`${badgeClass} bg-white/10 text-zinc-400`}>
      <svg {...props} strokeWidth={2.5}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    </span>
  );
}
