"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  createEstimate,
  estimatePdfUrl,
  previewEstimate,
  type EstimatePreview,
} from "@/lib/api";

const PROJECT_TYPES = [
  { id: "LANDING_PAGE", label: "Landing Page" },
  { id: "WEB_APPLICATION", label: "Web Application" },
  { id: "MOBILE_APP", label: "Mobile App" },
  { id: "CROSS_PLATFORM_ECOSYSTEM", label: "Cross-Platform Ecosystem" },
];

const FEATURES = [
  { id: "AI_INTEGRATION", label: "AI Integration" },
  { id: "AUTH", label: "Authentication" },
  { id: "PAYMENTS", label: "Payments" },
  { id: "REALTIME_SYNC", label: "Realtime Sync" },
];

const DESIGN_TIERS = [
  { id: "STANDARD", label: "Standard" },
  { id: "PREMIUM", label: "Premium" },
  { id: "MOTION_3D", label: "3D Motion Design" },
];

export default function EstimatePage() {
  const [projectType, setProjectType] = useState(PROJECT_TYPES[1].id);
  const [features, setFeatures] = useState<string[]>([]);
  const [designTier, setDesignTier] = useState(DESIGN_TIERS[0].id);

  const [preview, setPreview] = useState<EstimatePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [savedEstimateId, setSavedEstimateId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Live recalculation as inputs change (GGH-201 AC) — debounced against a
  // stateless /estimates/preview call so we never spam the DB while the
  // user is still toggling options.
  useEffect(() => {
    const handle = setTimeout(() => {
      setError(null);
      setLoading(true);
      previewEstimate({ project_type: projectType, features, design_tier: designTier })
        .then(setPreview)
        .catch((e) => setError(e instanceof ApiError ? e.message : "Could not reach the estimator"))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [projectType, features, designTier]);

  function toggleFeature(id: string) {
    setFeatures((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
    setSavedEstimateId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const estimate = await createEstimate({
        project_type: projectType,
        features,
        design_tier: designTier,
        client_email: email || undefined,
        client_phone: phone || undefined,
        project_description: description || undefined,
      });
      setSavedEstimateId(estimate.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit the estimate");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">Build Your Estimate</h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-400">
          Choose a project type, the features you need, and a design tier — the budget range and
          timeline update as you go.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.3fr_1fr]">
        <form onSubmit={handleSubmit} className="space-y-8">
          <fieldset>
            <legend className="text-sm font-medium text-zinc-300">Project type</legend>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PROJECT_TYPES.map((opt) => (
                <OptionCard
                  key={opt.id}
                  label={opt.label}
                  selected={projectType === opt.id}
                  onClick={() => {
                    setProjectType(opt.id);
                    setSavedEstimateId(null);
                  }}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-zinc-300">Features</legend>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {FEATURES.map((opt) => (
                <OptionCard
                  key={opt.id}
                  label={opt.label}
                  selected={features.includes(opt.id)}
                  onClick={() => toggleFeature(opt.id)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-zinc-300">Design tier</legend>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {DESIGN_TIERS.map((opt) => (
                <OptionCard
                  key={opt.id}
                  label={opt.label}
                  selected={designTier === opt.id}
                  onClick={() => {
                    setDesignTier(opt.id);
                    setSavedEstimateId(null);
                  }}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-zinc-300">
              Tell us exactly what you want (optional)
            </legend>
            <p className="mt-1 text-xs text-zinc-500">
              The toggles above give a fast ballpark. Describe your project here and a GG
              HighTech engineer will check it against that range before following up — this
              doesn&apos;t change the price shown, it&apos;s what gets us to an accurate one.
            </p>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSavedEstimateId(null);
              }}
              maxLength={4000}
              rows={5}
              placeholder="e.g. We need a customer portal where users can log in, view invoices, and message our support team. We also want it to sync with our existing inventory system…"
              className="mt-3 w-full resize-y rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-accent"
            />
            <div className="mt-1 text-right text-xs text-zinc-600">{description.length}/4000</div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-zinc-300">
              Email (optional — get a PDF proposal)
            </legend>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSavedEstimateId(null);
              }}
              placeholder="you@company.com"
              className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-accent"
            />
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-zinc-300">Phone (optional)</legend>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setSavedEstimateId(null);
              }}
              placeholder="(555) 123-4567"
              className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-accent"
            />
          </fieldset>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Save This Estimate"}
          </button>

          {savedEstimateId && (
            <div className="rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm text-accent-light">
              Saved! Reference <span className="font-mono">{savedEstimateId.slice(0, 8)}</span>.{" "}
              <a
                href={estimatePdfUrl(savedEstimateId)}
                className="font-medium underline"
                target="_blank"
                rel="noreferrer"
              >
                Download PDF proposal
              </a>
            </div>
          )}
        </form>

        <div className="glass-card h-fit rounded-2xl p-8 lg:sticky lg:top-24">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Estimated budget</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            {preview ? (
              <>
                ${preview.calculated_min_price.toLocaleString()} - $
                {preview.calculated_max_price.toLocaleString()}
              </>
            ) : (
              <span className="text-zinc-500">Calculating…</span>
            )}
          </div>

          <div className="mt-6 text-xs uppercase tracking-wide text-zinc-400">Estimated timeline</div>
          <div className="mt-2 text-xl font-medium text-white">
            {preview ? (
              <>
                {preview.estimated_weeks_min} - {preview.estimated_weeks_max} weeks
              </>
            ) : (
              <span className="text-zinc-500">—</span>
            )}
          </div>

          {loading && <div className="mt-4 h-1 w-full animate-pulse rounded-full bg-accent/40" />}

          <p className="mt-6 text-xs text-zinc-500">
            Non-binding, automatically calculated. A GG HighTech engineer confirms final scope
            after you submit.
          </p>
        </div>
      </div>
    </div>
  );
}

function OptionCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
        selected
          ? "border-accent bg-accent/10 text-white"
          : "border-white/10 text-zinc-300 hover:border-white/30"
      }`}
    >
      {label}
    </button>
  );
}
