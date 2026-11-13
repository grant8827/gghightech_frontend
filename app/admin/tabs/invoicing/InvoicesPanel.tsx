"use client";

import { useEffect, useState } from "react";
import {
  createInvoice,
  downloadInvoicePdf,
  downloadReceiptPdf,
  listInvoices,
  listMilestones,
  markInvoicePaid,
  PAYMENT_METHOD_LABELS,
  sendInvoice,
  type InvoiceOut,
  type MilestoneOut,
  type OrganizationOut,
  type PaymentMethod,
  type ProjectOut,
} from "@/lib/api";
import {
  addDays,
  Card,
  Chip,
  Field,
  fmtDate,
  inputClass,
  money,
  primaryButton,
  projectLabel,
  secondaryButton,
  smallButton,
  StatTile,
  todayIso,
} from "./ui";

type RecordedMethod = Exclude<PaymentMethod, "CARD">;
const RECORDED_METHODS: RecordedMethod[] = ["CHECK", "WIRE", "CASH", "OTHER"];

type Row = { key: number; description: string; quantity: string; unit_price: string };

const DUE_PRESETS = [
  { label: "On receipt", days: 0 },
  { label: "Net 7", days: 7 },
  { label: "Net 14", days: 14 },
  { label: "Net 30", days: 30 },
];

const FILTERS = ["All", "Unpaid", "Overdue", "Paid"] as const;
type Filter = (typeof FILTERS)[number];

const cents = (n: number) => Math.round(n * 100) / 100;

export function invoiceStatus(inv: InvoiceOut, today = todayIso()) {
  if (inv.status === "PAID") return "PAID";
  if (inv.due_date && inv.due_date < today) return "OVERDUE";
  return inv.sent_at ? "SENT" : "NOT SENT";
}

let rowKey = 1;
const emptyRow = (): Row => ({ key: rowKey++, description: "", quantity: "1", unit_price: "" });

