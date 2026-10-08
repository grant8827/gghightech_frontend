const STAR_PATH =
  "M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9L12 2.5z";

export function Star({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={filled ? "fill-accent text-accent" : "fill-transparent text-zinc-600"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

// Read-only star display. The stars are decorative; the rating itself is
// carried by the label, so it reads as "4 out of 5 stars" rather than five
// unlabeled images. `value` may be fractional (an average) — it is rounded
// to the nearest whole star for display only.
export function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  const label = `${Number.isInteger(value) ? value : value.toFixed(1)} out of 5 stars`;
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= rounded} size={size} />
      ))}
    </span>
  );
}
