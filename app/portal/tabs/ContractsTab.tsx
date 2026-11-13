"use client";

import { useState } from "react";
import { downloadContractPdf, signContract, type ContractOut, type ProjectOut } from "@/lib/api";

const money = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });
const fmt = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(undefined, { dateStyle: "long" }) : "";

const STATUS: Record<string, { label: string; cls: string }> = {
  SENT: { label: "Awaiting your signature", cls: "border-accent/40 bg-accent/15 text-accent-light" },
  SIGNED: { label: "✓ Signed", cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  VOID: { label: "Void", cls: "border-red-400/30 bg-red-400/10 text-red-300" },
};

// The client's contracts: read the full agreement, sign it (account admin
// only), and download the PDF.
export function ContractsTab({
  token,
  canSign,
  signerDefault,
  contracts,
  projects,
  onSigned,
  onError,
}: {
  token: string;
  canSign: boolean;
  signerDefault: string;
  contracts: ContractOut[];
  projects: ProjectOut[];
  onSigned: () => void;
  onError: (e: unknown) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(
    contracts.find((c) => c.status === "SENT")?.id ?? null,
  );
  const open = contracts.find((c) => c.id === openId) ?? null;

  if (contracts.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 p-8 text-center text-sm text-zinc-500">
        No contracts yet. When our team sends you an agreement, you&apos;ll review and sign it here.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <ul className="space-y-2">
        {contracts.map((c) => {
          const s = STATUS[c.status];
          return (
            <li key={c.id}>
              <button
                onClick={() => setOpenId(c.id)}
                aria-current={openId === c.id}
                className={`glass-card w-full rounded-xl p-4 text-left transition-colors ${
                  openId === c.id ? "ring-1 ring-accent/50" : "hover:border-white/20"
                }`}
              >
                <p className="font-mono text-[11px] text-zinc-500">{c.contract_number}</p>
                <p className="mt-1 text-sm font-medium text-white">{c.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {projects.find((p) => p.id === c.project_id)?.title} · {money(c.total_value)}
                </p>
                {s && <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>{s.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {open ? (
        <ContractView
          key={open.id}
          token={token}
          contract={open}
          projectTitle={projects.find((p) => p.id === open.project_id)?.title ?? ""}
          canSign={canSign}
          signerDefault={signerDefault}
          onSigned={onSigned}
          onError={onError}
        />
      ) : (
        <p className="rounded-2xl border border-white/10 p-8 text-center text-sm text-zinc-500">Select a contract to read it.</p>
      )}
    </div>
  );
}

function DocSection({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h3 className="border-b border-zinc-200 pb-1.5 text-sm font-bold text-zinc-900">
        {n}. {title}
      </h3>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function ContractView({
  token,
  contract: c,
  projectTitle,
  canSign,
  signerDefault,
  onSigned,
  onError,
}: {
  token: string;
  contract: ContractOut;
  projectTitle: string;
  canSign: boolean;
  signerDefault: string;
  onSigned: () => void;
  onError: (e: unknown) => void;
}) {
  const [name, setName] = useState(signerDefault);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState<"sign" | "pdf" | null>(null);

  async function sign(e: React.FormEvent) {
    e.preventDefault();
    setBusy("sign");
    try {
      await signContract(token, c.id, name.trim());
      onSigned();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(null);
    }
  }

  async function pdf() {
    setBusy("pdf");
    try {
      await downloadContractPdf(token, c);
    } catch (err) {
      onError(err);
    } finally {
      setBusy(null);
    }
  }

  let n = 0;
  const paragraphs = (text: string) =>
    text
      .split(/\n\s*\n/)
      .filter((p) => p.trim())
      .map((p, i) => (
        <p key={i} className="mt-2 whitespace-pre-line first:mt-0">
          {p.trim()}
        </p>
      ));

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {c.status === "SIGNED" ? (
          <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
            ✓ Signed by {c.signer_name} on {fmt(c.signed_at)}
          </p>
        ) : c.status === "VOID" ? (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
            This contract was voided and can no longer be signed.
          </p>
        ) : (
          <p className="text-sm text-zinc-400">Please read the agreement below, then sign at the bottom.</p>
        )}
        <button
          onClick={pdf}
          disabled={busy === "pdf"}
          className="rounded-full border border-white/15 px-4 py-2 text-xs text-zinc-200 hover:border-accent/50 disabled:opacity-50"
        >
          {busy === "pdf" ? "Downloading…" : "Download PDF"}
        </button>
      </div>

      <article className="rounded-2xl bg-white p-6 text-[13px] leading-relaxed text-zinc-700 shadow-2xl sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#e8b84b] pb-5">
          <div>
            <p className="text-lg font-bold text-zinc-900">GG HighTech</p>
            <p className="text-xs text-zinc-500">Service Agreement</p>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <p className="font-mono font-semibold text-zinc-900">{c.contract_number}</p>
            <p>Effective {c.effective_date ? fmt(c.effective_date) : "on signing"}</p>
            <p>Value {money(c.total_value)}</p>
          </div>
        </div>

        <h2 className="mt-6 text-xl font-bold text-zinc-900">{c.title}</h2>
        <p className="mt-2">
          This agreement is between <strong>GG HighTech</strong> (&ldquo;Provider&rdquo;) and{" "}
          <strong>{c.client_name}</strong> (&ldquo;Client&rdquo;) for the project <strong>{projectTitle}</strong>.
        </p>

        <DocSection n={++n} title="Scope of work">{paragraphs(c.scope)}</DocSection>
        {c.deliverables.length > 0 && (
          <DocSection n={++n} title="Deliverables">
            <ol className="list-decimal space-y-1 pl-5">
              {c.deliverables.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ol>
          </DocSection>
        )}
        {c.timeline && <DocSection n={++n} title="Timeline">{paragraphs(c.timeline)}</DocSection>}
        <DocSection n={++n} title="Fees and payment">
          {c.payment_schedule.length > 0 && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-900 text-white">
                  <th className="px-3 py-2 font-semibold">Payment</th>
                  <th className="px-3 py-2 font-semibold">Due</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {c.payment_schedule.map((p, i) => (
                  <tr key={i} className={i % 2 ? "" : "bg-zinc-50"}>
                    <td className="px-3 py-2">{p.label}</td>
                    <td className="px-3 py-2">{p.due}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-right font-bold text-zinc-900">Total: {money(c.total_value)}</p>
          {c.payment_terms && <div className="mt-2">{paragraphs(c.payment_terms)}</div>}
        </DocSection>
        <DocSection n={++n} title="Terms and conditions">
          <div className="text-xs">{paragraphs(c.terms)}</div>
        </DocSection>

        <section className="mt-8 grid gap-6 border-t border-zinc-200 pt-6 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">For GG HighTech</p>
            <p className="mt-2 border-b border-zinc-900 pb-1 font-serif text-xl italic text-zinc-900">{c.provider_signer_name}</p>
            <p className="mt-1 text-xs text-zinc-500">{c.sent_at && fmt(c.sent_at)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">For the Client</p>
            <p className="mt-2 min-h-[2.25rem] border-b border-zinc-900 pb-1 font-serif text-xl italic text-zinc-900">
              {c.status === "SIGNED" ? c.signer_name : c.status === "SENT" && canSign ? name : ""}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{c.status === "SIGNED" && fmt(c.signed_at)}</p>
          </div>
        </section>
        {c.status === "SIGNED" && c.signed_content_hash && (
          <p className="mt-4 break-all text-[10px] text-zinc-400">
            Electronically signed through the GG HighTech client portal. Fingerprint: {c.signed_content_hash}
          </p>
        )}
      </article>

      {c.status === "SENT" &&
        (canSign ? (
          <form onSubmit={sign} className="glass-card space-y-4 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white">Sign this agreement</h3>
            <label className="block text-sm text-zinc-300">
              Type your full legal name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={255}
                autoComplete="name"
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-serif text-lg italic text-white outline-none focus:border-accent"
              />
            </label>
            <label className="flex items-start gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#e8b84b]"
              />
              <span>
                I have read and agree to this agreement, and I am authorized to sign it on behalf of {c.client_name}. I
                understand that typing my name is my electronic signature.
              </span>
            </label>
            <button
              type="submit"
              disabled={!agree || name.trim().length < 2 || busy === "sign"}
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {busy === "sign" ? "Signing…" : "Sign agreement"}
            </button>
          </form>
        ) : (
          <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
            Only your organization&apos;s account admin can sign this agreement.
          </p>
        ))}
    </div>
  );
}
