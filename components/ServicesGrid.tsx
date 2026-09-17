import Link from "next/link";

type Service = {
  title: string;
  description: string;
  highlights: string[];
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
    title: "Custom Software Engineering",
    description:
      "High-performance enterprise software tailored to your specific business logic, workflows, and automated pipeline requirements.",
    highlights: ["Microservices Architecture", "High-Throughput APIs", "Legacy Code Modernization"],
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 21V8l8-5 8 5v13" />
        <path d="M9 21v-6h6v6M9 12h.01M15 12h.01M12 12h.01M9 9h.01M15 9h.01M12 9h.01" />
      </svg>
    ),
  },
  {
    title: "iOS & Android Apps",
    description:
      "Fluid cross-platform and native mobile applications with offline sync, push notifications, and biometrics built for scale.",
    highlights: ["React Native & Flutter", "Native Swift / Kotlin", "App Store & Play Store Deployment"],
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
        <path d="M11 18.5h2" />
      </svg>
    ),
  },
  {
    title: "Web & SaaS Platforms",
    description:
      "Modern, ultra-fast web applications built with Next.js, React, and serverless architectures with real-time capabilities.",
    highlights: ["Real-time WebSockets & Dashboards", "Subscription Billing Integration", "SEO & Performance Optimized"],
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
        <path d="M7 6.5h.01M10 6.5h.01" />
      </svg>
    ),
  },
  {
    title: "Cloud DevOps & Security",
    description:
      "Automated CI/CD deployment pipelines, serverless cloud setups (AWS/GCP), Kubernetes, and zero-trust security architecture.",
    highlights: ["AWS / Google Cloud Infrastructure", "Terraform & Docker Containerization", "SOC2 & HIPAA Compliance"],
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M7 18a4 4 0 0 1-1-7.87A5.5 5.5 0 0 1 16.5 8h.5a4.5 4.5 0 0 1 1 8.88" />
        <path d="M12 12v6M9.5 15.5 12 18l2.5-2.5" />
      </svg>
    ),
  },
  {
    title: "AI & LLM Integration",
    description:
      "Custom AI agent integration, RAG pipelines, fine-tuned OpenAI/Claude models, and predictive analytics engines.",
    highlights: ["Intelligent Chatbots & Assistants", "Vector Databases & Embeddings", "Automated Data Processing"],
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 3v2M12 19v2M5 5l1.4 1.4M17.6 17.6L19 19M3 12h2M19 12h2M5 19l1.4-1.4M17.6 6.4L19 5" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    title: "UI/UX & Product Design",
    description:
      "Human-centric interface design, design system creation, interactive Figma prototypes, and user journey optimization.",
    highlights: ["Comprehensive Wireframing", "Scalable Design Systems", "High-Fidelity Interactive Prototypes"],
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 2a10 10 0 1 0 10 10c0-1.5-1-2-2-2h-3a3 3 0 0 1-3-3V5c0-1.5-1-3-2-3Z" />
        <circle cx="7.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="11" cy="7" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export function ServicesGrid({ standalone = true }: { standalone?: boolean }) {
  // On its own page this section carries the page's one <h1>, with card
  // titles as <h3>. Embedded on the home page (which already has its own
  // <h1> in the hero), it steps down a level so heading order stays valid.
  const SectionHeading = standalone ? "h1" : "h2";
  const CardHeading = standalone ? "h3" : "h4";

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            What We Build
          </span>
          <SectionHeading className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            End-to-End Technology Solutions
          </SectionHeading>
          <p className="mt-4 text-sm text-zinc-400 sm:text-base">
            From initial architectural blueprinting to global scaling, we provide full spectrum
            engineering services for startups and enterprise giants.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <div
              key={service.title}
              className="glass-card group relative flex flex-col overflow-hidden rounded-2xl p-7 transition-all hover:-translate-y-1 hover:border-accent/40"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/0 blur-2xl transition-colors group-hover:bg-accent/20"
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-black">
                {service.icon}
              </div>
              <CardHeading className="relative mt-5 text-lg font-medium text-white">{service.title}</CardHeading>
              <p className="relative mt-2 text-sm leading-relaxed text-zinc-400">{service.description}</p>

              <ul className="relative mt-5 space-y-2">
                {service.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/estimate"
                className="relative mt-6 inline-block text-sm font-medium text-accent-light group-hover:underline"
              >
                Learn Details &amp; Tech Stack →
              </Link>
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
