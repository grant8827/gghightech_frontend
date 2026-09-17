"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  approveMilestone,
  getProject,
  invoicePdfUrl,
  listInvoices,
  listMilestones,
  listProjectUpdates,
  payInvoice,
  projectUpdatesSocketUrl,
  type InvoiceOut,
  type MilestoneOut,
  type ProjectOut,
  type ProjectUpdateOut,
  type StoredAuth,
} from "@/lib/api";
import { AuthGate } from "@/components/AuthGate";
import { StagingPreview } from "@/components/StagingPreview";

const INVOICE_STATUS_STYLES: Record<string, string> = {
  PENDING: "border-accent/30 bg-accent/10 text-accent-light",
  PAID: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
};

export default function PortalProjectPage() {
  return (
    <AuthGate title="Client portal sign-in" subtitle="Sign in to view your project status.">
      {({ auth, onSessionExpired }) => <ProjectDetail auth={auth} onSessionExpired={onSessionExpired} />}
    </AuthGate>
  );
}

function ProjectDetail({ auth, onSessionExpired }: { auth: StoredAuth; onSessionExpired: () => void }) {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectOut | null>(null);
  const [milestones, setMilestones] = useState<MilestoneOut[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOut[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdateOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isClientAdmin = auth.role === "CLIENT_ADMIN";

  async function refresh() {
    try {
      const [projectRes, milestonesRes, invoicesRes, updatesRes] = await Promise.all([
        getProject(auth.token, projectId),
        listMilestones(auth.token, projectId),
        listInvoices(auth.token, projectId),
        listProjectUpdates(auth.token, projectId),
      ]);
      setProject(projectRes);
      setMilestones(milestonesRes);
      setInvoices(invoicesRes);
      setUpdates(updatesRes);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        onSessionExpired();
        return;
      }
      setError(e instanceof ApiError ? e.message : "Could not reach the API");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // GGH-301 — live updates: any message means "something changed, refetch"
  // (see app/ws.py on the backend). Reconnects with a fixed backoff so a
  // dropped connection (server restart, network blip) doesn't leave the
  // dashboard silently stale; a normal REST refresh() above already
  // rendered the page before this ever connects, so there's no loading
  // state gated on the socket.
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;

    function connect() {
      if (cancelled) return;
      socket = new WebSocket(projectUpdatesSocketUrl(auth.token, projectId));
      socket.onopen = () => setLive(true);
      socket.onmessage = () => refresh();
      socket.onclose = () => {
        setLive(false);
        if (!cancelled) reconnectRef.current = setTimeout(connect, 3000);
      };
      socket.onerror = () => socket?.close();
    }

    connect();
    return () => {
      cancelled = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      socket?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleApprove(milestoneId: string) {
    setBusyId(milestoneId);
    setNotice(null);
    setError(null);
    try {
      await approveMilestone(auth.token, milestoneId);
      setNotice("Milestone approved — invoice generated below.");
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reach the API");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePay(invoiceId: string) {
    setBusyId(invoiceId);
    setNotice(null);
    setError(null);
    try {
      await payInvoice(auth.token, invoiceId);
      // Stripe is stubbed today — a real integration would redirect to
      // checkout_url instead of reaching this line at all.
      setNotice("Payment started.");
    } catch (e) {
      // Expected today: 503 "Online payment isn't set up yet..." — shown
      // plainly rather than pretending the payment went through.
      setError(e instanceof ApiError ? e.message : "Could not reach the API");
    } finally {
      setBusyId(null);
    }
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        {error ? (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>
        ) : (
          <p className="text-sm text-zinc-500">Loading…</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link href="/portal" className="text-xs text-zinc-500 hover:text-zinc-300">
        ← All projects
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">{project.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {project.status} · {project.overall_progress}% complete
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${
            live
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-white/10 bg-white/5 text-zinc-500"
          }`}
        >
          {live ? "Live" : "Reconnecting…"}
        </span>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>
      )}
      {notice && (
        <p className="mt-6 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent-light">{notice}</p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-medium text-white">Milestones</h2>
          <ul className="mt-4 space-y-4">
            {milestones.map((m) => {
              const readyToApprove = m.progress_percentage === 100 && m.status === "COMPLETED" && !m.approved_at;
              return (
                <li key={m.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-200">{m.title}</span>
                    <span className="text-zinc-500">{m.progress_percentage}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${m.progress_percentage}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                    <span>{m.status}</span>
                    {m.due_date && <span>Due {m.due_date}</span>}
                  </div>
                  {m.approved_at && (
                    <p className="mt-1 text-xs text-emerald-300">Approved {new Date(m.approved_at).toLocaleDateString()}</p>
                  )}
                  {readyToApprove && isClientAdmin && (
                    <button
                      onClick={() => handleApprove(m.id)}
                      disabled={busyId === m.id}
                      className="mt-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-black transition-transform hover:scale-105 disabled:opacity-50"
                    >
                      {busyId === m.id ? "Approving…" : "Approve & Generate Invoice"}
                    </button>
                  )}
                  {readyToApprove && !isClientAdmin && (
                    <p className="mt-2 text-xs text-zinc-500">Awaiting your account admin&apos;s approval.</p>
                  )}
                </li>
              );
            })}
            {milestones.length === 0 && <p className="text-sm text-zinc-500">No milestones yet.</p>}
          </ul>
        </div>

        <StagingPreview project={project} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-medium text-white">Invoices</h2>
          <ul className="mt-4 space-y-3">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-col gap-2 rounded-xl border border-white/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-sm font-medium text-white">${inv.amount.toLocaleString()}</span>
                  <span
                    className={`ml-2 rounded-full border px-2 py-0.5 text-xs ${
                      INVOICE_STATUS_STYLES[inv.status] ?? "border-white/10 bg-white/5 text-zinc-300"
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <a href={invoicePdfUrl(inv.id)} target="_blank" rel="noreferrer" className="text-accent-light underline">
                    PDF
                  </a>
                  {inv.status === "PENDING" && isClientAdmin && (
                    <button
                      onClick={() => handlePay(inv.id)}
                      disabled={busyId === inv.id}
                      className="rounded-full border border-white/15 px-3 py-1 text-zinc-200 transition-colors hover:border-accent/50 disabled:opacity-50"
                    >
                      {busyId === inv.id ? "…" : "Pay"}
                    </button>
                  )}
                </div>
              </li>
            ))}
            {invoices.length === 0 && <p className="text-sm text-zinc-500">No invoices yet.</p>}
          </ul>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-medium text-white">Team Updates</h2>
          <ul className="mt-4 space-y-4">
            {updates.map((u) => (
              <li key={u.id} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    {u.author_name} · {u.author_role}
                  </span>
                  <span>{new Date(u.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-200">{u.message}</p>
              </li>
            ))}
            {updates.length === 0 && <p className="text-sm text-zinc-500">No updates posted yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
