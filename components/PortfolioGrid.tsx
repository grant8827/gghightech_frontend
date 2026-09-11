"use client";

import { useMemo, useState } from "react";

type Category = "Web" | "Mobile" | "Enterprise";

type CaseStudy = {
  id: string;
  title: string;
  category: Category;
  summary: string;
  metrics: { label: string; value: string }[];
  stack: string[];
  url?: string;
};

// Real projects, not illustrative placeholders — see GGH team's engineering
// background. Metrics here are factual scope descriptors, not performance
// stats we don't have hard numbers for.
const CASE_STUDIES: CaseStudy[] = [
  {
    id: "radio-in-one-stop",
    title: "Radio In One Stop",
    category: "Web",
    summary:
      "A centralized digital streaming and broadcasting platform with low-latency live audio management, custom signal routing, and dynamic station control.",
    metrics: [
      { label: "Backend", value: "Go microservices" },
      { label: "Streaming", value: "Low-latency live audio" },
    ],
    stack: ["Go", "React", "Microservices"],
    url: "https://radioinonestop.com/",
  },
  {
    id: "churchbooks-management",
    title: "ChurchBooks Management",
    category: "Enterprise",
    summary:
      "A multi-tenant accounting and management SaaS for churches — handling statutory deductions, regional tax compliance, and multi-user role permissions.",
    metrics: [
      { label: "Architecture", value: "Multi-tenant SaaS" },
      { label: "Compliance", value: "Regional tax rules" },
    ],
    stack: ["Django", "Python", "PostgreSQL"],
    url: "https://churchbooksmanagement.com/",
  },
  {
    id: "rightfitgigs",
    title: "RightFitGigs",
    category: "Mobile",
    summary:
      "A job marketplace connecting gig workers and employers, with real-time alerts and candidate tracking across web and mobile.",
    metrics: [
      { label: "Platforms", value: "Web + iOS/Android" },
      { label: "Realtime", value: "Alerts & tracking" },
    ],
    stack: [".NET Core", "React", "Flutter"],
    url: "https://www.rightfitgigs.com/",
  },
  {
    id: "safehaven-ehr",
    title: "SafeHaven EHR System",
    category: "Enterprise",
    summary:
      "A HIPAA-compliant medical portal with end-to-end encrypted patient authentication, secure records storage, and dynamic scheduling.",
    metrics: [
      { label: "Compliance", value: "HIPAA" },
      { label: "Security", value: "End-to-end encryption" },
    ],
    stack: ["MongoDB", "Express", "React", "Node.js"],
  },
  {
    id: "rentalhist",
    title: "RentalHist",
    category: "Web",
    summary:
      "A property data and CRM platform with automated listing syndication, lead tracking, and analytics dashboards — since extended with real-time multi-source property data integrations.",
    metrics: [
      { label: "Focus", value: "Listings & lead tracking" },
      { label: "Integrations", value: "Multi-source property APIs" },
    ],
    stack: ["Laravel", "React", "PostgreSQL"],
    url: "https://rentalhist.com/",
  },
];

const CATEGORIES: ("All" | Category)[] = ["All", "Web", "Mobile", "Enterprise"];

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

        {caseStudy.url && (
          <a
            href={caseStudy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block text-sm text-accent-light underline"
          >
            Visit live site →
          </a>
        )}
      </div>
    </div>
  );
}
