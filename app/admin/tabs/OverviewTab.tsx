"use client";

import { useEffect, useState } from "react";
import { listInvoices, type EstimateOut, type InvoiceOut, type OrganizationOut, type ProjectOut } from "@/lib/api";

export function OverviewTab({
  token,
  orgs,
  projects,
  estimates,
  onError,
}: {
  token: string;
  orgs: OrganizationOut[];
  projects: ProjectOut[];
  estimates: EstimateOut[];
  onError: (e: unknown) => void;
}) {
  const [invoices, setInvoices] = useState<InvoiceOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listInvoices(token)
      .then(setInvoices)
      .catch(onError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;

  // "GG HighTech (Internal)" (see StaffTab) isn't a client — excluded from
  // the client-facing count and table below.
  const clientOrgs = orgs.filter((o) => o.plan_tier !== "INTERNAL");

  const rows = clientOrgs
    .map((org) => {
      const pending = invoices.filter((inv) => inv.org_id === org.id && inv.status === "PENDING");
      return {
        org,
        count: pending.length,
        outstanding: pending.reduce((sum, inv) => sum + inv.amount, 0),
      };
    })
    .sort((a, b) => b.outstanding - a.outstanding);

  const totalOutstanding = rows.reduce((sum, r) => sum + r.outstanding, 0);
  const totalUnpaid = rows.reduce((sum, r) => sum + r.count, 0);
  const revenueCollected = invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0);
  const activeProjects = projects.filter((p) => p.status === "IN_PROGRESS" || p.status === "QA").length;
  const pipelineValue = estimates.reduce((sum, e) => sum + (e.calculated_min_price + e.calculated_max_price) / 2, 0);

  const stats = [
    { label: "Clients", value: clientOrgs.length.toLocaleString() },
    { label: "Active projects", value: activeProjects.toLocaleString() },
    { label: "Revenue collected", value: `$${revenueCollected.toLocaleString()}` },
    { label: "Payment outstanding", value: `$${totalOutstanding.toLocaleString()}`, highlight: totalOutstanding > 0 },
    { label: "Unpaid invoices", value: totalUnpaid.toLocaleString() },
    { label: "Estimate pipeline", value: `$${Math.round(pipelineValue).toLocaleString()} (${estimates.length})` },
  ];

  return (
    <div>
      <h2 className="text-lg font-medium text-white">Overview</h2>
      <p className="mt-1 text-sm text-zinc-400">Who owes what, and how the business is trending.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="glass-card rounded-xl p-4">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${s.highlight ? "text-accent-light" : "text-white"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 overflow-x-auto">
        <h3 className="text-sm font-medium text-white">Payment outstanding by client</h3>
        <table className="mt-3 w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
              <th className="py-2 pr-6 font-medium">Client</th>
              <th className="py-2 pr-6 font-medium">Unpaid invoices</th>
              <th className="py-2 pr-6 font-medium">Payment outstanding</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ org, count, outstanding }) => (
              <tr key={org.id} className="border-b border-white/5">
                <td className="py-3 pr-6 text-zinc-200">
                  {org.name} <span className="text-xs text-zinc-500">({org.plan_tier})</span>
                </td>
                <td className="py-3 pr-6 text-zinc-300">{count}</td>
                <td className={`py-3 pr-6 ${outstanding > 0 ? "text-accent-light" : "text-zinc-500"}`}>
                  ${outstanding.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="rounded-xl border border-white/10 p-4 text-center text-sm text-zinc-500">
            No clients yet.
          </p>
        )}
      </div>
    </div>
  );
}
