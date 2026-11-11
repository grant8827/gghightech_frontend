"use client";

import { useEffect, useState } from "react";
import {
  deleteMessage,
  listMessages,
  updateMessageStatus,
  type ContactMessageAdmin,
  type MessageStatus,
} from "@/lib/api";

const FILTERS = [
  { id: "INBOX", label: "Inbox" },
  { id: "NEW", label: "Unread" },
  { id: "ARCHIVED", label: "Archived" },
  { id: "ALL", label: "All" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const STATUS_STYLES: Record<MessageStatus, string> = {
  NEW: "border-accent/40 bg-accent/15 text-accent-light",
  READ: "border-white/10 bg-white/5 text-zinc-400",
  ARCHIVED: "border-white/10 bg-white/5 text-zinc-500",
};

const SOURCE_LABELS: Record<string, string> = {
  CONTACT_PAGE: "Contact page",
  WIDGET: "Message button",
};

const actionClass =
  "rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 transition-colors hover:border-accent/50 disabled:opacity-50";

function matches(filter: FilterId, m: ContactMessageAdmin) {
  if (filter === "ALL") return true;
  if (filter === "INBOX") return m.status !== "ARCHIVED";
  return m.status === filter;
}

// Messages from the website's Contact page and floating message button.
// Opening one marks it read; archive what's been dealt with.
export function MessagesTab({
  token,
  currentUserRole,
  onUnreadChange,
  onError,
}: {
  token: string;
  currentUserRole: string;
  onUnreadChange: (unread: number) => void;
  onError: (e: unknown) => void;
}) {
  const [messages, setMessages] = useState<ContactMessageAdmin[]>([]);
  const [filter, setFilter] = useState<FilterId>("INBOX");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function apply(next: ContactMessageAdmin[]) {
    setMessages(next);
    onUnreadChange(next.filter((m) => m.status === "NEW").length);
  }

  async function refresh() {
    try {
      apply(await listMessages(token));
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

  async function setStatus(m: ContactMessageAdmin, status: MessageStatus) {
    setBusyId(m.id);
    try {
      const updated = await updateMessageStatus(token, m.id, status);
      apply(messages.map((x) => (x.id === m.id ? updated : x)));
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  function toggleOpen(m: ContactMessageAdmin) {
    const opening = openId !== m.id;
    setOpenId(opening ? m.id : null);
    if (opening && m.status === "NEW") setStatus(m, "READ");
  }

  async function handleDelete(m: ContactMessageAdmin) {
    if (!window.confirm(`Permanently delete the message from ${m.name}? This can't be undone.`)) return;
    setBusyId(m.id);
    try {
      await deleteMessage(token, m.id);
      apply(messages.filter((x) => x.id !== m.id));
    } catch (e) {
      onError(e);
    } finally {
      setBusyId(null);
    }
  }

  const visible = messages.filter((m) => matches(filter, m));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-white">Messages</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Sent from the website&apos;s Contact page and message button. Opening a message marks it read.
          </p>
        </div>
        <button onClick={refresh} className={actionClass}>
          Refresh
        </button>
      </div>

      <div role="group" aria-label="Filter messages" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
              filter === f.id ? "bg-accent text-black" : "border border-white/10 text-zinc-300 hover:border-white/30"
            }`}
          >
            {f.label} ({messages.filter((m) => matches(f.id, m)).length})
          </button>
        ))}
      </div>

      {loading && <p className="mt-6 text-sm text-zinc-500">Loading…</p>}

      <ul className="mt-6 space-y-3">
        {visible.map((m) => {
          const busy = busyId === m.id;
          const open = openId === m.id;
          const replySubject = encodeURIComponent(`Re: ${m.subject || "Your message to GG HighTech"}`);
          return (
            <li key={m.id} className={`glass-card rounded-2xl ${m.status === "NEW" ? "border-l-2 border-l-accent" : ""}`}>
              <button
                onClick={() => toggleOpen(m)}
                aria-expanded={open}
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-5 text-left"
              >
                <span className={`text-sm ${m.status === "NEW" ? "font-semibold text-white" : "text-zinc-200"}`}>
                  {m.name}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_STYLES[m.status]}`}>
                  {m.status === "NEW" ? "UNREAD" : m.status}
                </span>
                <span className="ml-auto text-xs text-zinc-500">{new Date(m.created_at).toLocaleString()}</span>
                <span className="w-full truncate text-sm text-zinc-400">
                  {m.subject ? <span className="text-zinc-300">{m.subject} — </span> : null}
                  {m.message}
                </span>
              </button>

              {open && (
                <div className="border-t border-white/10 px-5 pb-5 pt-4">
                  <dl className="grid gap-x-6 gap-y-1 text-xs text-zinc-400 sm:grid-cols-3">
                    <div>
                      <dt className="text-zinc-600">Email</dt>
                      <dd>
                        <a href={`mailto:${m.email}`} className="text-zinc-200 hover:text-accent-light">
                          {m.email}
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-600">Phone</dt>
                      <dd>
                        {m.phone ? (
                          <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`} className="text-zinc-200 hover:text-accent-light">
                            {m.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-600">Sent from</dt>
                      <dd className="text-zinc-200">{SOURCE_LABELS[m.source] ?? m.source}</dd>
                    </div>
                  </dl>

                  <p className="mt-4 whitespace-pre-line break-words text-sm text-zinc-200">{m.message}</p>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <a
                      href={`mailto:${m.email}?subject=${replySubject}`}
                      className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black transition-transform hover:scale-105"
                    >
                      Reply by email
                    </a>
                    {m.status !== "ARCHIVED" ? (
                      <button disabled={busy} onClick={() => setStatus(m, "ARCHIVED")} className={actionClass}>
                        Archive
                      </button>
                    ) : (
                      <button disabled={busy} onClick={() => setStatus(m, "READ")} className={actionClass}>
                        Move to inbox
                      </button>
                    )}
                    {m.status !== "NEW" && (
                      <button disabled={busy} onClick={() => setStatus(m, "NEW")} className={actionClass}>
                        Mark unread
                      </button>
                    )}
                    {currentUserRole === "SUPER_ADMIN" && (
                      <button
                        disabled={busy}
                        onClick={() => handleDelete(m)}
                        className="rounded-full border border-red-400/30 px-3 py-1 text-xs text-red-300 transition-colors hover:border-red-400/60 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                    {m.handled_by && m.handled_at && (
                      <span className="ml-auto text-xs text-zinc-600">
                        Last changed by {m.handled_by} · {new Date(m.handled_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {!loading && visible.length === 0 && (
          <li className="rounded-2xl border border-white/10 p-6 text-center text-sm text-zinc-500">
            No messages here.
          </li>
        )}
      </ul>
    </div>
  );
}
