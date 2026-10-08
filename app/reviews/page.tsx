import type { Metadata } from "next";
import { ReviewsPage } from "@/components/ReviewsPage";

export const metadata: Metadata = {
  title: "Client Reviews — GG HighTech",
  description: "Read what clients say about working with GG HighTech, and leave a review of your own project.",
};

export default function Reviews() {
  return <ReviewsPage />;
}
