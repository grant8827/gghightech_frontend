"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  createInvoice,
  createSubscriptionCheckout,
  createSubscriptionPlan,
  generateSubscriptionInvoice,
  listSubscriptionPlans,
  sendInvoicePaymentLink,
  updateSubscriptionPlan,
  type OrganizationOut,
  type ProjectOut,
  type SubscriptionPlanOut,
} from "@/lib/api";

const FREQUENCIES = [
  { id: "ONE_TIME", label: "One-time" },
  { id: "MONTHLY", label: "Monthly" },
  { id: "ANNUAL", label: "Annual" },
] as const;

type Frequency = (typeof FREQUENCIES)[number]["id"];

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
  const [checkoutLinks, setCheckoutLinks] = useState<Record<string, string>>({});

  const [frequency, setFrequency] = useState<Frequency>("ONE_TIME");
  const [subscribe, setSubscribe] = useState(false);
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDay, setBillingDay] = useState("1");
  const [customerEmail, setCustomerEmail] = useState("");
  const [createResult, setCreateResult] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
    if (!orgId || !name.trim() || !amount || !customerEmail.trim()) return;
    setCreating(true);
    setCreateResult(null);
    try {
      if (frequency === "ONE_TIME") {
        if (!projectId) {
          onError(new Error("Select a project for a one-time charge"));
          return;
        }
        const invoice = await createInvoice(token, {
          project_id: projectId,
          amount: Number(amount),
          description: name,
          customer_email: customerEmail,
        });
        const { checkout_url } = await sendInvoicePaymentLink(token, invoice.id);
        setCreateResult(`Link sent to ${customerEmail}: ${checkout_url}`);
      } else {
        const isAnnual = frequency === "ANNUAL";
        const isSubscription = isAnnual || subscribe;
        const plan = await createSubscriptionPlan(token, {
          org_id: orgId,
          project_id: projectId || undefined,
          name,
          amount: Number(amount),
          billing_frequency: frequency,
          is_subscription: isSubscription,
          billing_day: isSubscription ? undefined : Number(billingDay),
          customer_email: customerEmail,
        });
        if (isSubscription) {
          const { checkout_url } = await createSubscriptionCheckout(token, plan.id);
          setCreateResult(`Link sent to ${customerEmail}: ${checkout_url}`);
        } else {
          setCreateResult(`Plan created — use "Generate this month's invoice" below when it's due.`);
        }
      }
      setName("");
      setAmount("");
      setCustomerEmail("");
      await refresh();
    } catch (e) {
      onError(e);
    } finally {
      setCreating(false);
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
      setGenMessage((m) => ({
        ...m,
        [planId]: `Invoice created: $${invoice.amount.toLocaleString()}${
          invoice.customer_email ? ` — link sent to ${invoice.customer_email}` : ""
        }`,
      }));
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

  async function handleCheckoutLink(planId: string) {
    setBusyId(planId);
    try {
      const result = await createSubscriptionCheckout(token, planId);
      setCheckoutLinks((links) => ({ ...links, [planId]: result.checkout_url }));
    } catch (e) {
      onError(e);
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

  function planLabel(plan: SubscriptionPlanOut) {
    const freq = plan.billing_frequency === "ANNUAL" ? "Annual" : "Monthly";
    return `${freq} · ${plan.is_subscription ? "recurring" : "manual"}`;
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div>
      <h2 className="text-lg font-medium text-white">Payments &amp; Subscriptions</h2>
      <p className="mt-1 text-sm text-zinc-400">
        One-time charges, annual pass-through costs, and monthly retainers — each creates a Stripe
        Checkout link and emails it to the customer. Email delivery is stubbed (logged only) until a
        real provider is configured — see app/services/email.py.
      </p>

      <div className="glass-card mt-6 max-w-md rounded-2xl p-6">
        <h3 className="text-sm font-medium text-white">Create a payment request</h3>

        <div className="mt-3 flex gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFrequency(f.id);
                if (f.id !== "MONTHLY") setSubscribe(false);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                frequency === f.id
                  ? "border-accent bg-accent/10 text-white"
                  : "border-white/10 text-zinc-300 hover:border-white/30"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {frequency === "MONTHLY" && (
          <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={subscribe} onChange={(e) => setSubscribe(e.target.checked)} />
            Set up as an auto-renewing subscription (charges automatically each month)
          </label>
        )}
        {frequency === "ANNUAL" && (
          <p className="mt-3 text-xs text-zinc-500">Annual charges always auto-renew each year.</p>
        )}

        <form onSubmit={handleCreate} className="mt-4 space-y-3">
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
            Project {frequency === "ONE_TIME" ? "" : "(optional)"}
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
            {frequency === "ONE_TIME" ? "What's this for" : "Plan name"}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={frequency === "ONE_TIME" ? "e.g. Checkout bug fix" : "e.g. Monthly retainer"}
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Customer email
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="client@company.com"
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
            {frequency === "MONTHLY" && !subscribe && (
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
            )}
          </div>
          <button
            type="submit"
            disabled={creating || orgs.length === 0}
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.01] disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create & send"}
          </button>
        </form>
        {createResult && <p className="mt-3 text-xs text-accent-light">{createResult}</p>}
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-medium text-white">Plans</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Recurring (Annual, or Monthly with auto-renew) and manual monthly plans. One-time charges
          aren&apos;t plans — they show up as invoices on the Invoicing tab.
        </p>
        <ul className="mt-3 space-y-3">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-lg border border-white/10 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-zinc-200">
                  <span className="text-white">{plan.name}</span> · {orgName(plan.org_id)} ·{" "}
                  {projectTitle(plan.project_id)}
                  <br />
                  <span className="text-zinc-400">
                    ${plan.amount.toLocaleString()} · {planLabel(plan)}
                    {plan.billing_day != null && ` on day ${plan.billing_day}`} · {plan.status}
                    {plan.customer_email && ` · ${plan.customer_email}`}
                    {plan.last_invoiced_at && ` · last invoiced ${new Date(plan.last_invoiced_at).toLocaleDateString()}`}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  {plan.status === "ACTIVE" && plan.is_subscription && (
                    <button
                      onClick={() => handleCheckoutLink(plan.id)}
                      disabled={busyId === plan.id}
                      className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-black disabled:opacity-50"
                    >
                      {busyId === plan.id ? "…" : "Resend Stripe link"}
                    </button>
                  )}
                  {plan.status === "ACTIVE" && !plan.is_subscription && (
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
              {checkoutLinks[plan.id] && (
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <a href={checkoutLinks[plan.id]} target="_blank" rel="noreferrer" className="text-accent-light underline">
                    Open subscription checkout
                  </a>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(checkoutLinks[plan.id])}
                    className="text-zinc-400 hover:text-white"
                  >
                    Copy link
                  </button>
                </div>
              )}
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
