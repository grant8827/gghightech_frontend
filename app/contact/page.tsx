import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us — GG HighTech",
  description: "Send GG HighTech a message about your project or question. We usually reply within one business day.",
};

export default function Contact() {
  return (
    <main className="flex-1">
      <section className="hero-glow relative overflow-hidden px-6 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-light">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Contact us
            </span>
            <h1 className="mt-7 text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
              Let&apos;s talk about <span className="text-accent">what you&apos;re building.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-zinc-300 sm:text-lg">
              Have a question, an idea, or a project in mind? Send us a message and our team will get back to you,
              usually within one business day.
            </p>
            <p className="mt-8 text-sm text-zinc-400">
              Ready for numbers?{" "}
              <Link href="/estimate" className="font-medium text-accent-light hover:underline">
                Get an instant estimate <span aria-hidden="true">↗</span>
              </Link>
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-10">
            <ContactForm source="CONTACT_PAGE" />
          </div>
        </div>
      </section>
    </main>
  );
}
