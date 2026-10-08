"use client";

import { useEffect, useState } from "react";
import {
  deleteReview,
  listAllReviews,
  moderateReview,
  type ReviewAdmin,
  type ReviewStatus,
} from "@/lib/api";
import { StarRating } from "@/components/StarRating";

const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "PUBLISHED", label: "Published" },
  { id: "PENDING", label: "Pending" },
  { id: "HIDDEN", label: "Hidden" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const STATUS_STYLES: Record<ReviewStatus, string> = {
  PUBLISHED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  PENDING: "border-accent/30 bg-accent/10 text-accent-light",
  HIDDEN: "border-white/10 bg-white/5 text-zinc-400",
};

const actionClass =
  "rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 transition-colors hover:border-accent/50 disabled:opacity-50";

// Reviews are public the moment they're submitted (unless the API is run
// with REVIEWS_AUTO_PUBLISH=false), so this tab is where anything unwanted
// gets taken down, and where reviews are picked for the home page.
export function ReviewsTab({
  token,
  currentUserRole,
  onError,
}: {
  token: string;
  currentUserRole: string;
  onError: (e: unknown) => void;
}) {
  const [reviews, setReviews] = useState<ReviewAdmin[]>([]);
  const [filter, setFilter] = useState<FilterId>("ALL");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    try {
      setReviews(await listAllReviews(token));
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await action();
      await refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  function handleDelete(review: ReviewAdmin) {
    if (!window.confirm(`Permanently delete the review from ${review.name}? This can't be undone.`)) return;
    run(review.id, () => deleteReview(token, review.id));
  }

  const count = (id: FilterId) => (id === "ALL" ? reviews.length : reviews.filter((r) => r.status === id).length);
  const visible = filter === "ALL" ? reviews : reviews.filter((r) => r.status === filter);
  const published = reviews.filter((r) => r.status === "PUBLISHED");
  const average = published.length
    ? (published.reduce((sum, r) => sum + r.rating, 0) / published.length).toFixed(1)
    : null;

  return (
    <div>
      <h2 className="text-lg font-medium text-white">Reviews</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Client reviews from the website. Hide anything that shouldn&apos;t be public, and feature the ones you
        want on the home and portfolio pages.
        {average && ` Public average: ${average} from ${published.length}.`}
      </p>

      <div role="group" aria-label="Filter reviews" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
              filter === f.id ? "bg-accent text-black" : "border border-white/10 text-zinc-300 hover:border-white/30"
            }`}
          >
            {f.label} ({count(f.id)})
          </button>
        ))}
      </div>

      {loading && <p className="mt-6 text-sm text-zinc-500">Loading…</p>}

      <ul className="mt-6 space-y-4">
        {visible.map((review) => {
          const busy = busyId === review.id;
          return (
            <li key={review.id} className="glass-card rounded-2xl p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <StarRating value={review.rating} />
                <span className="text-sm font-medium text-white">{review.name}</span>
                <a href={`mailto:${review.email}`} className="text-xs text-zinc-400 hover:text-accent-light">
                  {review.email}
                </a>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[review.status]}`}>
                  {review.status}
                </span>
                {review.is_featured && (
                  <span className="rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-xs text-accent-light">
                    FEATURED
                  </span>
                )}
                <span className="ml-auto text-xs text-zinc-500">{new Date(review.created_at).toLocaleString()}</span>
              </div>

              <p className="mt-3 whitespace-pre-line break-words text-sm text-zinc-200">{review.message}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {review.status === "PUBLISHED" ? (
                  <>
                    <button
                      disabled={busy}
                      onClick={() => run(review.id, () => moderateReview(token, review.id, { is_featured: !review.is_featured }))}
                      className={actionClass}
                    >
                      {review.is_featured ? "Remove from featured" : "Feature"}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => run(review.id, () => moderateReview(token, review.id, { status: "HIDDEN" }))}
                      className={actionClass}
                    >
                      Hide
                    </button>
                  </>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() => run(review.id, () => moderateReview(token, review.id, { status: "PUBLISHED" }))}
                    className={actionClass}
                  >
                    Publish
                  </button>
                )}
                {currentUserRole === "SUPER_ADMIN" && (
                  <button
                    disabled={busy}
                    onClick={() => handleDelete(review)}
                    className="rounded-full border border-red-400/30 px-3 py-1 text-xs text-red-300 transition-colors hover:border-red-400/60 disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
                {review.moderated_by && review.moderated_at && (
                  <span className="ml-auto text-xs text-zinc-600">
                    Last changed by {review.moderated_by} · {new Date(review.moderated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </li>
          );
        })}
        {!loading && visible.length === 0 && (
          <li className="rounded-2xl border border-white/10 p-6 text-center text-sm text-zinc-500">
            No reviews here yet.
          </li>
        )}
      </ul>
    </div>
  );
}
