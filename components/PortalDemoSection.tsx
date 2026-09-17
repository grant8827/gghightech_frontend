"use client";

import Link from "next/link";
import { useState } from "react";
import { PortalDemoModal } from "@/components/PortalDemoModal";

export function PortalDemoSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="px-6 py-24" aria-labelledby="portal-demo-heading">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:p-12 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">See it live</p>
          <h2 id="portal-demo-heading" className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Watch your project come together in real time.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-300">
            Every client gets a live dashboard with sprint progress, staging previews, and direct
            updates from the team building their product.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <button
            onClick={() => setOpen(true)}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-105"
          >
            Watch a live demo
          </button>
          <Link
            href="/portal"
            className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:border-accent/50 hover:bg-white/10"
          >
            Client Portal
          </Link>
        </div>
      </div>

      <PortalDemoModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
