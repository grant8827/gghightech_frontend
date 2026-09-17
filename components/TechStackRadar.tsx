type Tool = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
};

const TOOLS: Tool[] = [
  {
    title: "React / Next.js",
    subtitle: "Frontend SaaS",
    icon: <ReactIcon />,
  },
  {
    title: "Node.js / Express",
    subtitle: "Backend Microservices",
    icon: <NodeIcon />,
  },
  {
    title: "Python / AI",
    subtitle: "Data & Machine Learning",
    icon: <PythonIcon />,
  },
  {
    title: "AWS / GCP",
    subtitle: "Cloud Infrastructure",
    icon: <AwsIcon />,
  },
  {
    title: "PostgreSQL / Redis",
    subtitle: "High Speed Storage",
    icon: <DatabaseIcon />,
  },
  {
    title: "Docker / K8s",
    subtitle: "Containerization",
    icon: <DockerIcon />,
  },
];

export function TechStackRadar() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Our Tech Stack Radar
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Modern Engineering Toolkit
          </h2>
          <p className="mt-4 text-sm text-zinc-400 sm:text-base">
            We leverage industry-proven, high-performance tools to build resilient software.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {TOOLS.map((tool) => (
            <div
              key={tool.title}
              className="glass-card flex flex-col items-center rounded-2xl p-6 text-center transition-transform hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
                {tool.icon}
              </div>
              <p className="mt-4 text-sm font-medium text-white">{tool.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{tool.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReactIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#61dafb" strokeWidth="1">
      <circle cx="12" cy="12" r="2.2" fill="#61dafb" stroke="none" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
    </svg>
  );
}

function NodeIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3fcf8e" strokeWidth="1.4">
      <path
        d="M12 2 3 6.5v11L12 22l9-4.5v-11L12 2Z"
        strokeLinejoin="round"
      />
      <text x="12" y="15" textAnchor="middle" fontSize="7" fill="#3fcf8e" stroke="none" fontWeight="700">
        JS
      </text>
    </svg>
  );
}

function PythonIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24">
      <path
        d="M11.9 2c-4 0-3.8 1.7-3.8 1.7v1.8h3.9v.6H6.4S4 5.8 4 9.9s2.1 4 2.1 4h1.3V12s-.1-2.1 2.1-2.1h3.8s2 0 2-2V4S15.7 2 11.9 2Zm-2.2 1.3a.7.7 0 1 1 0 1.4.7.7 0 0 1 0-1.4Z"
        fill="#3776ab"
      />
      <path
        d="M12.1 22c4 0 3.8-1.7 3.8-1.7v-1.8h-3.9v-.6h5.6s2.4.3 2.4-3.8-2.1-4-2.1-4h-1.3V12s.1 2.1-2.1 2.1H10.7s-2 0-2 2v4S8.3 22 12.1 22Zm2.2-1.3a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4Z"
        fill="#ffd43b"
      />
    </svg>
  );
}

function AwsIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 48 32" fill="none">
      <text x="24" y="20" textAnchor="middle" fontSize="16" fontWeight="700" fill="#ff9900" fontFamily="Arial, sans-serif">
        aws
      </text>
      <path
        d="M6 24c8 5 28 5 36 0"
        stroke="#ff9900"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M40 22.5 44 24l-2 3.5" stroke="#ff9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5b8def" strokeWidth="1.6">
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </svg>
  );
}

function DockerIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="#2496ed" stroke="none">
      <rect x="3" y="10" width="3" height="3" rx="0.4" />
      <rect x="7" y="10" width="3" height="3" rx="0.4" />
      <rect x="11" y="10" width="3" height="3" rx="0.4" />
      <rect x="7" y="6.3" width="3" height="3" rx="0.4" />
      <rect x="11" y="6.3" width="3" height="3" rx="0.4" />
      <path d="M1.5 13.3c1 5.8 5.6 6.7 9.8 6.7 6.4 0 11-3 12.7-8.6 1.4.1 2.4-.9 2.7-2.1-.7-.5-1.7-.6-2.6-.2-.2-1-.9-1.7-.9-1.7s-1.2.9-1.4 2.3c-.5-.1-1-.1-1.5-.1H1.5Z" />
    </svg>
  );
}
