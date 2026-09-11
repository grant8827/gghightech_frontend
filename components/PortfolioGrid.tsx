"use client";

import { useMemo, useState } from "react";

type Category = "Web" | "Mobile" | "AI" | "Enterprise";

type CaseStudy = {
  id: string;
  title: string;
  category: Category;
  summary: string;
  metrics: { label: string; value: string }[];
  stack: string[];
};

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "client-portal",
    title: "Realtime Client Portal",
    category: "Enterprise",
    summary:
      "A live milestone tracker and staging sandbox that replaced weekly status emails with a self-serve dashboard.",
    metrics: [
      { label: "Support emails", value: "-62%" },
      { label: "Time to first update", value: "< 1 day" },
    ],
    stack: ["Next.js", "FastAPI", "PostgreSQL", "WebSockets"],
  },
  {
    id: "scope-estimator",
    title: "Interactive Scope Estimator",
    category: "AI",
    summary:
      "A rules-based pricing engine that turns feature toggles into an instant budget range and exportable PDF proposal.",
    metrics: [
      { label: "Quote turnaround", value: "Minutes" },
      { label: "Qualified leads", value: "+40%" },
    ],
    stack: ["FastAPI", "React", "PDF export"],
  },
  {
    id: "ecosystem-app",
    title: "Cross-Platform Ecosystem",
    category: "Mobile",
    summary:
      "Shared design system across a marketing site, client portal, and companion mobile app under one auth layer.",
    metrics: [
      { label: "Platforms", value: "3" },
      { label: "Shared codebase", value: "70%" },
    ],
    stack: ["React Native", "Expo", "NativeWind"],
  },
  {
    id: "back-office",
    title: "Agency Back-Office Suite",
    category: "Web",
    summary:
      "Internal tooling for project creation, milestone tracking, and client onboarding in three steps.",
    metrics: [
      { label: "Onboarding steps", value: "3" },
      { label: "Setup time", value: "-80%" },
    ],
    stack: ["Next.js", "FastAPI", "RBAC"],
  },
];

const CATEGORIES: ("All" | Category)[] = ["All", "Web", "Mobile", "AI", "Enterprise"];

export function PortfolioGrid() {
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]>("All");
  const [active, setActive] = useState<CaseStudy | null>(null);

  const visible = useMemo(
    () => (filter === "All" ? CASE_STUDIES : CASE_STUDIES.filter((c) => c.category === filter)),
    [filter],
  );

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Ecosystem Portfolio</h2>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Internal products and client platforms, filterable by category.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                filter === cat
                  ? "bg-accent text-black"
                  : "border border-white/10 text-zinc-300 hover:border-white/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {visible.map((cs) => (
          <button
            key={cs.id}
            onClick={() => setActive(cs)}
            className="glass-card group rounded-2xl p-6 text-left transition-transform hover:-translate-y-1"
          >
            <span className="text-xs uppercase tracking-wide text-accent">{cs.category}</span>
            <h3 className="mt-2 text-lg font-medium text-white">{cs.title}</h3>
            <p className="mt-2 text-sm text-zinc-400">{cs.summary}</p>
            <span className="mt-4 inline-block text-sm text-accent-light group-hover:underline">
              View Case Study →
            </span>
          </button>
        ))}
      </div>

      {active && <CaseStudyModal caseStudy={active} onClose={() => setActive(null)} />}
    </section>
  );
}

function CaseStudyModal({ caseStudy, onClose }: { caseStudy: CaseStudy; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="glass-card w-full max-w-lg rounded-2xl p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs uppercase tracking-wide text-accent">{caseStudy.category}</span>
            <h3 className="mt-1 text-xl font-semibold text-white">{caseStudy.title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>

        <p className="mt-4 text-sm text-zinc-300">{caseStudy.summary}</p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {caseStudy.metrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-white/10 p-3">
              <div className="text-lg font-semibold text-white">{m.value}</div>
              <div className="text-xs text-zinc-400">{m.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {caseStudy.stack.map((s) => (
            <span key={s} className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
