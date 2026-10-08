import type { Metadata } from "next";
import { PortfolioGrid } from "@/components/PortfolioGrid";

export const metadata: Metadata = {
  title: "Portfolio — GG HighTech",
  description:
    "Web platforms and mobile apps designed, built, and shipped by GG HighTech — live products you can try today.",
};

export default function PortfolioPage() {
  return <PortfolioGrid />;
}
