"use client";

import { useEffect, useState } from "react";
import { createInvoice, listInvoices, markInvoicePaid, type InvoiceOut, type ProjectOut } from "@/lib/api";

export function InvoicingTab({
  token,
  projects,
  onError,
}: {
  token: string;
  projects: ProjectOut[];
  onError: (e: unknown) => void;
}) {
  const [invoices, setInvoices] = useState<InvoiceOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  async function refresh() {
    try {
      setInvoices(await listInvoices(token));
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleMarkPaid(id: string) {
    setBusyId(id);
    try {
      await markInvoicePaid(token, id);
      await refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !description.trim() || !amount) return;
    setBusyId("new-invoice");
    try {
      await createInvoice(token, { project_id: projectId, amount: Number(amount), description });
      setDescription("");
      setAmount("");
      await refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  function projectTitle(id: string) {
    return projects.find((p) => p.id === id)?.title ?? "Unknown project";
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div>
      <h2 className="text-lg font-medium text-white">Invoicing</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Every invoice across every project — milestone-driven and ad-hoc alike.
      </p>

      <div className="glass-card mt-6 max-w-md rounded-2xl p-6">
        <h3 className="text-sm font-medium text-white">Create invoice</h3>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <label className="block text-sm text-zinc-300">
            Project
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-zinc-300">
            For
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. March 2026 retainer"
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
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
          <button
            type="submit"
            disabled={busyId === "new-invoice" || projects.length === 0}
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.01] disabled:opacity-50"
          >
            {busyId === "new-invoice" ? "Creating…" : "Create invoice"}
          </button>
        </form>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-medium text-white">All invoices</h3>
        <ul className="mt-3 space-y-2">
          {invoices.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-3 text-sm"
            >
              <span className="text-zinc-200">
                <span className="text-white">{projectTitle(inv.project_id)}</span> · ${inv.amount.toLocaleString()} ·{" "}
                {inv.status}
                {inv.description && <span className="text-zinc-500"> — {inv.description}</span>}
              </span>
              {inv.status === "PENDING" && (
                <button
                  onClick={() => handleMarkPaid(inv.id)}
                  disabled={busyId === inv.id}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 hover:border-accent/50 disabled:opacity-50"
                >
                  {busyId === inv.id ? "…" : "Mark Paid"}
                </button>
              )}
            </li>
          ))}
          {invoices.length === 0 && (
            <p className="rounded-xl border border-white/10 p-4 text-center text-sm text-zinc-500">
              No invoices yet.
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}
