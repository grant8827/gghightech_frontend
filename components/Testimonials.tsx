"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getReviewSummary, listReviewHighlights, type ReviewPublic, type ReviewSummary } from "@/lib/api";
import { ReviewCard } from "@/components/ReviewCard";
import { StarRating } from "@/components/StarRating";

// Optional: set NEXT_PUBLIC_GOOGLE_REVIEWS_URL to GG HighTech's Google
// Business Profile reviews link to show a "Reviews on Google" button.
export const GOOGLE_REVIEWS_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL ?? "";

// The reviews block on the home and portfolio pages: the overall rating, a
// few highlighted reviews, and the way in to read them all or leave one.
// It always renders the invitation to leave a review; the rating and cards
// only appear once there is something to show, and if the API can't be
// reached the section quietly falls back to just that invitation.
export function Testimonials() {
  const [reviews, setReviews] = useState<ReviewPublic[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listReviewHighlights(3), getReviewSummary()])
      .then(([highlights, stats]) => {
        if (cancelled) return;
        setReviews(highlights);
        setSummary(stats);
      })
      .catch(() => {
        // Reviews are a nice-to-have on these pages — never surface an error here.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasReviews = summary !== null && summary.count > 0 && summary.average !== null;

  return (
    <section className="px-6 py-24" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Client reviews</p>
            <h2
              id="testimonials-heading"
              className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              {hasReviews ? "What our clients say." : "Worked with us? Tell us how it went."}
            </h2>
            {hasReviews && summary.average !== null && (
              <p className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                <span className="text-2xl font-semibold text-white">{summary.average.toFixed(1)}</span>
                <StarRating value={summary.average} size={18} />
                <span className="text-zinc-400">
                  from {summary.count} {summary.count === 1 ? "review" : "reviews"}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {hasReviews && (
              <Link
                href="/reviews"
                className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-accent/50 hover:bg-white/10"
              >
                Read all reviews
              </Link>
            )}
            <Link
              href="/reviews#leave-a-review"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-105"
            >
              Leave a review
            </Link>
          </div>
        </div>

        {reviews.length > 0 && (
          <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>
        )}

        {GOOGLE_REVIEWS_URL && (
          <p className="mt-8 text-sm text-zinc-400">
            You can also find us on Google:{" "}
            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent-light hover:underline"
            >
              read our Google reviews <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
