"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  addEmailDomain,
  createSmtpAccount,
  deleteEmailDomain,
  emailOverview,
  listEmailDomains,
  listEmailMessages,
  listSmtpAccounts,
  revokeSmtpAccount,
  verifyEmailDomain,
  type DnsRecord,
  type EmailDomain,
  type EmailMessage,
  type EmailOverview,
  type NewSmtpCredential,
  type SmtpAccount,
} from "@/lib/api";

const VIEWS = [
  { id: "overview", label: "Overview" },
  { id: "domains", label: "Domains & DNS" },
  { id: "credentials", label: "SMTP Credentials" },
  { id: "activity", label: "Email Activity" },
] as const;

type View = (typeof VIEWS)[number]["id"];

const STATUS_STYLES: Record<string, string> = {
  VERIFIED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  PENDING_DNS: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  ACTIVE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  REVOKED: "border-white/10 bg-white/5 text-zinc-400",
  delivered: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  partially_delivered: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  queued: "border-accent/30 bg-accent/10 text-accent-light",
  failed: "border-red-400/30 bg-red-400/10 text-red-300",
};

const LABELS: Record<string, string> = {
  PENDING_DNS: "Waiting for DNS",
  VERIFIED: "Verified",
  ACTIVE: "Active",
  REVOKED: "Revoked",
  delivered: "Delivered",
  partially_delivered: "Partly delivered",
  queued: "In queue",
  failed: "Failed",
  accepted: "Accepted",
  rejected_sender: "Sender not allowed",
  rate_limited: "Rate limited",
  relay_denied: "Not signed in",
  error: "Server error",
};

