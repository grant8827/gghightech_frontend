"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ApiError,
  listContracts,
  listInvoices,
  listMilestones,
  listProjects,
  type ContractOut,
  type InvoiceOut,
  type MilestoneOut,
  type ProjectOut,
  type StoredAuth,
} from "@/lib/api";
import { AuthGate } from "@/components/AuthGate";
import { ContractsTab } from "./tabs/ContractsTab";
import { PaymentsTab, type PaymentsView } from "./tabs/PaymentsTab";
import { ProjectsTab } from "./tabs/ProjectsTab";

const TABS = [
  { id: "projects", label: "View projects" },
  { id: "payments", label: "Payments" },
  { id: "contracts", label: "Contracts" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function PortalPage() {
  return (
    <AuthGate title="Client portal sign-in" subtitle="Sign in to view your projects and payments.">
      {({ auth, onSessionExpired, onLogout }) => (
        // useSearchParams (below) needs a Suspense boundary — see
        // node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md
        <Suspense fallback={<p className="mx-auto max-w-5xl px-6 py-16 text-sm text-zinc-500">Loading…</p>}>
          <ClientDashboard auth={auth} onSessionExpired={onSessionExpired} onLogout={onLogout} />
        </Suspense>
      )}
    </AuthGate>
  );
}

function ClientDashboard({
  auth,
  onSessionExpired,
  onLogout,
}: {
  auth: StoredAuth;
  onSessionExpired: () => void;
  onLogout: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Stripe Checkout sends clients back to /portal?payment=success|cancelled
  // (STRIPE_SUCCESS_URL / STRIPE_CANCEL_URL on the backend).
  const paymentResult = searchParams.get("payment");

  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabId>(
    paymentResult || requestedTab === "payments" ? "payments" : requestedTab === "contracts" ? "contracts" : "projects",
  );
  const [paymentsView, setPaymentsView] = useState<PaymentsView>(paymentResult === "success" ? "receipts" : "pay");
  const [banner, setBanner] = useState<{ tone: "ok" | "info"; text: string } | null>(
    paymentResult === "success"
      ? { tone: "ok", text: "Thank you, your payment went through. Your receipt is below and can be downloaded as a PDF." }
      : paymentResult === "cancelled"
        ? { tone: "info", text: "Payment cancelled. Nothing was charged; you can pay whenever you're ready." }
        : null,
  );

  const [projects, setProjects] = useState<ProjectOut[]>([]);
  const [milestones, setMilestones] = useState<Record<string, MilestoneOut[]>>({});
  const [invoices, setInvoices] = useState<InvoiceOut[]>([]);
  const [contracts, setContracts] = useState<ContractOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function handleError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      onSessionExpired();
      return;
    }
    setError(e instanceof ApiError ? e.message : "Could not reach the server. Please try again.");
  }

  async function refresh() {
    try {
      const [projectsRes, invoicesRes, contractsRes] = await Promise.all([
        listProjects(auth.token),
        listInvoices(auth.token),
        listContracts(auth.token),
      ]);
      const milestoneLists = await Promise.all(projectsRes.map((p) => listMilestones(auth.token, p.id)));
      setProjects(projectsRes);
      setInvoices(invoicesRes);
      setContracts(contractsRes);
      setMilestones(Object.fromEntries(projectsRes.map((p, i) => [p.id, milestoneLists[i]])));
      setError(null);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    if (paymentResult) {
      // Drop ?payment= so a reload doesn't repeat the message.
      router.replace(`${pathname}?tab=payments`, { scroll: false });
    }
    if (paymentResult !== "success") return;
    // Stripe confirms the payment to our server by webhook, usually within
    // a few seconds of the redirect — check again so the receipt appears.
    const timers = [3000, 8000, 20000].map((ms) => window.setTimeout(refresh, ms));
    return () => timers.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingCount = invoices.filter((i) => i.status === "PENDING").length;
  const toSignCount = contracts.filter((c) => c.status === "SENT").length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Client dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">Track your projects, pay invoices, download receipts and sign contracts.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent-light">
            {auth.full_name}
          </span>
          <button
            onClick={onLogout}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 hover:border-white/30"
          >
            Log out
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Dashboard sections" className="mt-8 flex gap-1 border-b border-white/10">
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                selected ? "border-accent text-white" : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label}
              {tab.id === "payments" && pendingCount > 0 && (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold leading-none text-black">
                  {pendingCount}
                  <span className="sr-only"> unpaid</span>
                </span>
              )}
              {tab.id === "contracts" && toSignCount > 0 && (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold leading-none text-black">
                  {toSignCount}
                  <span className="sr-only"> to sign</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {banner && activeTab === "payments" && (
        <div
          role="status"
          className={`mt-6 flex items-start justify-between gap-4 rounded-lg border p-3 text-sm ${
            banner.tone === "ok"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
              : "border-white/15 bg-white/5 text-zinc-300"
          }`}
        >
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} aria-label="Dismiss" className="text-zinc-400 hover:text-white">
            ×
          </button>
        </div>
      )}

      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="mt-8">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : activeTab === "projects" ? (
          <ProjectsTab projects={projects} milestones={milestones} />
        ) : activeTab === "contracts" ? (
          <ContractsTab
            token={auth.token}
            canSign={auth.role === "CLIENT_ADMIN"}
            signerDefault={auth.full_name}
            contracts={contracts}
            projects={projects}
            onSigned={refresh}
            onError={handleError}
          />
        ) : (
          <PaymentsTab
            token={auth.token}
            canPay={auth.role === "CLIENT_ADMIN"}
            view={paymentsView}
            onViewChange={setPaymentsView}
            invoices={invoices}
            projects={projects}
            milestones={milestones}
            onError={handleError}
          />
        )}
      </div>
    </div>
  );
}
