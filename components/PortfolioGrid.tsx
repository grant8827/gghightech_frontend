"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Testimonials } from "@/components/Testimonials";

type Platform = "Web" | "iOS" | "Android";

type Project = {
  id: string;
  name: string;
  // Short label above the name: the kind of product / who it's for.
  sector: string;
  summary: string;
  // Omit for products without a logo file yet — the card falls back to a
  // monogram built from `name`.
  logo?: string;
  platforms: Platform[];
  links: { web?: string; appStore?: string; playStore?: string };
  stack?: string[];
};

// Real, shipped products — every link below goes to the live site or store
// listing. Summaries describe what the product does, not performance
// numbers we don't have hard figures for.
const PROJECTS: Project[] = [
  {
    id: "radio-in-one-stop",
    name: "Radio In One Stop",
    sector: "Media & Broadcasting",
    summary:
      "Run your own radio station from one place: low-latency live audio, a station dashboard, listener analytics, and in-browser broadcasting, with companion apps for listeners on the go.",
    logo: "/images/radioinonestop_logo.png",
    platforms: ["Web", "iOS", "Android"],
    links: {
      web: "https://radioinonestop.com/",
      appStore: "https://apps.apple.com/us/app/radio-in-one-stop/id6807973893",
      playStore: "https://play.google.com/store/apps/details?id=com.radioinonestop",
    },
    stack: ["Go", "React", "Microservices"],
  },
  {
    id: "rightfitgigs",
    name: "RightFitGigs",
    sector: "Jobs Marketplace",
    summary:
      "A job marketplace that matches gig workers and employers. Candidates upload or build a resume and get openings that fit their skills, with real-time alerts and candidate tracking across web and mobile.",
    logo: "/images/rightfitgigs_logo.png",
    platforms: ["Web", "iOS", "Android"],
    links: {
      web: "https://www.rightfitgigs.com/",
      appStore: "https://apps.apple.com/us/app/rightfitgigs/id6764852473",
      playStore: "https://play.google.com/store/apps/details?id=com.rightfitgigs",
    },
    stack: [".NET Core", "React", "Flutter"],
  },
  {
    id: "ggfm",
    name: "GGFM",
    sector: "Gospel Radio",
    summary:
      "Good Gospel FM in your pocket: a 24/7 stream of local and international gospel music and church programmes, with background playback and built-in listener chat.",
    logo: "/images/GGFM-Logo.png",
    platforms: ["iOS", "Android"],
    links: {
      appStore: "https://apps.apple.com/us/app/ggfm/id6472855705",
      playStore: "https://play.google.com/store/apps/details?id=com.ggfm",
    },
    stack: ["Flutter"],
  },
  {
    id: "bdm-radio",
    name: "BDM Radio",
    sector: "Ministry Radio",
    summary:
      "The streaming app for Bro Davon Ministries, bringing its gospel music and ministry programming to listeners on iPhone and Android.",
    logo: "/images/bdm_logo.png",
    platforms: ["iOS", "Android"],
    links: {
      appStore: "https://apps.apple.com/us/app/bdm-radio/id6473223937",
      playStore: "https://play.google.com/store/apps/details?id=com.bdmradio",
    },
    stack: ["Flutter"],
  },
  {
    id: "churchbooks-management",
    name: "ChurchBooks Management",
    sector: "Church Accounting",
    summary:
      "A multi-tenant accounting and management platform for churches, handling statutory deductions, regional tax compliance, and multi-user role permissions.",
    logo: "/images/church_books_logo.png",
    platforms: ["Web"],
    links: { web: "https://churchbooksmanagement.com/" },
    stack: ["Django", "Python", "PostgreSQL"],
  },
  {
    id: "safehaven-ehr",
    name: "SafeHaven EHR",
    sector: "Healthcare",
    summary:
      "A therapeutic EHR system for Safe Haven Restoration Ministries: a HIPAA-compliant portal with encrypted patient authentication, secure records storage, and dynamic scheduling.",
    logo: "/images/Safe%20haven%20restoration%20minitry-logo.png",
    platforms: ["Web"],
    links: { web: "https://safehavenrestorationministries.com/" },
    stack: ["MongoDB", "Express", "React", "Node.js"],
  },
  {
    id: "hrbooks360",
    name: "HRBooks360",
    sector: "HR & Staffing",
    summary: "A financial and staffing management system built for businesses in Jamaica.",
    logo: "/images/hrbooks360_logo.png",
    platforms: ["Web"],
    links: { web: "https://www.hrbooks360.com/" },
    stack: ["Angular", ".NET", "PostgreSQL"],
  },
  {
    id: "sdpmplus",
    name: "SDPMPlus",
    sector: "Education",
    summary: "School drop-off and pick-up management, built to make the school run safer and more orderly.",
    logo: "/images/SDPMPlus_School_Branding_Logo.png",
    platforms: ["Web", "iOS", "Android"],
    links: { web: "https://www.sdpmplus.com/" },
    stack: ["Node.js", "React", "React Native"],
  },
  {
    id: "virtual-event-plus",
    name: "Virtual Event Plus",
    sector: "Events",
    summary: "A virtual events platform for hosting and joining events online.",
    logo: "/images/virtualeventplus.png",
    platforms: ["Web", "iOS", "Android"],
    links: { web: "https://www.virtualeventplus.com/" },
    stack: ["Go", "React", "PostgreSQL", "React Native"],
  },
  {
    id: "rentalhist",
    name: "RentalHist",
    sector: "Real Estate",
    summary:
      "A property data and CRM platform with automated listing syndication, lead tracking, analytics dashboards, and real-time multi-source property data integrations.",
    logo: "/images/rentalhist-logo.png",
    platforms: ["Web"],
    links: { web: "https://rentalhist.com/" },
    stack: ["Laravel", "React", "PostgreSQL"],
  },
  {
    id: "islevendor",
    name: "IsleVendor",
    sector: "Sales & Logistics",
    summary:
      "IsleVendor is a multi-tenant sales and logistics network connecting local warehouses, resellers, small stores, and gig drivers.",
    logo: "/images/islevendor_logo.png",
    platforms: ["Web", "iOS", "Android"],
    links: { web: "https://islevendor.com/" },
    stack: ["React", "Node.js", "FastAPI", "PostgreSQL", "React Native"],
  },
];

