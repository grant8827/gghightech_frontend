import type { Metadata } from "next";
import { PortfolioGrid } from "@/components/PortfolioGrid";

export const metadata: Metadata = {
  title: "Portfolio — GG HighTech",
  description: "Internal products and client platforms built by GG HighTech, filterable by category.",
};

export default function PortfolioPage() {
  return <PortfolioGrid />;
}
