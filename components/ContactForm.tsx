"use client";

import { useState } from "react";
import { ApiError, sendContactMessage, type MessageSource } from "@/lib/api";

const MESSAGE_MAX = 5000;

const inputClass =
  "mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40";

// Used by the Contact page and the floating message button. Messages go to
// the admin dashboard's Messages tab, and the team gets an email copy.
export function ContactForm({
  source,
  compact = false,
  onDone,
}: {
  source: MessageSource;
  // Single-column layout for the narrow floating panel.
  compact?: boolean;
  // When given, the thank-you message gets a button that calls it — for
  // hosts (like a dialog) that need to be dismissed afterwards.
  onDone?: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  // Spam trap — see the hidden field at the bottom of the form.
  const [website, setWebsite] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await sendContactMessage({ name, email, phone, subject, message, source, website });
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="rounded-2xl border border-accent/30 bg-accent/10 p-6">
        <p className="text-lg font-semibold text-white">Thanks, {name.split(" ")[0]}! Your message is on its way.</p>
        <p className="mt-2 text-sm text-accent-light">We usually reply within one business day at {email}.</p>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            autoFocus
            className="mt-5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-105"
          >
            Done
          </button>
        )}
      </div>
    );
  }

  const grid = compact ? "grid gap-4" : "grid gap-6 sm:grid-cols-2";

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-4" : "space-y-6"}>
      <div className={grid}>
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
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-300">
          Phone <span className="font-normal text-zinc-500">(optional)</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
            autoComplete="tel"
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-300">
          Subject <span className="font-normal text-zinc-500">(optional)</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={150}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-zinc-300">
        Message
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={MESSAGE_MAX}
          rows={compact ? 4 : 6}
          placeholder="Tell us about your project or question."
          className={`${inputClass} resize-y`}
        />
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
        className={`rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-50 ${compact ? "w-full" : ""}`}
      >
        {submitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
