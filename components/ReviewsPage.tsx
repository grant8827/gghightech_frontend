"use client";

import { useEffect, useRef, useState } from "react";
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

// Reviews are fetched a page at a time; "Show more" keeps going until a
// short page says there are none left, so every published review is reachable.
const PAGE_SIZE = 30;

// The home and portfolio pages link here with this hash to open the form
// straight away (see components/Testimonials.tsx).
const LEAVE_REVIEW_HASH = "#leave-a-review";

export function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewPublic[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The form lives in a native <dialog>: showModal() gives focus trapping,
  // Escape-to-close, and an inert page behind it without any extra code.
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Bumped each time the dialog opens, so the form starts fresh (blank
  // fields, no leftover "thank you") instead of showing its last state.
  const [formKey, setFormKey] = useState(0);

  async function refresh() {
    try {
      const [list, stats] = await Promise.all([listReviews(PAGE_SIZE), getReviewSummary()]);
      setReviews(list);
      setHasMore(list.length === PAGE_SIZE);
      setSummary(stats);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? "Could not load reviews right now." : "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = await listReviews(PAGE_SIZE, reviews.length);
      setReviews((current) => {
        const seen = new Set(current.map((r) => r.id));
        return [...current, ...next.filter((r) => !seen.has(r.id))];
      });
      setHasMore(next.length === PAGE_SIZE);
    } catch {
      setError("Could not load more reviews right now.");
    } finally {
      setLoadingMore(false);
    }
  }

  function openForm() {
    setFormKey((k) => k + 1);
    dialogRef.current?.showModal();
  }

  function closeForm() {
    dialogRef.current?.close();
  }

  useEffect(() => {
    // Fetch-on-mount: refresh() sets state only after its awaits resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    if (window.location.hash === LEAVE_REVIEW_HASH) {
      openForm();
      // Drop the hash so a reload doesn't pop the form open again.
      window.history.replaceState(null, "", window.location.pathname);
    }
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
          <button
            onClick={openForm}
            className="mt-8 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-105"
          >
            Leave a review
          </button>

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

      <section className="px-6 pb-24" aria-labelledby="all-reviews-heading">
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
              No reviews yet. Be the first to leave one.
            </p>
          )}

          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="mt-10 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:border-accent/50 hover:bg-white/10 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Show more reviews"}
              </button>
            </div>
          )}
        </div>
      </section>

      <dialog
        ref={dialogRef}
        aria-labelledby="leave-a-review-heading"
        // Clicking the dimmed area outside the panel closes it: the panel
        // fills the dialog's content box, so a click whose target is the
        // dialog element itself can only have landed on the backdrop.
        onClick={(e) => {
          if (e.target === e.currentTarget) closeForm();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl bg-transparent p-0 text-white backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      >
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-accent/20 bg-[radial-gradient(circle_at_top_right,rgba(232,184,75,0.12),transparent_55%),#15120c] p-6 sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Your turn</p>
              <h2 id="leave-a-review-heading" className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Leave a review
              </h2>
            </div>
            <button
              onClick={closeForm}
              aria-label="Close"
              className="-mr-2 -mt-2 rounded-full p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <p className="mb-8 mt-3 text-sm leading-relaxed text-zinc-300">
            Tell us how your project went. It only takes a minute.
          </p>
          <ReviewForm key={formKey} onSubmitted={handleSubmitted} onDone={closeForm} />
        </div>
      </dialog>
    </main>
  );
}
