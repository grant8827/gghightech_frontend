"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  createOrganization,
  createProject,
  emailServerStatus,
  getUnreadMessageCount,
  listContracts,
  inviteUser,
  listEstimates,
  listOrganizations,
  listProjects,
  type EstimateOut,
  type OrganizationOut,
  type ProjectCreate,
  type ProjectOut,
  type StoredAuth,
} from "@/lib/api";
import { AuthGate, STAFF_ROLES } from "@/components/AuthGate";
import { isNewlySigned, markSignedSeen, signedSeenAt } from "@/lib/signedContracts";
import { ClientsTab } from "./tabs/ClientsTab";
import { EstimatesTab } from "./tabs/EstimatesTab";
import { InvoicingTab } from "./tabs/InvoicingTab";
import { JiraTicketsTab } from "./tabs/JiraTicketsTab";
import { MessagesTab } from "./tabs/MessagesTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { PaymentsTab } from "./tabs/PaymentsTab";
import { ProjectsGitTab } from "./tabs/ProjectsGitTab";
import { ReviewsTab } from "./tabs/ReviewsTab";
import { StaffTab } from "./tabs/StaffTab";
import { EmailServerTab } from "./tabs/EmailServerTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "messages", label: "Messages" },
  { id: "clients", label: "Clients" },
  { id: "projects", label: "Projects & Git" },
  { id: "jira", label: "Jira Tickets" },
  { id: "invoicing", label: "Invoicing / Contracts" },
  { id: "payments", label: "Payments & Subscriptions" },
  { id: "estimates", label: "Estimates" },
  { id: "reviews", label: "Reviews" },
] as const;

// Kept separate from TABS — rendered below the signed-in user's own badge
// in the sidebar rather than in the main nav list, since staff management
// is an account/access-control concern, not a delivery/billing one.
const STAFF_TAB = { id: "staff", label: "Staff" } as const;

// SUPER_ADMIN only. Until the backend has an Email Server connected
// (EMAIL_SERVICE_URL), the tab shows the setup status instead.
const EMAIL_TAB = { id: "email", label: "Email Server" } as const;

type TabId = (typeof TABS)[number]["id"] | typeof STAFF_TAB.id | typeof EMAIL_TAB.id;

export default function AdminPage() {
  return (
    <AuthGate
      title="Admin sign in"
      subtitle="GG HighTech staff only."
      allowedRoles={STAFF_ROLES}
      wrongRole={{
        message: "That's a client account, and this page is for GG HighTech staff.",
        href: "/portal",
        linkLabel: "Go to your client dashboard",
      }}
    >
      {({ auth, onSessionExpired, onLogout }) => (
        <AdminDashboard auth={auth} onSessionExpired={onSessionExpired} onLogout={onLogout} />
      )}
    </AuthGate>
  );
}

