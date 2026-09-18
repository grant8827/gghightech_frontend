"use client";

import { useState } from "react";
import { estimatePdfUrl, type EstimateOut } from "@/lib/api";

export function EstimatesTab({ estimates }: { estimates: EstimateOut[] }) {
  const [expandedEstimateId, setExpandedEstimateId] = useState<string | null>(null);

  return (
    <div>
      <h2 className="text-lg font-medium text-white">Estimate leads</h2>
      <p className="mt-1 text-sm text-zinc-400">
        What clients typed in the estimator&apos;s &quot;tell us exactly what you want&quot; field, next to the
        price the toggles calculated — check it holds up before following up.
      </p>
      <div className="mt-4 space-y-3">
        {estimates.map((est) => {
          const isOpen = expandedEstimateId === est.id;
          const scope = est.scope_configuration as {
            project_type?: string;
            features?: string[];
            design_tier?: string;
          };
          return (
            <div key={est.id} className="glass-card rounded-xl p-4">
              <button
                onClick={() => setExpandedEstimateId(isOpen ? null : est.id)}
                className="flex w-full flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="text-sm font-medium text-white">{est.client_email ?? "No email given"}</span>
                  {est.client_phone && <span className="ml-2 text-sm text-zinc-400">· {est.client_phone}</span>}
                  <span className="ml-2 text-xs text-zinc-500">
                    {scope.project_type?.replace(/_/g, " ")} · {scope.design_tier}
                  </span>
                </div>
                <div className="text-sm text-accent-light">
                  ${est.calculated_min_price.toLocaleString()} - ${est.calculated_max_price.toLocaleString()}
                </div>
              </button>

              {isOpen && (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">What they said they want</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">
                    {est.project_description || "— nothing entered —"}
                  </p>
                  <a
                    href={estimatePdfUrl(est.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs text-accent-light underline"
                  >
                    View PDF proposal
                  </a>
                </div>
              )}
            </div>
          );
        })}
        {estimates.length === 0 && (
          <p className="rounded-xl border border-white/10 p-4 text-center text-sm text-zinc-500">
            No estimates submitted yet.
          </p>
        )}
      </div>
    </div>
  );
}
