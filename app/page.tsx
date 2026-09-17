import Link from "next/link";
import { PortalDemoSection } from "@/components/PortalDemoSection";
import { TrustedBy } from "@/components/TrustedBy";

const benefits = [
  {
    number: "01",
    title: "Software that fits your business",
    description: "Replace scattered tools and manual work with a platform built around the way your team operates.",
  },
  {
    number: "02",
    title: "Experiences people want to use",
    description: "Give customers and staff a fast, intuitive experience across web and mobile.",
  },
  {
    number: "03",
    title: "A foundation ready to grow",
    description: "Connect your data, add thoughtful automation, and keep your product ready for what comes next.",
  },
];

const steps = [
  { number: "01", title: "Understand", description: "We map your goals, users, and the work your product needs to do." },
  { number: "02", title: "Shape", description: "We turn the idea into a clear scope, design, and build plan." },
  { number: "03", title: "Build", description: "We develop in visible stages so you can review progress as it happens." },
  { number: "04", title: "Launch", description: "We ship, refine, and support the product as your needs evolve." },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="hero-glow relative overflow-hidden px-6 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-light">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Software built for what&apos;s next
            </span>
            <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Your next idea deserves <span className="text-accent">better software.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              We design and build custom web, mobile, and AI-powered products that make complex work feel simple and help businesses move forward.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/estimate" className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-105">
                Start a project <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/portfolio" className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:border-accent/50 hover:bg-white/10">
                Explore our work
              </Link>
            </div>
            <p className="mt-8 text-sm text-zinc-500">From first concept to launch and beyond.</p>
          </div>

          <div className="relative mx-auto w-full max-w-xl" role="img" aria-label="Illustration of a software product moving from discovery to launch">
            <div className="absolute -inset-6 rounded-[3rem] bg-accent/10 blur-3xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#10100e] shadow-[0_32px_100px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-accent" /><span className="text-xs font-semibold tracking-wide text-white">Product workspace</span></div>
                <div className="flex gap-1.5" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/20" /></div>
              </div>
              <div className="grid grid-cols-[72px_1fr] sm:grid-cols-[105px_1fr]">
                <div className="space-y-5 border-r border-white/10 bg-white/[0.025] px-4 py-6" aria-hidden="true">
                  <div className="h-2 w-8 rounded-full bg-accent/70" /><div className="h-2 w-full rounded-full bg-white/15" /><div className="h-2 w-3/4 rounded-full bg-white/15" /><div className="h-2 w-full rounded-full bg-white/15" />
                </div>
                <div className="p-5 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">From concept to reality</p><p className="mt-1 text-lg font-semibold text-white sm:text-xl">Built around your goals</p></div>
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] text-accent-light">In progress</span>
                  </div>
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent" aria-hidden="true">✦</span><p className="mt-5 text-sm font-medium text-white">Clearer workflows</p><p className="mt-1 text-xs leading-relaxed text-zinc-500">Less friction in every step.</p></div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent" aria-hidden="true">↗</span><p className="mt-5 text-sm font-medium text-white">Room to grow</p><p className="mt-1 text-xs leading-relaxed text-zinc-500">A product built to evolve.</p></div>
                  </div>
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between text-xs"><span className="text-zinc-400">Your product journey</span><span className="text-accent-light">Launch</span></div>
                    <div className="mt-4 flex items-center gap-2" aria-hidden="true"><span className="h-2.5 flex-1 rounded-full bg-accent" /><span className="h-2.5 flex-1 rounded-full bg-accent" /><span className="h-2.5 flex-1 rounded-full bg-accent/50" /><span className="h-2.5 flex-1 rounded-full bg-white/10" /></div>
                    <div className="mt-2 flex justify-between text-[10px] text-zinc-500"><span>Discover</span><span>Design</span><span>Build</span><span>Ship</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-24" aria-labelledby="benefits-heading">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">What we make possible</p><h2 id="benefits-heading" className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">Technology that works harder for you.</h2></div>
            <Link href="/services" className="text-sm font-medium text-accent-light hover:underline">Explore all services <span aria-hidden="true">→</span></Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {benefits.map((item) => <article key={item.number} className="glass-card rounded-2xl p-7"><span className="text-xs font-semibold text-accent">{item.number}</span><h3 className="mt-8 text-xl font-medium text-white">{item.title}</h3><p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.description}</p></article>)}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025] px-6 py-24" aria-labelledby="process-heading">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">How we work</p><h2 id="process-heading" className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">A clear path from idea to impact.</h2><p className="mt-4 text-zinc-400">Good software starts with understanding the problem. We bring strategy, design, and engineering together to move your idea forward.</p></div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => <div key={step.number} className="border-t border-white/15 pt-5"><span className="text-sm font-medium text-accent">{step.number}</span><h3 className="mt-5 text-lg font-medium text-white">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.description}</p></div>)}
          </div>
        </div>
      </section>

      <PortalDemoSection />

      <section className="px-6 py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-3xl border border-accent/20 bg-[radial-gradient(circle_at_top_right,rgba(232,184,75,0.16),transparent_55%),#15120c] p-8 sm:p-12 md:flex-row md:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Let&apos;s build</p><h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">Ready to turn your idea into something real?</h2><p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-300">Tell us what you&apos;re planning. Get a starting budget and timeline in just a few steps.</p></div>
          <Link href="/estimate" className="shrink-0 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-105">Get an estimate <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
      <TrustedBy />
    </main>
  );
}