const isMobile = (p: Project) => p.platforms.includes("iOS") || p.platforms.includes("Android");
const isWeb = (p: Project) => p.platforms.includes("Web");

const FILTERS = [
  { id: "all", label: "All work", match: () => true },
  { id: "web", label: "Web platforms", match: isWeb },
  { id: "mobile", label: "Mobile apps", match: isMobile },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function PortfolioGrid() {
  const [filter, setFilter] = useState<FilterId>("all");

  const visible = useMemo(() => {
    const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
    return PROJECTS.filter(active.match);
  }, [filter]);

  const stats = [
    { value: PROJECTS.length, label: "Products shipped" },
    { value: PROJECTS.filter(isWeb).length, label: "Web platforms" },
    { value: PROJECTS.filter(isMobile).length, label: "Mobile apps for iOS & Android" },
  ];

  return (
    <main className="flex-1">
      <section className="hero-glow relative overflow-hidden px-6 pb-14 pt-20 sm:pt-28">
        <div className="mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-light">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Our work
          </span>
          <h1 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Products we&apos;ve designed, built, and <span className="text-accent">shipped.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            Web platforms and mobile apps running in production today. Every one is live, so you can try
            them yourself.
          </p>

          <dl className="mt-12 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"
              >
                <dt className="order-2 mt-1 text-xs leading-snug text-zinc-400">{stat.label}</dt>
                <dd className="order-1 text-3xl font-semibold tracking-tight text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="px-6 pb-24" aria-label="Projects">
        <div className="mx-auto max-w-6xl">
          <div
            role="group"
            aria-label="Filter projects"
            className="inline-flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1"
          >
            {FILTERS.map((f) => {
              const selected = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  aria-pressed={selected}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
                    selected ? "bg-accent font-medium text-black" : "text-zinc-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {f.label}
                  <span
                    className={`rounded-full px-1.5 text-xs tabular-nums ${
                      selected ? "bg-black/15 text-black" : "bg-white/10 text-zinc-400"
                    }`}
                  >
                    {PROJECTS.filter(f.match).length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-white/10">
        <Testimonials />
      </div>

      <section className="px-6 pb-24">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-3xl border border-accent/20 bg-[radial-gradient(circle_at_top_right,rgba(232,184,75,0.16),transparent_55%),#15120c] p-8 sm:p-12 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Your product next</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              More Projects, More Possibilities
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-zinc-300">
              The projects showcased here represent just a selection of our work. At{" "}
              <strong className="font-semibold text-white">GG-HighTech</strong>, we have developed many more mobile
              applications, web applications, and websites tailored to the unique needs of businesses and
              organizations.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">
              From custom business software and e-commerce platforms to mobile applications and enterprise
              solutions, we continue to deliver innovative, scalable, and reliable technology solutions.
            </p>
            <p className="mt-6 text-base font-semibold text-white">
              Have a project in mind? Let&apos;s bring your ideas to life.
            </p>
          </div>
          <Link
            href="/estimate"
            className="shrink-0 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-105"
          >
            Get an estimate <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const { links } = project;

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_24px_60px_-24px_rgba(232,184,75,0.35)]">
      <div className="relative flex h-44 items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(232,184,75,0.14),transparent_60%),#0f0e0b] px-8">
        {project.logo ? (
          <div className="relative h-24 w-full max-w-[220px] overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:scale-[1.03]">
            <Image
              src={project.logo}
              alt={`${project.name} logo`}
              fill
              sizes="220px"
              className="object-contain p-3"
            />
          </div>
        ) : (
          <Monogram name={project.name} />
        )}

        <ul className="absolute left-4 top-4 flex gap-1.5" aria-label="Platforms">
          {project.platforms.map((platform) => (
            <li
              key={platform}
              className="rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-200 backdrop-blur"
            >
              {platform}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{project.sector}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">{project.name}</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{project.summary}</p>

        {project.stack && (
          <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Technology">
            {project.stack.map((item) => (
              <li key={item} className="rounded-md bg-white/5 px-2 py-1 text-xs text-zinc-300">
                {item}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          {links.web && (
            <ProjectLink href={links.web} primary label={`Visit ${project.name} website`}>
              Visit site
            </ProjectLink>
          )}
          {links.appStore && (
            <ProjectLink href={links.appStore} primary={!links.web} label={`${project.name} on the App Store`}>
              App Store
            </ProjectLink>
          )}
          {links.playStore && (
            <ProjectLink href={links.playStore} label={`${project.name} on Google Play`}>
              Google Play
            </ProjectLink>
          )}
        </div>
      </div>
    </article>
  );
}

function ProjectLink({
  href,
  label,
  primary = false,
  children,
}: {
  href: string;
  label: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (opens in a new tab)`}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
        primary
          ? "bg-accent text-black hover:bg-accent-light"
          : "border border-white/15 text-zinc-200 hover:border-accent/50 hover:text-white"
      }`}
    >
      {children}
      <span aria-hidden="true">↗</span>
    </a>
  );
}

// Stand-in for products with no logo file yet: up to three initials on a
// gold tile, so the card still has a clear visual anchor.
function Monogram({ name }: { name: string }) {
  const words = name.split(/\s+/).filter(Boolean);
  const initials = (words.length > 1 ? words.map((w) => w[0]).join("") : name).slice(0, 4).toUpperCase();

  return (
    <div
      aria-hidden="true"
      className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-accent-light via-accent to-accent-dark text-2xl font-bold tracking-tight text-black shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:scale-[1.03]"
    >
      {initials}
    </div>
  );
}
