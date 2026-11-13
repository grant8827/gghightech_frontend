"use client";

import { useEffect, useState } from "react";
import {
  createContract,
  deleteContract,
  downloadContractPdf,
  getContractDefaults,
  listContracts,
  listMilestones,
  sendContract,
  updateContract,
  voidContract,
  type ContractFields,
  type ContractOut,
  type MilestoneOut,
  type OrganizationOut,
  type ProjectOut,
} from "@/lib/api";
import {
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
import { isNewlySigned } from "@/lib/signedContracts";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "DRAFT",
  SENT: "AWAITING SIGNATURE",
  SIGNED: "SIGNED",
  VOID: "VOID",
};

type Step = { key: number; label: string; due: string; amount: string };
let stepKey = 1;

export function ContractsPanel({
  token,
  projects,
  orgs,
  seenBefore,
  onError,
}: {
  token: string;
  projects: ProjectOut[];
  orgs: OrganizationOut[];
  // Signed after this (ISO time) = marked NEW.
  seenBefore: string;
  onError: (e: unknown) => void;
}) {
  const [contracts, setContracts] = useState<ContractOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // null = closed; "new" = new contract; otherwise the contract being edited.
  const [editing, setEditing] = useState<"new" | ContractOut | null>(null);

  async function refresh() {
    try {
      setContracts(await listContracts(token));
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

  const send = (c: ContractOut) =>
    run(`send-${c.id}`, async () => {
      const res = await sendContract(token, c.id);
      setNotice(
        res.email_sent
          ? `${c.contract_number} sent to ${c.client_email}. They can review and sign it in their dashboard.`
          : `${c.contract_number} is ready to sign in the client's dashboard, but email isn't configured so no email went out.`,
      );
      await refresh();
    });

  const awaiting = contracts.filter((c) => c.status === "SENT");
  const signed = contracts.filter((c) => c.status === "SIGNED");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Awaiting signature" value={String(awaiting.length)} detail={money(awaiting.reduce((s, c) => s + c.total_value, 0))} />
        <StatTile label="Signed" value={String(signed.length)} detail={money(signed.reduce((s, c) => s + c.total_value, 0))} />
        <StatTile label="Drafts" value={String(contracts.filter((c) => c.status === "DRAFT").length)} />
        <StatTile label="All contracts" value={String(contracts.length)} />
      </div>

      {notice && (
        <p role="status" className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent-light">
          {notice}
        </p>
      )}

      {editing ? (
        <ContractBuilder
          key={editing === "new" ? "new" : editing.id}
          token={token}
          projects={projects}
          orgs={orgs}
          existing={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onError={onError}
          onSaved={async (message) => {
            setEditing(null);
            setNotice(message);
            await refresh();
          }}
        />
      ) : (
        <button onClick={() => setEditing("new")} disabled={projects.length === 0} className={primaryButton}>
          + New contract
        </button>
      )}

      <div>
        <h3 className="text-sm font-semibold text-white">Contracts</h3>
        {loading && <p className="mt-4 text-sm text-zinc-500">Loading…</p>}
        <ul className="mt-4 space-y-2">
          {contracts.map((c) => {
            const project = projects.find((p) => p.id === c.project_id);
            return (
              <li key={c.id} className="glass-card rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-zinc-400">{c.contract_number}</span>
                      <Chip label={STATUS_LABEL[c.status]} />
                      {isNewlySigned(c, seenBefore) && (
                        <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-bold text-black">NEW</span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-white">{c.title}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {projectLabel(project, orgs)} · {c.client_name}
                      {c.client_email && ` <${c.client_email}>`}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <p className="text-base font-semibold text-white">{money(c.total_value)}</p>
                    <p>
                      {c.status === "SIGNED"
                        ? `Signed ${fmtDate(c.signed_at)} by ${c.signer_name}`
                        : c.status === "SENT"
                          ? `Sent ${fmtDate(c.sent_at)}`
                          : c.status === "VOID"
                            ? `Voided ${fmtDate(c.voided_at)}`
                            : `Created ${fmtDate(c.created_at)}`}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                  <button
                    onClick={() => run(`pdf-${c.id}`, () => downloadContractPdf(token, c))}
                    disabled={busy === `pdf-${c.id}`}
                    className={smallButton}
                  >
                    PDF
                  </button>
                  {(c.status === "DRAFT" || c.status === "SENT") && (
                    <>
                      <button onClick={() => setEditing(c)} className={smallButton}>
                        Edit
                      </button>
                      <button
                        onClick={() => send(c)}
                        disabled={busy === `send-${c.id}` || !c.client_email}
                        title={c.client_email ? undefined : "Add the client's email first"}
                        className={smallButton}
                      >
                        {busy === `send-${c.id}` ? "Sending…" : c.status === "SENT" ? "Resend" : "Send for signature"}
                      </button>
                    </>
                  )}
                  {c.status !== "VOID" && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Void ${c.contract_number}? The client will see it as void and it can no longer be signed.`))
                          run(`void-${c.id}`, async () => {
                            await voidContract(token, c.id);
                            setNotice(`${c.contract_number} voided.`);
                            await refresh();
                          });
                      }}
                      className={`${smallButton} border-red-400/30 text-red-300 hover:border-red-400/60`}
                    >
                      Void
                    </button>
                  )}
                  {c.status === "DRAFT" && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete the draft ${c.contract_number}? This can't be undone.`))
                          run(`del-${c.id}`, async () => {
                            await deleteContract(token, c.id);
                            await refresh();
                          });
                      }}
                      className="px-2 text-xs text-zinc-500 hover:text-red-300"
                    >
                      Delete draft
                    </button>
                  )}
                </div>
              </li>
            );
          })}
          {!loading && contracts.length === 0 && (
            <li className="rounded-xl border border-white/10 p-6 text-center text-sm text-zinc-500">
              No contracts yet. Create one for a project to send it to the client for signature.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ builder

function ContractBuilder({
  token,
  projects,
  orgs,
  existing,
  onCancel,
  onSaved,
  onError,
}: {
  token: string;
  projects: ProjectOut[];
  orgs: OrganizationOut[];
  existing: ContractOut | null;
  onCancel: () => void;
  onSaved: (message: string) => void;
  onError: (e: unknown) => void;
}) {
  const [projectId, setProjectId] = useState(existing?.project_id ?? projects[0]?.id ?? "");
  const project = projects.find((p) => p.id === projectId);
  const org = orgs.find((o) => o.id === project?.org_id);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [clientName, setClientName] = useState(existing?.client_name ?? "");
  const [clientEmail, setClientEmail] = useState(existing?.client_email ?? "");
  const [effectiveDate, setEffectiveDate] = useState(existing?.effective_date ?? todayIso());
  const [scope, setScope] = useState(existing?.scope ?? "");
  const [deliverables, setDeliverables] = useState<string[]>(existing?.deliverables.length ? existing.deliverables : [""]);
  const [timeline, setTimeline] = useState(existing?.timeline ?? "");
  const [steps, setSteps] = useState<Step[]>(
    existing?.payment_schedule.length
      ? existing.payment_schedule.map((p) => ({ key: stepKey++, label: p.label, due: p.due, amount: String(p.amount) }))
      : [
          { key: stepKey++, label: "Deposit", due: "On signing", amount: "" },
          { key: stepKey++, label: "Final payment", due: "On launch", amount: "" },
        ],
  );
  const [paymentTerms, setPaymentTerms] = useState(existing?.payment_terms ?? "");
  const [terms, setTerms] = useState(existing?.terms ?? "");
  const [milestones, setMilestones] = useState<MilestoneOut[]>([]);
  const [saving, setSaving] = useState<"save" | "send" | null>(null);

  // Starting text for new contracts.
  useEffect(() => {
    if (existing) return;
    getContractDefaults(token)
      .then((d) => {
        setTerms((t) => t || d.terms);
        setPaymentTerms((t) => t || d.payment_terms);
      })
      .catch(onError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!projectId) return;
    listMilestones(token, projectId)
      .then(setMilestones)
      .catch(() => setMilestones([]));
  }, [token, projectId]);

  const total = Math.round(steps.reduce((s, p) => s + (Number(p.amount) || 0), 0) * 100) / 100;
  const cleanDeliverables = deliverables.map((d) => d.trim()).filter(Boolean);
  const cleanSteps = steps
    .filter((p) => p.label.trim())
    .map((p) => ({ label: p.label.trim(), due: p.due.trim(), amount: Number(p.amount) || 0 }));
  const canSave =
    !!projectId && title.trim().length >= 3 && (clientName.trim() || org?.name || "").length >= 2 && scope.trim().length >= 10 && terms.trim().length >= 20;

  function importMilestones() {
    if (milestones.length === 0) return;
    setDeliverables((ds) => {
      const existingSet = new Set(ds.map((d) => d.trim()).filter(Boolean));
      return [...ds.filter((d) => d.trim()), ...milestones.map((m) => m.title).filter((t) => !existingSet.has(t))];
    });
    const paid = milestones.filter((m) => m.amount != null && m.amount > 0);
    if (paid.length) {
      setSteps(
        paid.map((m) => ({
          key: stepKey++,
          label: m.title,
          due: m.due_date ? fmtDate(m.due_date) : "On approval",
          amount: String(m.amount),
        })),
      );
    }
  }

  async function save(andSend: boolean) {
    setSaving(andSend ? "send" : "save");
    const fields: ContractFields = {
      title: title.trim(),
      client_name: clientName.trim() || org?.name || "",
      client_email: clientEmail.trim() || null,
      effective_date: effectiveDate || null,
      scope: scope.trim(),
      deliverables: cleanDeliverables,
      timeline: timeline.trim() || null,
      payment_schedule: cleanSteps,
      total_value: total,
      payment_terms: paymentTerms.trim() || null,
      terms: terms.trim(),
    };
    try {
      const saved = existing
        ? await updateContract(token, existing.id, fields)
        : await createContract(token, { project_id: projectId, ...fields });
      if (andSend) {
        const res = await sendContract(token, saved.id);
        onSaved(
          res.email_sent
            ? `${saved.contract_number} sent to ${saved.client_email} for signature.`
            : `${saved.contract_number} is ready to sign in the client's dashboard (email isn't configured, so none was sent).`,
        );
      } else {
        onSaved(`${saved.contract_number} saved as a draft.`);
      }
    } catch (e) {
      onError(e);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">
          {existing ? `Edit ${existing.contract_number}` : "New contract"}
        </h3>
        {existing?.status === "SENT" && (
          <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs text-accent-light">
            Saving changes returns this contract to draft. Send it again so the client can sign the new version.
          </p>
        )}
      </div>

      <Card step={1} title="Agreement & parties">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project" className="sm:col-span-2">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={!!existing}
              className={inputClass}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {projectLabel(p, orgs)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contract title" className="sm:col-span-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={project ? `${project.title}: Design & Development Agreement` : "Service Agreement"}
              maxLength={200}
              className={inputClass}
            />
          </Field>
          <Field label="Client contact name">
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder={org?.name ?? "Full name"} className={inputClass} />
          </Field>
          <Field label="Client email" hint="(to send it for signature)">
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@company.com" className={inputClass} />
          </Field>
          <Field label="Effective date">
            <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card step={2} title="Scope of work">
        <textarea
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          rows={5}
          placeholder="Describe what you'll build: goals, features, platforms, what's included and what isn't."
          className={`${inputClass} mt-0 resize-y`}
        />
      </Card>

      <Card
        step={3}
        title="Deliverables"
        aside={
          milestones.length > 0 && (
            <button type="button" onClick={importMilestones} className={smallButton}>
              Import from milestones
            </button>
          )
        }
      >
        <ol className="space-y-2">
          {deliverables.map((d, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-5 text-right text-xs text-zinc-500">{i + 1}.</span>
              <input
                value={d}
                onChange={(e) => setDeliverables((ds) => ds.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder="e.g. Responsive website with CMS"
                maxLength={300}
                aria-label={`Deliverable ${i + 1}`}
                className={`${inputClass} mt-0`}
              />
              <button
                type="button"
                onClick={() => setDeliverables((ds) => (ds.length > 1 ? ds.filter((_, j) => j !== i) : [""]))}
                aria-label={`Remove deliverable ${i + 1}`}
                className="px-2 text-zinc-500 hover:text-red-300"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setDeliverables((ds) => [...ds, ""])} className={`${smallButton} mt-3`}>
          + Add deliverable
        </button>
      </Card>

      <Card step={4} title="Timeline">
        <textarea
          value={timeline}
          onChange={(e) => setTimeline(e.target.value)}
          rows={2}
          placeholder="e.g. Work starts on the effective date and is expected to take 8 weeks."
          className={`${inputClass} mt-0 resize-y`}
        />
      </Card>

      <Card step={5} title="Fees & payment schedule" aside={<span className="text-sm font-semibold text-white">{money(total)}</span>}>
        <div className="hidden grid-cols-[minmax(0,1fr)_160px_120px_28px] gap-2 px-1 text-[11px] uppercase tracking-wide text-zinc-500 sm:grid">
          <span>Payment</span>
          <span>Due</span>
          <span className="text-right">Amount</span>
          <span />
        </div>
        <ul className="mt-2 space-y-2">
          {steps.map((p, i) => (
            <li key={p.key} className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_160px_120px_28px]">
              <input
                value={p.label}
                onChange={(e) => setSteps((ss) => ss.map((x) => (x.key === p.key ? { ...x, label: e.target.value } : x)))}
                placeholder="e.g. Deposit"
                aria-label={`Payment ${i + 1} name`}
                className={`${inputClass} col-span-2 mt-0 sm:col-span-1`}
              />
              <input
                value={p.due}
                onChange={(e) => setSteps((ss) => ss.map((x) => (x.key === p.key ? { ...x, due: e.target.value } : x)))}
                placeholder="On signing"
                aria-label={`Payment ${i + 1} due`}
                className={`${inputClass} mt-0`}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={p.amount}
                onChange={(e) => setSteps((ss) => ss.map((x) => (x.key === p.key ? { ...x, amount: e.target.value } : x)))}
                placeholder="0.00"
                aria-label={`Payment ${i + 1} amount`}
                className={`${inputClass} mt-0 text-right`}
              />
              <button
                type="button"
                onClick={() => setSteps((ss) => ss.filter((x) => x.key !== p.key))}
                aria-label={`Remove payment ${i + 1}`}
                className="hidden items-center justify-center text-zinc-500 hover:text-red-300 sm:flex"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setSteps((ss) => [...ss, { key: stepKey++, label: "", due: "", amount: "" }])}
          className={`${smallButton} mt-3`}
        >
          + Add payment
        </button>
        <Field label="Payment terms" className="mt-5">
          <textarea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} rows={3} className={`${inputClass} resize-y`} />
        </Field>
      </Card>

      <Card step={6} title="Terms & conditions">
        <p className="mb-2 text-xs text-zinc-500">
          Pre-filled with standard terms. Edit them for this project. Separate clauses with a blank line. Have your
          lawyer review the template before relying on it.
        </p>
        <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={14} className={`${inputClass} mt-0 resize-y font-mono text-xs leading-relaxed`} />
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => save(true)} disabled={!canSave || !clientEmail.trim() || saving !== null} className={primaryButton}>
          {saving === "send" ? "Sending…" : "Save & send for signature"}
        </button>
        <button onClick={() => save(false)} disabled={!canSave || saving !== null} className={secondaryButton}>
          {saving === "save" ? "Saving…" : "Save draft"}
        </button>
        <button onClick={onCancel} className="px-2 text-sm text-zinc-400 hover:text-white">
          Cancel
        </button>
        {!canSave && <span className="text-xs text-zinc-500">Needs a title, client, scope (10+ characters) and terms.</span>}
      </div>
    </div>
  );
}
