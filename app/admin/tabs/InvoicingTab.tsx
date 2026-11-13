"use client";

import { useEffect, useState } from "react";
import { signedSeenAt } from "@/lib/signedContracts";
import type { OrganizationOut, ProjectOut } from "@/lib/api";
import { ContractsPanel } from "./invoicing/ContractsPanel";
import { InvoicesPanel } from "./invoicing/InvoicesPanel";

const VIEWS = [
  { id: "invoices", label: "Invoices" },
  { id: "contracts", label: "Contracts" },
] as const;

type View = (typeof VIEWS)[number]["id"];

// Admin "Invoicing / Contracts": itemized invoices sent to clients with a
// PDF and pay-online link, and project contracts the client e-signs in the
// portal.
export function InvoicingTab({
  token,
  projects,
  orgs,
  newlySigned,
  onContractsSeen,
  onError,
}: {
  token: string;
  projects: ProjectOut[];
  orgs: OrganizationOut[];
  // Contracts signed since this browser last looked (badge from the admin
  // page); opening Contracts marks them seen.
  newlySigned: number;
  onContractsSeen: () => void;
  onError: (e: unknown) => void;
}) {
  // Newly signed contracts? Open straight on Contracts.
  const [view, setView] = useState<View>(newlySigned > 0 ? "contracts" : "invoices");
  // When Contracts was last seen *before* this visit, so the panel can mark
  // which signed contracts are new even after the badge clears.
  const [seenBefore] = useState(signedSeenAt);

  useEffect(() => {
    if (view === "contracts") onContractsSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return (
    <div>
      <h2 className="text-lg font-medium text-white">Invoicing / Contracts</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Create professional invoices and project contracts, send them to clients, and track payment and signatures.
      </p>

      <div role="tablist" aria-label="Invoicing and contracts" className="mt-6 flex gap-1 border-b border-white/10">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              view === v.id ? "border-accent text-white" : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {v.label}
            {v.id === "contracts" && newlySigned > 0 && (
              <span className="ml-2 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-black">
                ✓ {newlySigned}
                <span className="sr-only"> newly signed</span>
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {view === "invoices" ? (
          <InvoicesPanel token={token} projects={projects} orgs={orgs} onError={onError} />
        ) : (
          <ContractsPanel token={token} projects={projects} orgs={orgs} seenBefore={seenBefore} onError={onError} />
        )}
      </div>
    </div>
  );
}
