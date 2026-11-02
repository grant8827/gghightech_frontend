"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  createInstantPayment,
  listInstantPayments,
  resendInstantPayment,
  type InstantPaymentOut,
  type InstantPaymentSent,
} from "@/lib/api";

function sentMessage(result: InstantPaymentSent) {
  return result.email_sent
    ? `Link sent to ${result.payment.customer_email}.`
    : `Link created, but the email couldn't be sent — copy the link below and send it to ${result.payment.customer_email} yourself.`;
}

export function InstantPaymentPanel({ token, onError }: { token: string; onError: (e: unknown) => void }) {
  const [payments, setPayments] = useState<InstantPaymentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowMessage, setRowMessage] = useState<Record<string, string>>({});

  const [customerEmail, setCustomerEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ message: string; url?: string; error?: boolean } | null>(null);

  async function refresh() {
    try {
      setPayments(await listInstantPayments(token));
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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!customerEmail.trim() || !amount) return;
    setSending(true);
    setResult(null);
    try {
      const sent = await createInstantPayment(token, {
        customer_email: customerEmail.trim(),
        amount: Number(amount),
        description: description.trim() || undefined,
      });
      setResult({ message: sentMessage(sent), url: sent.checkout_url });
      setCustomerEmail("");
      setAmount("");
      setDescription("");
    } catch (e) {
      // The payment is recorded before the Stripe step, so even on a
      // Stripe failure it's in the list below and can be resent.
      setResult({ message: e instanceof ApiError ? e.message : "Could not reach the API", error: true });
    } finally {
      setSending(false);
      await refresh();
    }
  }

  async function handleResend(paymentId: string) {
    setBusyId(paymentId);
    setRowMessage((m) => ({ ...m, [paymentId]: "" }));
    try {
      const sent = await resendInstantPayment(token, paymentId);
      setRowMessage((m) => ({ ...m, [paymentId]: sentMessage(sent) }));
      await refresh();
    } catch (e) {
      setRowMessage((m) => ({ ...m, [paymentId]: e instanceof ApiError ? e.message : "Could not reach the API" }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="glass-card mt-6 max-w-md rounded-2xl p-6">
        <h3 className="text-sm font-medium text-white">Send an instant payment link</h3>
        <p className="mt-1 text-xs text-zinc-500">
          No client account or project needed — the customer gets a Stripe payment link by email.
        </p>
        <form onSubmit={handleSend} className="mt-4 space-y-3">
          <label className="block text-sm text-zinc-300">
            Customer email
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@example.com"
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Amount $
            <input
              type="number"
              min="0.50"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            What&apos;s it for (optional)
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Domain renewal"
              maxLength={500}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </label>
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.01] disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send payment link"}
          </button>
        </form>
        {result && (
          <div className={`mt-3 text-xs ${result.error ? "text-red-400" : "text-accent-light"}`}>
            <p>{result.message}</p>
            {result.url && (
              <div className="mt-2 flex items-center gap-3">
                <a href={result.url} target="_blank" rel="noreferrer" className="underline">
                  Open link
                </a>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(result.url!)}
                  className="text-zinc-400 hover:text-white"
                >
                  Copy link
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-medium text-white">Sent links</h3>
        {loading ? (
          <p className="mt-3 text-sm text-zinc-500">Loading…</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {payments.map((p) => (
              <li key={p.id} className="rounded-lg border border-white/10 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-zinc-200">
                    <span className="text-white">${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>{" "}
                    · {p.customer_email}
                    {p.description && ` · ${p.description}`}
                    <br />
                    <span className="text-zinc-400">
                      {new Date(p.created_at).toLocaleDateString()} ·{" "}
                      <span className={p.status === "PAID" ? "text-emerald-400" : "text-amber-300"}>{p.status}</span>
                      {p.paid_at && ` · paid ${new Date(p.paid_at).toLocaleDateString()}`}
                    </span>
                  </span>
                  {p.status !== "PAID" && (
                    <div className="flex items-center gap-2">
                      {p.checkout_url && (
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(p.checkout_url!)}
                          className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 hover:border-accent/50"
                        >
                          Copy link
                        </button>
                      )}
                      <button
                        onClick={() => handleResend(p.id)}
                        disabled={busyId === p.id}
                        className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-black disabled:opacity-50"
                      >
                        {busyId === p.id ? "…" : "Resend link"}
                      </button>
                    </div>
                  )}
                </div>
                {rowMessage[p.id] && <p className="mt-2 text-xs text-zinc-400">{rowMessage[p.id]}</p>}
              </li>
            ))}
            {payments.length === 0 && (
              <p className="rounded-xl border border-white/10 p-4 text-center text-sm text-zinc-500">
                No instant payment links sent yet.
              </p>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
