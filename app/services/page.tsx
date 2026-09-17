import type { Metadata } from "next";
import { ServicesGrid } from "@/components/ServicesGrid";
import { TechStackRadar } from "@/components/TechStackRadar";

export const metadata: Metadata = {
  title: "Services — GG HighTech",
  description:
    "Full-spectrum engineering services — custom software, mobile apps, web & SaaS platforms, cloud DevOps, AI integration, and UI/UX design.",
};

export default function ServicesPage() {
  return (
    <>
      <ServicesGrid />
      <TechStackRadar />
    </>
  );
}
