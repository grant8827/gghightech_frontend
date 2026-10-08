"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  getReviewSummary,
  listReviews,
  type ReviewPublic,
  type ReviewStatus,
  type ReviewSummary,
} from "@/lib/api";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewForm } from "@/components/ReviewForm";
import { StarRating } from "@/components/StarRating";
import { GOOGLE_REVIEWS_URL } from "@/components/Testimonials";

export function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewPublic[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const [list, stats] = await Promise.all([listReviews(100), getReviewSummary()]);
      setReviews(list);
      setSummary(stats);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? "Could not load reviews right now." : "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Fetch-on-mount: refresh() sets state only after its awaits resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  function handleSubmitted(status: ReviewStatus) {
    if (status === "PUBLISHED") refresh();
  }

  const average = summary?.average ?? null;
  const count = summary?.count ?? 0;

  return (
    <main className="flex-1">
      <section className="hero-glow relative overflow-hidden px-6 pb-12 pt-20 sm:pt-28">
        <div className="mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-light">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Client reviews
          </span>
          <h1 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            What it&apos;s like to <span className="text-accent">work with us.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            Feedback from the people and organizations we&apos;ve built for. Worked with us? We&apos;d love to
            hear from you too.
          </p>

          {average !== null && summary && (
            <div className="mt-10 grid max-w-3xl gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10">
              <div>
                <p className="text-5xl font-semibold tracking-tight text-white">{average.toFixed(1)}</p>
                <div className="mt-2">
                  <StarRating value={average} size={20} />
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  {count} {count === 1 ? "review" : "reviews"}
                </p>
              </div>
              <dl className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const n = summary.breakdown[String(stars)] ?? 0;
                  const percent = count ? Math.round((n / count) * 100) : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3 text-xs text-zinc-400">
                      <dt className="w-12 shrink-0">
                        {stars} star{stars === 1 ? "" : "s"}
                      </dt>
                      <dd className="flex flex-1 items-center gap-3">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                          <span className="block h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
                        </span>
                        <span className="w-6 text-right tabular-nums">{n}</span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}

          {GOOGLE_REVIEWS_URL && (
            <p className="mt-6 text-sm text-zinc-400">
              We&apos;re on Google too:{" "}
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

      <section className="px-6 pb-16" aria-labelledby="all-reviews-heading">
        <div className="mx-auto max-w-6xl">
          <h2 id="all-reviews-heading" className="sr-only">
            All reviews
          </h2>

          {loading && <p className="text-sm text-zinc-500">Loading reviews…</p>}
          {error && (
            <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
          {!loading && !error && reviews.length === 0 && (
            <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-zinc-400">
              No reviews yet. Be the first to leave one below.
            </p>
          )}

          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="leave-a-review" className="scroll-mt-24 px-6 pb-24" aria-labelledby="leave-a-review-heading">
        <div className="mx-auto max-w-3xl rounded-3xl border border-accent/20 bg-[radial-gradient(circle_at_top_right,rgba(232,184,75,0.12),transparent_55%),#15120c] p-8 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Your turn</p>
          <h2 id="leave-a-review-heading" className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Leave a review
          </h2>
          <p className="mb-8 mt-3 text-sm leading-relaxed text-zinc-300">
            Tell us how your project went. It only takes a minute.
          </p>
          <ReviewForm onSubmitted={handleSubmitted} />
        </div>
      </section>
    </main>
  );
}