function Badge({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs ${
        STATUS_STYLES[value] ?? "border-red-400/30 bg-red-400/10 text-red-300"
      }`}
    >
      {LABELS[value] ?? value}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-xs text-zinc-300 hover:border-accent/50"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// What to type in a DNS panel's "Host" field. Most panels (eNom, GoDaddy,
// Namecheap...) add the zone themselves, so typing the full name doubles it
// (e.g. mg.example.com.example.com). The zone is guessed as the last two
// labels, or three for country domains like example.com.jm / example.co.uk.
function hostField(recordName: string): string {
  const labels = recordName.split(".");
  const secondLevel = labels[labels.length - 2];
  const countryTld = labels[labels.length - 1].length === 2;
  const zoneSize =
    countryTld && ["co", "com", "org", "net", "gov", "edu", "ac"].includes(secondLevel) ? 3 : 2;
  if (labels.length <= zoneSize) return "@";
  return labels.slice(0, labels.length - zoneSize).join(".");
}

function errorText(e: unknown) {
  return e instanceof ApiError ? e.message : "Could not reach the API";
}

export function EmailServerTab({
  token,
  enabled,
  onError,
}: {
  token: string;
  // null while the status check is still running.
  enabled: boolean | null;
  onError: (e: unknown) => void;
}) {
  if (enabled === null) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (!enabled) return <NotConnected />;
  return <EmailServerConsole token={token} onError={onError} />;
}

function NotConnected() {
  const steps = [
    {
      title: "Mail server",
      body: "Apache James on a VPS with port 25 open and reverse DNS (PTR) set to the sending hostname, e.g. mail.gghightech.org.",
    },
    {
      title: "Management service",
      body: "The gghightech-backend-java service on Railway, connected to the database and to the mail server (private network only).",
    },
    {
      title: "Connect this dashboard",
      body: "Set EMAIL_SERVICE_URL and EMAIL_SERVICE_TOKEN on the gghightech-backend service. This tab then switches on by itself.",
    },
  ];
  return (
    <div>
      <h2 className="text-lg font-medium text-white">Email Server</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Send email from any of your domains through GG HighTech&apos;s own mail server.
      </p>
      <div className="glass-card mt-6 max-w-2xl rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-xs text-amber-200">
            Not connected
          </span>
          <span className="text-sm text-zinc-300">The Email Server isn&apos;t set up on this environment yet.</span>
        </div>
        <p className="mt-4 text-sm text-zinc-400">
          Once it&apos;s connected, this tab is where you add sending domains, publish and verify their DNS
          records, create SMTP credentials for your apps, and follow every message sent.
        </p>
        <ol className="mt-5 space-y-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-xs text-zinc-300">
                {i + 1}
              </span>
              <span>
                <span className="text-white">{step.title}</span>
                <span className="block text-zinc-400">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function EmailServerConsole({ token, onError }: { token: string; onError: (e: unknown) => void }) {
  const [view, setView] = useState<View>("overview");
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [loading, setLoading] = useState(true);

  async function refreshDomains() {
    try {
      setDomains(await listEmailDomains(token));
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Fetch-on-mount: state is set only after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshDomains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h2 className="text-lg font-medium text-white">Email Server</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Send email from any of your domains through GG HighTech&apos;s own mail server.
      </p>
      <div className="mt-4 flex flex-wrap gap-1 border-b border-white/10">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
              view === v.id ? "border-accent text-white" : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-500">Loading…</p>
      ) : (
        <>
          {view === "overview" && <OverviewView token={token} onError={onError} />}
          {view === "domains" && (
            <DomainsView token={token} domains={domains} onChanged={refreshDomains} onError={onError} />
          )}
          {view === "credentials" && <CredentialsView token={token} domains={domains} onChanged={refreshDomains} />}
          {view === "activity" && <ActivityView token={token} domains={domains} onError={onError} />}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Overview

function OverviewView({ token, onError }: { token: string; onError: (e: unknown) => void }) {
  const [overview, setOverview] = useState<EmailOverview | null>(null);

  useEffect(() => {
    emailOverview(token).then(setOverview).catch(onError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!overview) return <p className="mt-6 text-sm text-zinc-500">Loading…</p>;
  const day = overview.last24h;
  const tiles = [
    { label: "Domains", value: `${overview.verifiedDomains} / ${overview.domains}`, note: "verified / added" },
    { label: "SMTP credentials", value: overview.activeAccounts, note: "active" },
    { label: "Delivered", value: day.delivered ?? 0, note: "last 24 hours" },
    { label: "Failed", value: (day.failed ?? 0) + (day.error ?? 0), note: "last 24 hours" },
    {
      label: "Blocked",
      value: (day.rejected_sender ?? 0) + (day.rate_limited ?? 0) + (day.relay_denied ?? 0),
      note: "sender not allowed, rate limited, not signed in",
    },
    { label: "Accepted", value: day.accepted ?? 0, note: "last 24 hours" },
  ];
  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="glass-card rounded-2xl p-4">
            <p className="text-xs text-zinc-500">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{t.value}</p>
            <p className="mt-1 text-xs text-zinc-500">{t.note}</p>
          </div>
        ))}
      </div>
      <div className="glass-card rounded-2xl p-4 text-sm text-zinc-300">
        <p className="text-white">Connecting an app</p>
        <p className="mt-1 text-zinc-400">
          Use these SMTP settings with the username and password from <em>SMTP Credentials</em>:
        </p>
        <p className="mt-2 font-mono text-xs text-zinc-200">
          Host {overview.smtpHost || "(not configured)"} · Port {overview.smtpPort} · STARTTLS
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Domains

function DomainsView({
  token,
  domains,
  onChanged,
  onError,
}: {
  token: string;
  domains: EmailDomain[];
  onChanged: () => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      const domain = await addEmailDomain(token, name.trim());
      setName("");
      setOpenId(domain.id);
      await onChanged();
    } catch (err) {
      setAddError(errorText(err));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={handleAdd} className="glass-card flex max-w-xl flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-end">
        <label className="block flex-1 text-sm text-zinc-300">
          Add a sending domain
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. hrbooks360.com or mail.hrbooks360.com"
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-zinc-500"
          />
        </label>
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add domain"}
        </button>
      </form>
      {addError && <p className="text-sm text-red-400">{addError}</p>}

      <ul className="space-y-3">
        {domains.map((d) => (
          <DomainRow
            key={d.id}
            token={token}
            domain={d}
            open={openId === d.id}
            onToggle={() => setOpenId(openId === d.id ? null : d.id)}
            onChanged={onChanged}
            onError={onError}
          />
        ))}
        {domains.length === 0 && (
          <p className="rounded-xl border border-white/10 p-4 text-center text-sm text-zinc-500">
            No domains yet. Add one above to get its DNS records.
          </p>
        )}
      </ul>
    </div>
  );
}

function DomainRow({
  token,
  domain,
  open,
  onToggle,
  onChanged,
  onError,
}: {
  token: string;
  domain: EmailDomain;
  open: boolean;
  onToggle: () => void;
  onChanged: () => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const [busy, setBusy] = useState<"verify" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleVerify() {
    setBusy("verify");
    setMessage(null);
    try {
      const result = await verifyEmailDomain(token, domain.id);
      setMessage(
        result.status === "VERIFIED"
          ? "All records found. You can now create SMTP credentials for this domain."
          : "Not all records are visible yet. DNS changes can take a few minutes to an hour; check again shortly.",
      );
      await onChanged();
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Remove ${domain.name}? Its ${domain.activeAccounts} SMTP credential(s) stop working immediately.`,
      )
    )
      return;
    setBusy("delete");
    try {
      await deleteEmailDomain(token, domain.id);
      await onChanged();
    } catch (e) {
      onError(e);
      setBusy(null);
    }
  }

  const checks = Object.fromEntries(domain.lastCheck.map((c) => [c.purpose, c]));

  return (
    <li className="rounded-lg border border-white/10 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onToggle} className="text-left">
          <span className="text-white">{domain.name}</span>{" "}
          <Badge value={domain.status} />
          <span className="ml-2 text-xs text-zinc-500">
            {domain.activeAccounts} credential{domain.activeAccounts === 1 ? "" : "s"}
            {domain.lastCheckedAt && ` · checked ${new Date(domain.lastCheckedAt).toLocaleString()}`}
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleVerify}
            disabled={busy !== null}
            className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-black disabled:opacity-50"
          >
            {busy === "verify" ? "Checking DNS…" : "Verify DNS"}
          </button>
          <button
            onClick={onToggle}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 hover:border-accent/50"
          >
            {open ? "Hide records" : "DNS records"}
          </button>
          <button
            onClick={handleDelete}
            disabled={busy !== null}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-400 hover:border-red-400/50 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
      {message && <p className="mt-2 text-xs text-zinc-300">{message}</p>}

      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-zinc-400">
            Add these records at your DNS provider, then click <em>Verify DNS</em>. Type the{" "}
            <span className="text-white">Host</span> exactly as shown: most providers add your domain to it
            automatically.
          </p>
          {domain.dnsRecords.map((r) => (
            <DnsRecordCard key={r.purpose} record={r} check={checks[r.purpose]} />
          ))}
        </div>
      )}
    </li>
  );
}

