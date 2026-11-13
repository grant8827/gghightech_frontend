"use client";

import { useState } from "react";
import {
  downloadInvoicePdf,
  downloadReceiptPdf,
  payInvoice,
  PAYMENT_METHOD_LABELS,
  receiptNumber,
  type InvoiceOut,
  type MilestoneOut,
  type ProjectOut,
} from "@/lib/api";

export type PaymentsView = "pay" | "receipts";

const money = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });
// Date-only values ("2026-11-13") are read as local dates; parsing them
// with new Date() alone would treat them as UTC and show the day before in
// time zones west of UTC.
const date = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(undefined, { dateStyle: "medium" });

const primaryButton =
  "rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100";
const secondaryButton =
  "rounded-full border border-white/15 px-4 py-2 text-xs text-zinc-200 transition-colors hover:border-accent/50 disabled:opacity-50";

// Two views: unpaid invoices the client can pay (Stripe Checkout), and a
// receipt for every paid one. A receipt exists whether the client paid
// online or GG HighTech recorded a check / wire / cash payment.
export function PaymentsTab({
  token,
  canPay,
  view,
  onViewChange,
  invoices,
  projects,
  milestones,
  onError,
}: {
  token: string;
  canPay: boolean;
  view: PaymentsView;
  onViewChange: (v: PaymentsView) => void;
  invoices: InvoiceOut[];
  projects: ProjectOut[];
  milestones: Record<string, MilestoneOut[]>;
  onError: (e: unknown) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const pending = invoices.filter((i) => i.status === "PENDING");
  const paid = invoices
    .filter((i) => i.status === "PAID")
    .sort((a, b) => (b.paid_at ?? b.created_at).localeCompare(a.paid_at ?? a.created_at));
  const outstanding = pending.reduce((sum, i) => sum + i.amount, 0);
  const paidTotal = paid.reduce((sum, i) => sum + i.amount, 0);

  const projectTitle = (id: string) => projects.find((p) => p.id === id)?.title ?? "Project";
  const now = new Date();
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  function invoiceTitle(inv: InvoiceOut) {
    const milestone = inv.milestone_id ? milestones[inv.project_id]?.find((m) => m.id === inv.milestone_id) : null;
    return milestone ? `Milestone: ${milestone.title}` : inv.description || "Invoice";
  }

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  }

  function pay(inv: InvoiceOut) {
    return run(`pay-${inv.id}`, async () => {
      const { checkout_url } = await payInvoice(token, inv.id);
      window.location.assign(checkout_url);
    });
  }

  const views = [
    { id: "pay" as const, label: "Make a payment", count: pending.length },
    { id: "receipts" as const, label: "Receipts", count: paid.length },
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Balance due</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{money(outstanding)}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {pending.length === 0 ? "You're all paid up." : `${pending.length} unpaid invoice${pending.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Paid to date</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{money(paidTotal)}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {paid.length} receipt{paid.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div role="tablist" aria-label="Payments" className="mt-8 inline-flex rounded-full border border-white/10 p-1">
        {views.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            onClick={() => onViewChange(v.id)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              view === v.id ? "bg-accent font-semibold text-black" : "text-zinc-300 hover:text-white"
            }`}
          >
            {v.label} ({v.count})
          </button>
        ))}
      </div>

      {view === "pay" ? (
        <section aria-label="Make a payment" className="mt-6">
          {!canPay && pending.length > 0 && (
            <p className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-zinc-400">
              Only your account admin can pay invoices online. You can still download them.
            </p>
          )}
          <ul className="space-y-3">
            {pending.map((inv) => (
              <li
                key={inv.id}
                className="glass-card flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {inv.invoice_number && <span className="font-mono text-xs text-zinc-400">{inv.invoice_number}</span>}
                    {inv.due_date && inv.due_date < today && (
                      <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                        ! Overdue
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-medium text-white">{invoiceTitle(inv)}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {projectTitle(inv.project_id)} · Issued {date(inv.issue_date ?? inv.created_at)}
                    {inv.due_date && ` · Due ${date(inv.due_date)}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-lg font-semibold tabular-nums text-white">{money(inv.amount)}</span>
                  <button
                    onClick={() => run(`pdf-${inv.id}`, () => downloadInvoicePdf(token, inv.id, inv.invoice_number))}
                    disabled={busy === `pdf-${inv.id}`}
                    className={secondaryButton}
                  >
                    {busy === `pdf-${inv.id}` ? "Downloading…" : "Invoice PDF"}
                  </button>
                  {canPay && (
                    <button onClick={() => pay(inv)} disabled={busy !== null} className={primaryButton}>
                      {busy === `pay-${inv.id}` ? "Opening checkout…" : `Pay ${money(inv.amount)}`}
                    </button>
                  )}
                </div>
              </li>
            ))}
            {pending.length === 0 && (
              <li className="rounded-2xl border border-white/10 p-8 text-center text-sm text-zinc-500">
                Nothing to pay right now. New invoices will show up here.
              </li>
            )}
          </ul>
          {canPay && pending.length > 0 && (
            <p className="mt-4 text-xs text-zinc-500">
              Payments are processed securely by Stripe. You&apos;ll get a receipt here as soon as it goes through.
            </p>
          )}
        </section>
      ) : (
        <section aria-label="Receipts" className="mt-6">
          <ul className="space-y-3">
            {paid.map((inv) => {
              const method = inv.payment_method ?? "OTHER";
              const paidOnline = method === "CARD";
              return (
                <li
                  key={inv.id}
                  className="glass-card flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-zinc-400">{receiptNumber(inv.id)}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${
                          paidOnline
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "border-accent/30 bg-accent/10 text-accent-light"
                        }`}
                      >
                        {paidOnline ? "You paid online" : "From GG HighTech"}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate font-medium text-white">{invoiceTitle(inv)}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {projectTitle(inv.project_id)} · Paid {date(inv.paid_at ?? inv.created_at)} ·{" "}
                      {PAYMENT_METHOD_LABELS[method]}
                      {!paidOnline && inv.payment_reference && ` ${inv.payment_reference}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold tabular-nums text-white">{money(inv.amount)}</span>
                    <button
                      onClick={() => run(`receipt-${inv.id}`, () => downloadReceiptPdf(token, inv.id))}
                      disabled={busy === `receipt-${inv.id}`}
                      className={primaryButton}
                    >
                      {busy === `receipt-${inv.id}` ? "Downloading…" : "Download PDF"}
                    </button>
                  </div>
                </li>
              );
            })}
            {paid.length === 0 && (
              <li className="rounded-2xl border border-white/10 p-8 text-center text-sm text-zinc-500">
                No receipts yet. Every payment, online or recorded by our team, gets a receipt here.
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
