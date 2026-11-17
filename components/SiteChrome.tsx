"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The dashboards (/admin, /portal) are apps with their own navigation, so
// the marketing site's header and footer are left off there.
export const isDashboardPath = (pathname: string | null) =>
  !!pathname && /^\/(admin|portal)(\/|$)/.test(pathname);

export function HideOnDashboard({ children }: { children: React.ReactNode }) {
  return isDashboardPath(usePathname()) ? null : <>{children}</>;
}

// Small "back to the website" brand link for the dashboards' own headers.
export function DashboardBrand() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
      <Image src="/gghightech-logo.jpg" alt="" width={28} height={28} className="rounded-full" />
      GG <span className="text-accent">HighTech</span>
    </Link>
  );
}
