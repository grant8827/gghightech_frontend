"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  createSubscriptionPlan,
  generateSubscriptionInvoice,
  listSubscriptionPlans,
  updateSubscriptionPlan,
  type OrganizationOut,
  type ProjectOut,
  type SubscriptionPlanOut,
} from "@/lib/api";

export function PaymentsTab({
  token,
  orgs,
  projects,
  onError,
}: {
  token: string;
  orgs: OrganizationOut[];
  projects: ProjectOut[];
  onError: (e: unknown) => void;
}) {
  const [plans, setPlans] = useState<SubscriptionPlanOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [genMessage, setGenMessage] = useState<Record<string, string>>({});

  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDay, setBillingDay] = useState("1");

  const orgProjects = projects.filter((p) => p.org_id === orgId);

  async function refresh() {
    try {
      setPlans(await listSubscriptionPlans(token));
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !name.trim() || !amount) return;
    setBusyId("new-plan");
    try {
      await createSubscriptionPlan(token, {
        org_id: orgId,
        project_id: projectId || undefined,
        name,
        amount: Number(amount),
        billing_day: Number(billingDay),
      });
      setName("");
      setAmount("");
      await refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function handleStatusChange(planId: string, status: string) {
    setBusyId(planId);
    try {
      await updateSubscriptionPlan(token, planId, { status });
      await refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function handleGenerate(planId: string) {
    setBusyId(planId);
    setGenMessage((m) => ({ ...m, [planId]: "" }));
    try {
      const invoice = await generateSubscriptionInvoice(token, planId);
      setGenMessage((m) => ({ ...m, [planId]: `Invoice created: $${invoice.amount.toLocaleString()}` }));
      await refresh();
    } catch (e) {
      setGenMessage((m) => ({
        ...m,
        [planId]: e instanceof ApiError ? e.message : "Could not reach the API",
      }));
    } finally {
      setBusyId(null);
    }
  }

  function orgName(id: string) {
    return orgs.find((o) => o.id === id)?.name ?? "Unknown org";
  }

  function projectTitle(id: string | null) {
    if (!id) return "No project set";
    return projects.find((p) => p.id === id)?.title ?? "Unknown project";
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div>
      <h2 className="text-lg font-medium text-white">Payments &amp; Subscriptions</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Recurring billing plans per client. There&apos;s no scheduler behind these yet — &quot;Generate this
        month&apos;s invoice&quot; creates one real invoice on demand, same honest stopping point as the
        Stripe-stubbed Pay button until a real Stripe account with recurring prices exists.
      </p>

      <div className="glass-card mt-6 max-w-md rounded-2xl p-6">
        <h3 className="text-sm font-medium text-white">Create plan</h3>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <label className="block text-sm text-zinc-300">
            Organization
            <select
              value={orgId}
              onChange={(e) => {
                setOrgId(e.target.value);
                setProjectId("");
              }}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-zinc-300">
            Project (optional until you generate an invoice)
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            >
              <option value="">— none —</option>
              {orgProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-zinc-300">
            Plan name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly retainer"
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </label>
          <div className="flex gap-3">
            <label className="block flex-1 text-sm text-zinc-300">
              Amount $
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
            <label className="block w-28 text-sm text-zinc-300">
              Billing day
              <input
                type="number"
                min="1"
                max="28"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busyId === "new-plan" || orgs.length === 0}
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.01] disabled:opacity-50"
          >
            {busyId === "new-plan" ? "Creating…" : "Create plan"}
          </button>
        </form>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-medium text-white">Plans</h3>
        <ul className="mt-3 space-y-3">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-lg border border-white/10 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-zinc-200">
                  <span className="text-white">{plan.name}</span> · {orgName(plan.org_id)} ·{" "}
                  {projectTitle(plan.project_id)}
                  <br />
                  <span className="text-zinc-400">
                    ${plan.amount.toLocaleString()}/mo on day {plan.billing_day} · {plan.status}
                    {plan.last_invoiced_at && ` · last invoiced ${new Date(plan.last_invoiced_at).toLocaleDateString()}`}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  {plan.status === "ACTIVE" && (
                    <button
                      onClick={() => handleGenerate(plan.id)}
                      disabled={busyId === plan.id}
                      className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-black disabled:opacity-50"
                    >
                      {busyId === plan.id ? "…" : "Generate this month's invoice"}
                    </button>
                  )}
                  {plan.status !== "CANCELED" && (
                    <button
                      onClick={() => handleStatusChange(plan.id, plan.status === "ACTIVE" ? "PAUSED" : "ACTIVE")}
                      disabled={busyId === plan.id}
                      className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 hover:border-accent/50 disabled:opacity-50"
                    >
                      {plan.status === "ACTIVE" ? "Pause" : "Resume"}
                    </button>
                  )}
                  {plan.status !== "CANCELED" && (
                    <button
                      onClick={() => handleStatusChange(plan.id, "CANCELED")}
                      disabled={busyId === plan.id}
                      className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-400 hover:border-red-400/50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              {genMessage[plan.id] && <p className="mt-2 text-xs text-zinc-400">{genMessage[plan.id]}</p>}
            </li>
          ))}
          {plans.length === 0 && (
            <p className="rounded-xl border border-white/10 p-4 text-center text-sm text-zinc-500">
              No subscription plans yet.
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}
