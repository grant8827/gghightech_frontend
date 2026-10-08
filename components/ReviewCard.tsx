import type { ReviewPublic } from "@/lib/api";
import { StarRating } from "@/components/StarRating";

export function ReviewCard({ review }: { review: ReviewPublic }) {
  const initial = review.name.trim().charAt(0).toUpperCase() || "?";
  const date = new Date(review.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" });

  return (
    <figure className="glass-card flex h-full flex-col rounded-3xl p-6">
      <StarRating value={review.rating} />
      <blockquote className="mt-4 flex-1 whitespace-pre-line break-words text-sm leading-relaxed text-zinc-200">
        {review.message}
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent-light"
        >
          {initial}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-white">{review.name}</span>
          <span className="block text-xs text-zinc-500">{date}</span>
        </span>
      </figcaption>
    </figure>
  );
}