function DnsRecordCard({ record, check }: { record: DnsRecord; check?: EmailDomain["lastCheck"][number] }) {
  const host = hostField(record.name);
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-white">
          {record.purpose} <span className="text-xs text-zinc-500">· {record.type} record</span>
        </span>
        {check && (
          <span className={`text-xs ${check.ok ? "text-emerald-300" : "text-amber-200"}`}>
            {check.ok ? "✓ Found" : `✗ ${check.problem}`}
          </span>
        )}
      </div>
      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-[6rem_1fr]">
        <span className="text-zinc-500">Host</span>
        <span className="flex items-center gap-2 font-mono text-zinc-200">
          {host} <CopyButton text={host} />
          <span className="font-sans text-zinc-500">(full name: {record.name})</span>
        </span>
        <span className="text-zinc-500">Value</span>
        <span className="flex items-start gap-2">
          <span className="min-w-0 break-all font-mono text-zinc-200">{record.value}</span>
          <CopyButton text={record.value} />
        </span>
      </div>
      <p className="mt-2 text-xs text-zinc-500">{record.hint}</p>
      {check && !check.ok && check.found.length > 0 && (
        <p className="mt-1 break-all text-xs text-zinc-500">Currently published: {check.found.join(" | ")}</p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Credentials

function CredentialsView({
  token,
  domains,
  onChanged,
}: {
  token: string;
  domains: EmailDomain[];
  onChanged: () => Promise<void>;
}) {
  const verified = domains.filter((d) => d.status === "VERIFIED");
  const [domainId, setDomainId] = useState(verified[0]?.id ?? "");
  const [accounts, setAccounts] = useState<SmtpAccount[]>([]);
  const [localPart, setLocalPart] = useState("noreply");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credential, setCredential] = useState<NewSmtpCredential | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const domain = domains.find((d) => d.id === domainId);

  async function loadAccounts(id: string) {
    if (!id) return;
    try {
      setAccounts(await listSmtpAccounts(token, id));
    } catch (e) {
      setError(errorText(e));
    }
  }

  useEffect(() => {
    // Fetch-on-mount: state is set only after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAccounts(domainId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setCredential(null);
    try {
      setCredential(await createSmtpAccount(token, domainId, localPart.trim(), description.trim()));
      setDescription("");
      await loadAccounts(domainId);
      await onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(account: SmtpAccount) {
    if (!window.confirm(`Revoke ${account.address}? Any app using it stops sending immediately.`)) return;
    setBusyId(account.id);
    try {
      await revokeSmtpAccount(token, account.id);
      await loadAccounts(domainId);
      await onChanged();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusyId(null);
    }
  }

  if (verified.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-white/10 p-4 text-sm text-zinc-400">
        SMTP credentials can only be created for a verified domain. Add a domain and publish its DNS records under{" "}
        <em>Domains &amp; DNS</em> first.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={handleCreate} className="glass-card max-w-xl space-y-3 rounded-2xl p-4">
        <h3 className="text-sm font-medium text-white">Create SMTP credentials</h3>
        <label className="block text-sm text-zinc-300">
          Domain
          <select
            value={domainId}
            onChange={(e) => {
              setDomainId(e.target.value);
              setCredential(null);
            }}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          >
            {verified.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-zinc-300">
          Sending address
          <span className="mt-1 flex items-center rounded-lg border border-white/10 bg-white/5 pr-3">
            <input
              value={localPart}
              onChange={(e) => setLocalPart(e.target.value)}
              required
              className="w-full bg-transparent px-3 py-2 text-white outline-none"
            />
            <span className="text-zinc-400">@{domain?.name}</span>
          </span>
          <span className="mt-1 block text-xs text-zinc-500">
            The app can only send as this exact address. Create one per app so each can be revoked on its own.
          </span>
        </label>
        <label className="block text-sm text-zinc-300">
          Used by (optional)
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. HRBooks360 production"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-zinc-500"
          />
        </label>
        <button
          type="submit"
          disabled={creating}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create credentials"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      {credential && (
        <div className="max-w-xl rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4 text-sm">
          <p className="font-medium text-amber-100">Copy the password now. It won&apos;t be shown again.</p>
          <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-xs">
            {[
              ["SMTP host", credential.smtpHost || "(not configured)"],
              ["Port", String(credential.smtpPort)],
              ["Security", credential.security],
              ["Username", credential.username],
              ["Password", credential.password],
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-zinc-400">{label}</dt>
                <dd className="flex items-center gap-2 font-mono text-white">
                  <span className="break-all">{value}</span>
                  <CopyButton text={value} />
                </dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={() => setCredential(null)}
            className="mt-3 text-xs text-zinc-300 underline"
          >
            I&apos;ve saved it
          </button>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-white">Credentials for {domain?.name}</h3>
        <ul className="mt-3 space-y-2">
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-3 text-sm">
              <span>
                <span className="font-mono text-white">{a.address}</span> <Badge value={a.status} />
                <span className="block text-xs text-zinc-500">
                  {a.description && `${a.description} · `}created {new Date(a.createdAt).toLocaleDateString()}
                  {a.createdBy && ` by ${a.createdBy}`}
                  {a.revokedAt && ` · revoked ${new Date(a.revokedAt).toLocaleDateString()}`}
                </span>
              </span>
              {a.status === "ACTIVE" && (
                <button
                  onClick={() => handleRevoke(a)}
                  disabled={busyId === a.id}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300 hover:border-red-400/50 disabled:opacity-50"
                >
                  {busyId === a.id ? "Revoking…" : "Revoke"}
                </button>
              )}
            </li>
          ))}
          {accounts.length === 0 && <p className="text-sm text-zinc-500">No credentials for this domain yet.</p>}
        </ul>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Activity

function ActivityView({
  token,
  domains,
  onError,
}: {
  token: string;
  domains: EmailDomain[];
  onError: (e: unknown) => void;
}) {
  const [domain, setDomain] = useState("");
  const [messages, setMessages] = useState<EmailMessage[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load(filter: string) {
    try {
      setMessages(await listEmailMessages(token, filter || undefined));
    } catch (e) {
      onError(e);
      setMessages([]);
    }
  }

  useEffect(() => {
    // Fetch-on-mount: state is set only after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(domain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value="">All domains</option>
          {domains.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => load(domain)}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:border-accent/50"
        >
          Refresh
        </button>
        <span className="text-xs text-zinc-500">Latest 50 messages. Subjects and contents are never stored.</span>
      </div>

      {messages === null ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : messages.length === 0 ? (
        <p className="rounded-xl border border-white/10 p-4 text-center text-sm text-zinc-500">No messages yet.</p>
      ) : (
        <ul className="space-y-2">
          {messages.map((m) => (
            <li key={m.mailId} className="rounded-lg border border-white/10 p-3 text-sm">
              <button
                type="button"
                onClick={() => setOpenId(openId === m.mailId ? null : m.mailId)}
                className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
              >
                <span className="min-w-0">
                  <span className="text-zinc-400">{m.account ?? m.sender}</span>
                  <span className="text-zinc-600"> → </span>
                  <span className="break-all text-white">{m.recipients.join(", ")}</span>
                </span>
                <span className="flex items-center gap-2 text-xs text-zinc-500">
                  {new Date(m.firstSeen).toLocaleString()} <Badge value={m.status} />
                </span>
              </button>
              {openId === m.mailId && (
                <ol className="mt-3 space-y-1 border-l border-white/10 pl-3 text-xs">
                  {m.history.map((h, i) => (
                    <li key={i}>
                      <span className="text-zinc-500">{new Date(h.at).toLocaleTimeString()}</span>{" "}
                      <span className="text-zinc-200">{LABELS[h.event] ?? h.event}</span>
                      {h.error && <span className="block break-all text-red-300">{h.error}</span>}
                    </li>
                  ))}
                  {m.messageId && <li className="break-all text-zinc-600">Message-ID {m.messageId}</li>}
                </ol>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
