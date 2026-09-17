import Image from "next/image";
import Link from "next/link";

const companyLinks = [
  { href: "/services", label: "Services" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/estimate", label: "Get an Estimate" },
];

const platformLinks = [
  { href: "/portal", label: "Client Portal" },
  { href: "/admin", label: "Admin" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0c0b09] px-6 pt-16 text-zinc-400">
      <div className="mx-auto grid max-w-6xl gap-12 pb-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex items-center gap-3 text-lg font-semibold tracking-tight text-white">
            <Image src="/gghightech-logo.jpg" alt="" width={40} height={40} className="rounded-full" />
            GG <span className="text-accent">HighTech</span>
          </Link>
          <p className="mt-5 text-sm leading-relaxed">
            Custom software, web, mobile, and AI-powered products built to help your business move forward.
          </p>
          <Link href="/estimate" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent-light hover:underline">
            Start a project <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white">Explore</h2>
          <ul className="mt-5 space-y-3">
            {companyLinks.map((link) => (
              <li key={link.href}><Link href={link.href} className="text-sm transition-colors hover:text-accent-light">{link.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white">Your workspace</h2>
          <ul className="mt-5 space-y-3">
            {platformLinks.map((link) => (
              <li key={link.href}><Link href={link.href} className="text-sm transition-colors hover:text-accent-light">{link.label}</Link></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-white/10 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} GG HighTech. All rights reserved.</span>
        <span>Software made for what&apos;s next.</span>
      </div>
    </footer>
  );
}