export function InvoicesPanel({
  token,
  projects,
  orgs,
  onError,
}: {
  token: string;
  projects: ProjectOut[];
  orgs: OrganizationOut[];
  onError: (e: unknown) => void;
}) {
  const [invoices, setInvoices] = useState<InvoiceOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("All");
  const [builderOpen, setBuilderOpen] = useState(false);

  // Record-payment form (one invoice at a time).
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [method, setMethod] = useState<RecordedMethod>("CHECK");
  const [reference, setReference] = useState("");

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

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  }

  const send = (inv: InvoiceOut) =>
    run(`send-${inv.id}`, async () => {
      const res = await sendInvoice(token, inv.id);
      setNotice(
        res.email_sent
          ? `Invoice ${inv.invoice_number} emailed to ${inv.customer_email}${res.checkout_url ? " with a pay-online link" : ""}.`
          : "The invoice wasn't emailed: email isn't configured on the server.",
      );
      await refresh();
    });

  const recordPayment = (e: React.FormEvent, inv: InvoiceOut) => {
    e.preventDefault();
    return run(inv.id, async () => {
      await markInvoicePaid(token, inv.id, { payment_method: method, payment_reference: reference.trim() || undefined });
      setRecordingId(null);
      setNotice(`Invoice ${inv.invoice_number} marked paid. The client can now download the receipt.`);
      await refresh();
    });
  };

  const today = todayIso();
  const unpaid = invoices.filter((i) => i.status !== "PAID");
  const overdue = unpaid.filter((i) => invoiceStatus(i, today) === "OVERDUE");
  const monthStart = today.slice(0, 8) + "01";
  const paidThisMonth = invoices.filter((i) => i.status === "PAID" && (i.paid_at ?? "").slice(0, 10) >= monthStart);
  const visible = invoices.filter((i) => {
    const s = invoiceStatus(i, today);
    if (filter === "Unpaid") return s !== "PAID";
    if (filter === "Overdue") return s === "OVERDUE";
    if (filter === "Paid") return s === "PAID";
    return true;
  });
  const sum = (list: InvoiceOut[]) => list.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Outstanding" value={money(sum(unpaid))} detail={`${unpaid.length} unpaid`} />
        <StatTile label="Overdue" value={money(sum(overdue))} detail={`${overdue.length} invoice${overdue.length === 1 ? "" : "s"}`} />
        <StatTile label="Paid this month" value={money(sum(paidThisMonth))} detail={`${paidThisMonth.length} payment${paidThisMonth.length === 1 ? "" : "s"}`} />
        <StatTile label="All invoices" value={String(invoices.length)} />
      </div>

      {notice && (
        <p role="status" className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent-light">
          {notice}
        </p>
      )}

      {builderOpen ? (
        <InvoiceBuilder
          token={token}
          projects={projects}
          orgs={orgs}
          onCancel={() => setBuilderOpen(false)}
          onError={onError}
          onCreated={async (message) => {
            setBuilderOpen(false);
            setNotice(message);
            await refresh();
          }}
        />
      ) : (
        <button onClick={() => setBuilderOpen(true)} disabled={projects.length === 0} className={primaryButton}>
          + New invoice
        </button>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">Invoices</h3>
          <div role="group" aria-label="Filter invoices" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  filter === f ? "bg-accent text-black" : "border border-white/10 text-zinc-300 hover:border-white/30"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="mt-4 text-sm text-zinc-500">Loading…</p>}
        <ul className="mt-4 space-y-2">
          {visible.map((inv) => {
            const status = invoiceStatus(inv, today);
            const project = projects.find((p) => p.id === inv.project_id);
            return (
              <li key={inv.id} className="glass-card rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-zinc-400">{inv.invoice_number ?? "—"}</span>
                      <Chip label={status} />
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-white">{inv.description || "Invoice"}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {projectLabel(project, orgs)}
                      {inv.customer_email && ` · ${inv.customer_email}`}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <p className="text-base font-semibold text-white">{money(inv.amount)}</p>
                    <p>
                      {inv.status === "PAID"
                        ? `Paid ${fmtDate(inv.paid_at)} · ${PAYMENT_METHOD_LABELS[inv.payment_method ?? "OTHER"]}`
                        : `Due ${fmtDate(inv.due_date)}`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                  <button
                    onClick={() => run(`pdf-${inv.id}`, () => downloadInvoicePdf(token, inv.id, inv.invoice_number))}
                    disabled={busy === `pdf-${inv.id}`}
                    className={smallButton}
                  >
                    Invoice PDF
                  </button>
                  {inv.status !== "PAID" && (
                    <button
                      onClick={() => send(inv)}
                      disabled={busy === `send-${inv.id}` || !inv.customer_email}
                      title={inv.customer_email ? undefined : "This invoice has no client email"}
                      className={smallButton}
                    >
                      {busy === `send-${inv.id}` ? "Sending…" : inv.sent_at ? "Resend to client" : "Send to client"}
                    </button>
                  )}
                  {inv.status !== "PAID" && recordingId !== inv.id && (
                    <button
                      onClick={() => {
                        setRecordingId(inv.id);
                        setMethod("CHECK");
                        setReference("");
                      }}
                      className={smallButton}
                    >
                      Record payment
                    </button>
                  )}
                  {inv.status === "PAID" && (
                    <button
                      onClick={() => run(`receipt-${inv.id}`, () => downloadReceiptPdf(token, inv.id))}
                      disabled={busy === `receipt-${inv.id}`}
                      className={smallButton}
                    >
                      Receipt PDF
                    </button>
                  )}
                  {inv.sent_at && inv.status !== "PAID" && (
                    <span className="text-[11px] text-zinc-500">Sent {fmtDate(inv.sent_at)}</span>
                  )}
                </div>

                {recordingId === inv.id && (
                  <form onSubmit={(e) => recordPayment(e, inv)} className="mt-3 flex flex-wrap items-end gap-2">
                    <Field label="Paid by">
                      <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value as RecordedMethod)}
                        className={inputClass}
                      >
                        {RECORDED_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m === "OTHER" ? "Other" : PAYMENT_METHOD_LABELS[m]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Reference" hint="(optional)">
                      <input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        maxLength={120}
                        placeholder="Check # or transfer ref"
                        className={inputClass}
                      />
                    </Field>
                    <button type="submit" disabled={busy === inv.id} className={primaryButton}>
                      {busy === inv.id ? "Saving…" : "Mark paid & issue receipt"}
                    </button>
                    <button type="button" onClick={() => setRecordingId(null)} className="px-2 text-sm text-zinc-400 hover:text-white">
                      Cancel
                    </button>
                  </form>
                )}
              </li>
            );
          })}
          {!loading && visible.length === 0 && (
            <li className="rounded-xl border border-white/10 p-6 text-center text-sm text-zinc-500">No invoices here.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ builder

function InvoiceBuilder({
  token,
  projects,
  orgs,
  onCancel,
  onCreated,
  onError,
}: {
  token: string;
  projects: ProjectOut[];
  orgs: OrganizationOut[];
  onCancel: () => void;
  onCreated: (message: string) => void;
  onError: (e: unknown) => void;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [billToName, setBillToName] = useState("");
  const [billToEmail, setBillToEmail] = useState("");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDays, setDueDays] = useState<number | null>(14);
  const [dueDate, setDueDate] = useState(addDays(todayIso(), 14));
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("Thank you for your business.");
  const [milestones, setMilestones] = useState<MilestoneOut[]>([]);
  const [saving, setSaving] = useState<"create" | "send" | null>(null);

  const project = projects.find((p) => p.id === projectId);
  const org = orgs.find((o) => o.id === project?.org_id);

  useEffect(() => {
    if (!projectId) return;
    listMilestones(token, projectId)
      .then(setMilestones)
      .catch(() => setMilestones([]));
  }, [token, projectId]);

  const lines = rows.map((r) => ({
    description: r.description.trim(),
    quantity: Number(r.quantity) || 0,
    unit_price: Number(r.unit_price) || 0,
  }));
  const subtotal = cents(lines.reduce((s, l) => s + cents(l.quantity * l.unit_price), 0));
  const tax = cents((subtotal * (Number(taxRate) || 0)) / 100);
  const total = cents(subtotal + tax);
  const validLines = lines.filter((l) => l.description && l.quantity > 0);
  const canSave = !!projectId && validLines.length > 0 && total > 0 && (!dueDate || dueDate >= issueDate);

  const updateRow = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function addMilestone(id: string) {
    const m = milestones.find((x) => x.id === id);
    if (!m) return;
    const line = { key: rowKey++, description: `Milestone: ${m.title}`, quantity: "1", unit_price: m.amount != null ? String(m.amount) : "" };
    setRows((rs) => (rs.length === 1 && !rs[0].description && !rs[0].unit_price ? [line] : [...rs, line]));
  }

  function setPreset(days: number) {
    setDueDays(days);
    setDueDate(addDays(issueDate, days));
  }

  async function save(andSend: boolean) {
    setSaving(andSend ? "send" : "create");
    try {
      const invoice = await createInvoice(token, {
        project_id: projectId,
        line_items: validLines,
        tax_rate: Number(taxRate) || 0,
        bill_to_name: billToName.trim() || org?.name,
        customer_email: billToEmail.trim() || undefined,
        issue_date: issueDate,
        due_date: dueDate || undefined,
        notes: notes.trim() || undefined,
      });
      if (andSend) {
        const res = await sendInvoice(token, invoice.id);
        onCreated(
          res.email_sent
            ? `Invoice ${invoice.invoice_number} created and emailed to ${invoice.customer_email}.`
            : `Invoice ${invoice.invoice_number} created, but email isn't configured on the server so it wasn't sent.`,
        );
      } else {
        onCreated(`Invoice ${invoice.invoice_number} created. Send it to the client when you're ready.`);
      }
    } catch (e) {
      onError(e);
    } finally {
      setSaving(null);
    }
  }

  const preview = { lines: validLines, subtotal, tax, total };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <Card step={1} title="Client & project">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project" className="sm:col-span-2">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {projectLabel(p, orgs)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bill to" hint="(contact or company)">
              <input value={billToName} onChange={(e) => setBillToName(e.target.value)} placeholder={org?.name ?? "Client name"} className={inputClass} />
            </Field>
            <Field label="Client email" hint="(to send it)">
              <input type="email" value={billToEmail} onChange={(e) => setBillToEmail(e.target.value)} placeholder="client@company.com" className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card step={2} title="Dates">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Issue date">
              <input
                type="date"
                value={issueDate}
                onChange={(e) => {
                  setIssueDate(e.target.value);
                  if (dueDays !== null) setDueDate(addDays(e.target.value, dueDays));
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Due date">
              <input
                type="date"
                value={dueDate}
                min={issueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setDueDays(null);
                }}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {DUE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPreset(p.days)}
                aria-pressed={dueDays === p.days}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  dueDays === p.days ? "bg-accent/20 text-accent-light ring-1 ring-accent/40" : "border border-white/10 text-zinc-400 hover:border-white/30"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Card>

        <Card
          step={3}
          title="Line items"
          aside={
            milestones.length > 0 && (
              <select
                value=""
                onChange={(e) => addMilestone(e.target.value)}
                aria-label="Add a milestone as a line item"
                className="rounded-full border border-white/15 bg-transparent px-3 py-1 text-xs text-zinc-300 [color-scheme:dark]"
              >
                <option value="">+ Add milestone</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                    {m.amount != null ? ` (${money(m.amount)})` : ""}
                  </option>
                ))}
              </select>
            )
          }
        >
          <div className="hidden grid-cols-[minmax(0,1fr)_70px_110px_100px_28px] gap-2 px-1 text-[11px] uppercase tracking-wide text-zinc-500 sm:grid">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          <ul className="mt-2 space-y-2">
            {rows.map((r, i) => {
              const amount = cents((Number(r.quantity) || 0) * (Number(r.unit_price) || 0));
              return (
                <li key={r.key} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-lg border border-white/5 p-2 sm:grid-cols-[minmax(0,1fr)_70px_110px_100px_28px] sm:border-0 sm:p-0">
                  <input
                    value={r.description}
                    onChange={(e) => updateRow(r.key, { description: e.target.value })}
                    placeholder="e.g. Website design"
                    aria-label={`Line ${i + 1} description`}
                    maxLength={300}
                    className={`${inputClass} col-span-3 mt-0 sm:col-span-1`}
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={r.quantity}
                    onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                    aria-label={`Line ${i + 1} quantity`}
                    className={`${inputClass} mt-0 text-right`}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={r.unit_price}
                    onChange={(e) => updateRow(r.key, { unit_price: e.target.value })}
                    placeholder="0.00"
                    aria-label={`Line ${i + 1} rate`}
                    className={`${inputClass} mt-0 text-right`}
                  />
                  <span className="flex items-center justify-end text-sm tabular-nums text-zinc-200">{money(amount)}</span>
                  <button
                    type="button"
                    onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [emptyRow()]))}
                    aria-label={`Remove line ${i + 1}`}
                    className="flex items-center justify-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-red-300"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => setRows((rs) => [...rs, emptyRow()])} className={`${smallButton} mt-3`}>
            + Add line
          </button>

          <div className="mt-5 flex flex-col items-end gap-1.5 border-t border-white/10 pt-4 text-sm">
            <div className="flex w-64 justify-between text-zinc-400">
              <span>Subtotal</span>
              <span className="tabular-nums text-zinc-200">{money(subtotal)}</span>
            </div>
            <div className="flex w-64 items-center justify-between text-zinc-400">
              <label htmlFor="tax-rate">Tax %</label>
              <input
                id="tax-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-right text-sm text-white"
              />
              <span className="w-20 text-right tabular-nums text-zinc-200">{money(tax)}</span>
            </div>
            <div className="flex w-64 justify-between border-t border-white/10 pt-2 text-base font-semibold text-white">
              <span>Total</span>
              <span className="tabular-nums">{money(total)}</span>
            </div>
          </div>
        </Card>

        <Card step={4} title="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Payment instructions, thank-you note…"
            className={`${inputClass} mt-0 resize-y`}
          />
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => save(true)} disabled={!canSave || !billToEmail.trim() || saving !== null} className={primaryButton}>
            {saving === "send" ? "Sending…" : "Create & send to client"}
          </button>
          <button onClick={() => save(false)} disabled={!canSave || saving !== null} className={secondaryButton}>
            {saving === "create" ? "Creating…" : "Create without sending"}
          </button>
          <button onClick={onCancel} className="px-2 text-sm text-zinc-400 hover:text-white">
            Cancel
          </button>
          {!billToEmail.trim() && <span className="text-xs text-zinc-500">Add a client email to send it.</span>}
        </div>
      </div>

      {/* Live preview — mirrors the PDF the client receives. */}
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <p className="mb-2 text-xs text-zinc-500">Preview</p>
        <div className="rounded-xl bg-white p-6 text-[11px] leading-relaxed text-zinc-700 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-zinc-900">GG HighTech</p>
              <p className="text-zinc-500">gghightech.org</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold tracking-tight text-zinc-900">INVOICE</p>
              <p>INV-{new Date().getFullYear()}-····</p>
              <p>Issued {fmtDate(issueDate)}</p>
              <p className="font-semibold text-zinc-900">Due {dueDate ? fmtDate(dueDate) : "on receipt"}</p>
            </div>
          </div>
          <div className="my-4 h-0.5 bg-[#e8b84b]" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">Bill to</p>
              <p className="font-semibold text-zinc-900">{billToName || org?.name || "Client"}</p>
              {billToName && org && billToName !== org.name && <p>{org.name}</p>}
              {billToEmail && <p>{billToEmail}</p>}
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">Project</p>
              <p className="font-semibold text-zinc-900">{project?.title ?? "—"}</p>
            </div>
          </div>
          <table className="mt-4 w-full">
            <thead>
              <tr className="bg-zinc-900 text-left text-[9px] uppercase tracking-wide text-white">
                <th className="px-2 py-1.5 font-semibold">Description</th>
                <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
                <th className="px-2 py-1.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {preview.lines.map((l, i) => (
                <tr key={i} className={i % 2 ? "" : "bg-zinc-50"}>
                  <td className="px-2 py-1.5">{l.description}</td>
                  <td className="px-2 py-1.5 text-right">{l.quantity}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{money(cents(l.quantity * l.unit_price))}</td>
                </tr>
              ))}
              {preview.lines.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-2 py-3 text-center text-zinc-400">
                    Add a line item
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="ml-auto mt-3 w-44 space-y-0.5">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">{money(preview.subtotal)}</span>
            </div>
            {Number(taxRate) > 0 && (
              <div className="flex justify-between">
                <span>Tax ({Number(taxRate)}%)</span>
                <span className="tabular-nums">{money(preview.tax)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between bg-[#e8b84b] px-1.5 py-1 font-bold text-zinc-900">
              <span>Amount due</span>
              <span className="tabular-nums">{money(preview.total)}</span>
            </div>
          </div>
          {notes.trim() && <p className="mt-4 whitespace-pre-line text-zinc-500">{notes}</p>}
        </div>
      </aside>
    </div>
  );
}
