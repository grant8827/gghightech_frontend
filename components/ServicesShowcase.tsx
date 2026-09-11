import Link from "next/link";

type Service = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

const ICON_PROPS = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const SERVICES: Service[] = [
  {
    title: "Web Applications",
    description: "Fast, SEO-friendly sites and full-stack platforms built on modern frameworks — not templates.",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
        <path d="M7 6.5h.01M10 6.5h.01" />
      </svg>
    ),
  },
  {
    title: "Mobile Apps",
    description: "Cross-platform iOS & Android apps from one codebase, with the polish of a native build.",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
        <path d="M11 18.5h2" />
      </svg>
    ),
  },
  {
    title: "AI & Automation",
    description: "LLM-powered features and workflow automation that ship real outcomes, not just demos.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 3v2M12 19v2M5 5l1.4 1.4M17.6 17.6L19 19M3 12h2M19 12h2M5 19l1.4-1.4M17.6 6.4L19 5" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    title: "Cloud & DevOps",
    description: "CI/CD pipelines, infrastructure as code, and zero-downtime deploys — set up once, trusted forever.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M7 18a4 4 0 0 1-1-7.87A5.5 5.5 0 0 1 16.5 8h.5a4.5 4.5 0 0 1 1 8.88" />
        <path d="M12 12v6M9.5 15.5 12 18l2.5-2.5" />
      </svg>
    ),
  },
  {
    title: "Enterprise Software",
    description: "Internal tools, back-office systems, and client portals that scale with your headcount.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 21V8l8-5 8 5v13" />
        <path d="M9 21v-6h6v6M9 12h.01M15 12h.01M12 12h.01M9 9h.01M15 9h.01M12 9h.01" />
      </svg>
    ),
  },
  {
    title: "UI/UX Design",
    description: "Interfaces people actually enjoy using — from wireframe to a design system your team can own.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 2a10 10 0 1 0 10 10c0-1.5-1-2-2-2h-3a3 3 0 0 1-3-3V5c0-1.5-1-3-2-3Z" />
        <circle cx="7.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="11" cy="7" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export function ServicesShowcase() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            What We Build
          </span>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Software that pulls its weight
          </h2>
          <p className="mt-4 text-sm text-zinc-400 sm:text-base">
            Six disciplines, one team — from the first pixel to the pipeline that ships it.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <div
              key={service.title}
              className="glass-card group relative overflow-hidden rounded-2xl p-7 transition-all hover:-translate-y-1 hover:border-accent/40"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/0 blur-2xl transition-colors group-hover:bg-accent/20"
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-black">
                {service.icon}
              </div>
              <h3 className="relative mt-5 text-lg font-medium text-white">{service.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-zinc-400">{service.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/estimate"
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-105"
          >
            Get a Custom Quote
          </Link>
        </div>
      </div>
    </section>
  );
}