function AdminDashboard({
  auth,
  onSessionExpired,
  onLogout,
}: {
  auth: StoredAuth;
  onSessionExpired: () => void;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [orgs, setOrgs] = useState<OrganizationOut[]>([]);
  const [projects, setProjects] = useState<ProjectOut[]>([]);
  const [estimates, setEstimates] = useState<EstimateOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // null = not checked yet.
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);
  const isSuperAdmin = auth.role === "SUPER_ADMIN";
  // Shown as a badge on the Messages tab. Only SUPER_ADMIN and
  // PROJECT_MANAGER can read messages; for other roles it stays 0.
  const [unreadMessages, setUnreadMessages] = useState(0);
  const canReadMessages = auth.role === "SUPER_ADMIN" || auth.role === "PROJECT_MANAGER";
  // Contracts signed since this browser last opened Invoicing / Contracts →
  // Contracts. Badge on that tab; see lib/signedContracts.ts.
  const [newlySigned, setNewlySigned] = useState(0);

  function handleError(e: unknown, fallback: string) {
    if (e instanceof ApiError) {
      if (e.status === 401) {
        onSessionExpired();
        return;
      }
      setError(`${e.status}: ${e.message}`);
      return;
    }
    setError(fallback);
  }

  async function refresh() {
    try {
      const [orgsRes, projectsRes, estimatesRes] = await Promise.all([
        listOrganizations(auth.token),
        listProjects(auth.token),
        listEstimates(auth.token),
      ]);
      setOrgs(orgsRes);
      setProjects(projectsRes);
      setEstimates(estimatesRes);
      setError(null);
    } catch (e) {
      handleError(e, "Could not reach the API");
    }
  }

  useEffect(() => {
    const loadSigned = () =>
      listContracts(auth.token)
        .then((cs) => {
          const seen = signedSeenAt();
          setNewlySigned(cs.filter((c) => isNewlySigned(c, seen)).length);
        })
        .catch(() => {}); // best-effort badge
    loadSigned();
    const timer = window.setInterval(loadSigned, 60_000);
    return () => window.clearInterval(timer);
  }, [auth.token]);

  useEffect(() => {
    // Fetch-on-mount: refresh() sets state only after its awaits resolve,
    // not synchronously within this effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    if (auth.role === "SUPER_ADMIN") {
      // Best-effort: if this fails the tab shows the "not connected" state.
      emailServerStatus(auth.token)
        .then((s) => setEmailEnabled(s.enabled))
        .catch(() => setEmailEnabled(false));
    }
    if (!canReadMessages) return;
    const loadUnread = () =>
      getUnreadMessageCount(auth.token)
        .then((r) => setUnreadMessages(r.unread))
        .catch(() => {}); // best-effort badge; the tab itself reports errors
    loadUnread();
    // Pick up new messages while the dashboard stays open.
    const timer = window.setInterval(loadUnread, 60_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateOrg(name: string, domain: string) {
    setNotice(null);
    try {
      const org = await createOrganization(auth.token, { name, domain: domain || undefined });
      setNotice(`Organization "${org.name}" created.`);
      await refresh();
      return org;
    } catch (e) {
      handleError(e, "Failed to create organization");
      return null;
    }
  }

  async function handleCreateProject(payload: ProjectCreate) {
    setNotice(null);
    try {
      const project = await createProject(auth.token, payload);
      setNotice(`Project "${project.title}" created.`);
      await refresh();
      return project;
    } catch (e) {
      handleError(e, "Failed to create project");
      return null;
    }
  }

  async function handleInvite(orgId: string, email: string, fullName: string, role: string) {
    setNotice(null);
    try {
      await inviteUser(auth.token, { org_id: orgId, email, full_name: fullName, role });
      setNotice(`Invited ${email}. They'll get an email with a link to set their password.`);
      return true;
    } catch (e) {
      handleError(e, "Failed to invite user");
      return false;
    }
  }

  return (
    <div className="flex">
      <aside className="sticky top-0 h-screen w-56 shrink-0 overflow-y-auto border-r border-white/10 px-6 py-16">
        <h1 className="text-2xl font-semibold text-white">Back-Office</h1>
        <p className="mt-1 text-xs text-zinc-500">Complete control over clients, delivery, and billing.</p>

        <nav className="mt-6 flex flex-col gap-1">
          {TABS.filter((tab) => tab.id !== "messages" || canReadMessages).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-accent/15 text-accent-light"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              {tab.label}
              {tab.id === "messages" && unreadMessages > 0 && (
                <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold leading-none text-black">
                  {unreadMessages}
                  <span className="sr-only"> unread</span>
                </span>
              )}
              {tab.id === "invoicing" && newlySigned > 0 && (
                <span
                  title={`${newlySigned} contract${newlySigned === 1 ? "" : "s"} newly signed`}
                  className="ml-2 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-black"
                >
                  ✓ {newlySigned}
                  <span className="sr-only"> newly signed</span>
                </span>
              )}
            </button>
          ))}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab(EMAIL_TAB.id)}
              className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                activeTab === EMAIL_TAB.id
                  ? "bg-accent/15 text-accent-light"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              {EMAIL_TAB.label}
            </button>
          )}
        </nav>

        <div className="mt-8 space-y-2 border-t border-white/10 pt-4">
          <span className="block rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-center text-xs text-accent-light">
            {auth.full_name} · {auth.role}
          </span>
          <button
            onClick={() => setActiveTab(STAFF_TAB.id)}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              activeTab === STAFF_TAB.id
                ? "bg-accent/15 text-accent-light"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            {STAFF_TAB.label}
          </button>
          <button
            onClick={onLogout}
            className="w-full rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 hover:border-white/30"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-6 py-16">
        <div className="max-w-5xl">
          {error && (
            <p className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
          {notice && (
            <p className="mb-6 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent-light">
              {notice}
            </p>
          )}

          {activeTab === "overview" && (
            <OverviewTab
              token={auth.token}
              orgs={orgs}
              projects={projects}
              estimates={estimates}
              onError={(e) => handleError(e, "Request failed")}
            />
          )}
          {activeTab === "messages" && canReadMessages && (
            <MessagesTab
              token={auth.token}
              currentUserRole={auth.role}
              onUnreadChange={setUnreadMessages}
              onError={(e) => handleError(e, "Request failed")}
            />
          )}
          {activeTab === "clients" && (
            <ClientsTab orgs={orgs} onCreateOrg={handleCreateOrg} onInvite={handleInvite} />
          )}
          {activeTab === "staff" && (
            <StaffTab
              token={auth.token}
              orgs={orgs}
              currentUserEmail={auth.email}
              currentUserRole={auth.role}
              onError={(e) => handleError(e, "Request failed")}
            />
          )}
          {activeTab === "projects" && (
            <ProjectsGitTab
              token={auth.token}
              orgs={orgs}
              projects={projects}
              onCreateProject={handleCreateProject}
              onError={(e) => handleError(e, "Request failed")}
              onProjectChanged={refresh}
            />
          )}
          {activeTab === "jira" && (
            <JiraTicketsTab
              token={auth.token}
              projects={projects}
              onError={(e) => handleError(e, "Request failed")}
            />
          )}
          {activeTab === "invoicing" && (
            <InvoicingTab
              token={auth.token}
              projects={projects}
              orgs={orgs}
              newlySigned={newlySigned}
              onContractsSeen={() => {
                markSignedSeen();
                setNewlySigned(0);
              }}
              onError={(e) => handleError(e, "Request failed")}
            />
          )}
          {activeTab === "payments" && (
            <PaymentsTab
              token={auth.token}
              orgs={orgs}
              projects={projects}
              onError={(e) => handleError(e, "Request failed")}
            />
          )}
          {activeTab === "reviews" && (
            <ReviewsTab
              token={auth.token}
              currentUserRole={auth.role}
              onError={(e) => handleError(e, "Request failed")}
            />
          )}
          {activeTab === "email" && isSuperAdmin && (
            <EmailServerTab
              token={auth.token}
              enabled={emailEnabled}
              onError={(e) => handleError(e, "Request failed")}
            />
          )}
          {activeTab === "estimates" && (
            <EstimatesTab
              token={auth.token}
              estimates={estimates}
              onError={(e) => handleError(e, "Request failed")}
            />
          )}
        </div>
      </main>
    </div>
  );
}
