"use client";

import { useState } from "react";
import { ApiError, submitReview, type ReviewStatus } from "@/lib/api";
import { Star } from "@/components/StarRating";

const RATING_LABELS: Record<number, string> = {
  1: "1 star — poor",
  2: "2 stars — fair",
  3: "3 stars — good",
  4: "4 stars — very good",
  5: "5 stars — excellent",
};

const MESSAGE_MAX = 1500;

const inputClass =
  "mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40";

export function ReviewForm({ onSubmitted }: { onSubmitted?: (status: ReviewStatus) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  // Spam trap — see the hidden field at the bottom of the form.
  const [website, setWebsite] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<ReviewStatus | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating === 0) {
      setError("Please choose a star rating.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitReview({ name, email, rating, message, website });
      setSubmitted(res.status);
      onSubmitted?.(res.status);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div role="status" className="rounded-2xl border border-accent/30 bg-accent/10 p-6">
        <p className="text-lg font-semibold text-white">Thank you for your review!</p>
        <p className="mt-2 text-sm text-accent-light">
          {submitted === "PUBLISHED"
            ? "It's now live on this page."
            : "It will appear on this page once our team has approved it."}
        </p>
      </div>
    );
  }

  const shown = hovered || rating;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-300">
          Your name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-300">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            aria-describedby="review-email-note"
            className={inputClass}
          />
          <span id="review-email-note" className="mt-2 block text-xs font-normal text-zinc-500">
            Never shown publicly. We only use it if we need to follow up with you.
          </span>
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-zinc-300">Your rating</legend>
        {/* Native radio buttons, visually replaced by stars: arrow keys,
            focus and screen-reader announcements all come for free. */}
        <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              onMouseEnter={() => setHovered(n)}
              className="cursor-pointer rounded-md p-1 transition-transform hover:scale-110 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
            >
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="sr-only"
              />
              <span className="sr-only">{RATING_LABELS[n]}</span>
              <Star filled={n <= shown} size={32} />
            </label>
          ))}
          <span className="ml-3 text-sm text-zinc-400" aria-hidden="true">
            {shown ? RATING_LABELS[shown] : "Choose a rating"}
          </span>
        </div>
      </fieldset>

      <label className="block text-sm font-medium text-zinc-300">
        Your review
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={MESSAGE_MAX}
          rows={5}
          placeholder="What did we build for you, and how did it go?"
          className={`${inputClass} resize-y`}
        />
        <span className="mt-2 block text-right text-xs font-normal text-zinc-600">
          {message.length}/{MESSAGE_MAX}
        </span>
      </label>

      {/* Spam trap. Hidden from people (off-screen, out of the tab order,
          hidden from assistive tech) but present in the markup, so bots
          that fill in every field give themselves away. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
