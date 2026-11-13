"use client";

import { useEffect, useState } from "react";
import {
  createInvoice,
  downloadReceiptPdf,
  listInvoices,
  markInvoicePaid,
  PAYMENT_METHOD_LABELS,
  type InvoiceOut,
  type PaymentMethod,
  type ProjectOut,
} from "@/lib/api";

type RecordedMethod = Exclude<PaymentMethod, "CARD">;
const RECORDED_METHODS: RecordedMethod[] = ["CHECK", "WIRE", "CASH", "OTHER"];

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
  // The invoice whose "record payment" form is open, and its fields.
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [method, setMethod] = useState<RecordedMethod>("CHECK");
  const [reference, setReference] = useState("");

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

  function startRecording(id: string) {
    setRecordingId(id);
    setMethod("CHECK");
    setReference("");
  }

  async function handleDownloadReceipt(id: string) {
    setBusyId(`receipt-${id}`);
    try {
      await downloadReceiptPdf(token, id);
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkPaid(e: React.FormEvent, id: string) {
    e.preventDefault();
    setBusyId(id);
    try {
      await markInvoicePaid(token, id, { payment_method: method, payment_reference: reference.trim() || undefined });
      setRecordingId(null);
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
              {inv.status === "PAID" && (
                <span className="flex items-center gap-3 text-xs text-zinc-500">
                  {PAYMENT_METHOD_LABELS[inv.payment_method ?? "OTHER"]}
                  {inv.payment_method !== "CARD" && inv.payment_reference && ` ${inv.payment_reference}`}
                  <button
                    onClick={() => handleDownloadReceipt(inv.id)}
                    disabled={busyId === `receipt-${inv.id}`}
                    className="rounded-full border border-white/15 px-3 py-1 text-zinc-200 hover:border-accent/50 disabled:opacity-50"
                  >
                    Receipt PDF
                  </button>
                </span>
              )}
              {inv.status === "PENDING" && recordingId !== inv.id && (
                <button
                  onClick={() => startRecording(inv.id)}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 hover:border-accent/50"
                >
                  Record payment
                </button>
              )}
              {inv.status === "PENDING" && recordingId === inv.id && (
                <form
                  onSubmit={(e) => handleMarkPaid(e, inv.id)}
                  className="flex w-full flex-wrap items-end gap-2 border-t border-white/10 pt-3"
                >
                  <label className="text-xs text-zinc-400">
                    Paid by
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as RecordedMethod)}
                      className="mt-1 block rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
                    >
                      {RECORDED_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m === "OTHER" ? "Other" : PAYMENT_METHOD_LABELS[m]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-400">
                    Reference <span className="text-zinc-600">(optional)</span>
                    <input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      maxLength={120}
                      placeholder="Check # or transfer ref"
                      className="mt-1 block rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busyId === inv.id}
                    className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
                  >
                    {busyId === inv.id ? "Saving…" : "Mark paid & issue receipt"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordingId(null)}
                    className="rounded-full px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </form>
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
