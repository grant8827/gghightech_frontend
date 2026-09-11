import Link from "next/link";
import { MetricCounter } from "@/components/MetricCounter";
import { PortfolioGrid } from "@/components/PortfolioGrid";
import { TrustedBy } from "@/components/TrustedBy";

export default function Home() {
  return (
    <div className="flex-1">
      <section className="hero-glow relative overflow-hidden px-6 pb-24 pt-20 sm:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Enterprise software & AI engineering
          </span>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            We build the platforms
            <br />
            your business <span className="text-accent">runs on</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-400 sm:text-lg">
            GG HighTech designs and ships web, mobile, and AI-integrated products — from an
            interactive scope estimate to a live staging preview your team can watch build in
            real time.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/estimate"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-105"
            >
              Get an Instant Estimate
            </Link>
            <Link
              href="#portfolio"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white transition-colors hover:border-white/40"
            >
              View Our Work
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
          <MetricCounter value={40} suffix="+" label="Projects shipped" />
          <MetricCounter value={12} suffix="wk" label="Avg. time to launch" />
          <MetricCounter value={98} suffix="%" label="On-time delivery" />
          <MetricCounter value={24} suffix="/7" label="Staging visibility" />
        </div>
      </section>

      <TrustedBy />

      <PortfolioGrid />

      <section className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Not sure what it&apos;ll cost?
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            Answer a few questions about your project and get a real budget range and timeline —
            no sales call required.
          </p>
          <Link
            href="/estimate"
            className="mt-8 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-105"
          >
            Build Your Estimate
          </Link>
        </div>
      </section>
    </div>
  );
}
