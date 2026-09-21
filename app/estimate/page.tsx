"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  createEstimate,
  estimatePdfUrl,
  previewEstimate,
  type EstimatePreview,
  type EstimateOut,
  type ScopeAnalysis,
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
  const [savedEstimate, setSavedEstimate] = useState<EstimateOut | null>(null);
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
    setSavedEstimate(null);
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
        project_description: description,
      });
      setSavedEstimate(estimate);
      const scope = estimate.scope_configuration as unknown as EstimatePreview;
      setPreview({
        calculated_min_price: estimate.calculated_min_price,
        calculated_max_price: estimate.calculated_max_price,
        estimated_weeks_min: estimate.estimated_weeks_min,
        estimated_weeks_max: estimate.estimated_weeks_max,
        infrastructure: scope.infrastructure ?? [],
        monthly_operating_min: scope.monthly_operating_min ?? 0,
        monthly_operating_max: scope.monthly_operating_max ?? 0,
        first_year_operating_min: scope.first_year_operating_min ?? 0,
        first_year_operating_max: scope.first_year_operating_max ?? 0,
      });
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
                    setSavedEstimate(null);
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
                    setSavedEstimate(null);
                  }}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-zinc-300">
              Tell us exactly what you want <span className="text-accent">*</span>
            </legend>
            <p className="mt-1 text-xs text-zinc-500">
              Include who will use it, the main workflow, integrations, expected traffic, and
              what success looks like. This brief is required and used to evaluate complexity,
              overlooked requirements, and operating costs.
            </p>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSavedEstimate(null);
              }}
              required
              minLength={40}
              maxLength={4000}
              rows={5}
              placeholder="e.g. We need a customer portal where users can log in, view invoices, and message our support team. We also want it to sync with our existing inventory system…"
              className="mt-3 w-full resize-y rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-accent"
            />
            <div className={`mt-1 text-right text-xs ${description.length > 0 && description.length < 40 ? "text-amber-400" : "text-zinc-600"}`}>{description.length}/4000 · minimum 40 characters</div>
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
                setSavedEstimate(null);
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
                setSavedEstimate(null);
              }}
              placeholder="(555) 123-4567"
              className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-accent"
            />
          </fieldset>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || description.trim().length < 40}
            className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {submitting ? "Analyzing scope…" : "Analyze & Save Estimate"}
          </button>

          {savedEstimate && (
            <div className="rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm text-accent-light">
              Saved! Reference <span className="font-mono">{savedEstimate.id.slice(0, 8)}</span>.{" "}
              <a
                href={estimatePdfUrl(savedEstimate.id)}
                className="font-medium underline"
                target="_blank"
                rel="noreferrer"
              >
                Download PDF proposal
              </a>
            </div>
          )}

          {savedEstimate && (() => {
            const analysis = (savedEstimate.scope_configuration as { analysis?: ScopeAnalysis }).analysis;
            return analysis ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-medium text-white">Scope evaluation</h2>
                  <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs capitalize text-accent-light">{analysis.complexity} complexity</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">{analysis.summary}</p>
                {analysis.detected_requirements.length > 0 && <p className="mt-3 text-xs text-zinc-400">Detected: {analysis.detected_requirements.join(" · ")}</p>}
                <p className="mt-3 text-xs leading-relaxed text-zinc-500">{analysis.market_comparison}</p>
                <p className="mt-3 text-xs text-accent-light">Complexity adjustment: +{analysis.adjustment_percent}% · {analysis.source === "openai" ? "AI evaluated" : "Rules evaluated"}</p>
              </div>
            ) : null;
          })()}
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

          {preview && preview.infrastructure.length > 0 && (
            <div className="mt-7 border-t border-white/10 pt-6">
              <div className="text-xs uppercase tracking-wide text-zinc-400">Operating costs</div>
              <div className="mt-2 text-lg font-medium text-white">${preview.monthly_operating_min.toLocaleString()} - ${preview.monthly_operating_max.toLocaleString()}<span className="text-sm font-normal text-zinc-500"> / month</span></div>
              <div className="mt-1 text-sm text-zinc-400">${preview.first_year_operating_min.toLocaleString()} - ${preview.first_year_operating_max.toLocaleString()} first year</div>
              <div className="mt-4 space-y-3">
                {preview.infrastructure.map((item) => (
                  <div key={item.name} className="flex items-start justify-between gap-4 text-xs">
                    <div><div className="text-zinc-300">{item.name}</div><div className="mt-0.5 text-zinc-600">{item.note}</div></div>
                    <div className="shrink-0 text-right text-zinc-400">
                      {item.monthly_max > 0 && <div>${item.monthly_min}-${item.monthly_max}/mo</div>}
                      {item.annual_max > 0 && <div>${item.annual_min}-${item.annual_max}/yr</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && <div className="mt-4 h-1 w-full animate-pulse rounded-full bg-accent/40" />}

          <p className="mt-6 text-xs text-zinc-500">
            Non-binding estimate. Development and recurring operating costs are shown separately.
            Third-party usage and market pricing can change before launch.
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
