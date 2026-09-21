"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  createOrganization,
  createProject,
  inviteUser,
  listEstimates,
  listOrganizations,
  listProjects,
  type EstimateOut,
  type OrganizationOut,
  type ProjectOut,
  type StoredAuth,
} from "@/lib/api";
import { AuthGate } from "@/components/AuthGate";
import { ClientsTab } from "./tabs/ClientsTab";
import { EstimatesTab } from "./tabs/EstimatesTab";
import { InvoicingTab } from "./tabs/InvoicingTab";
import { JiraTicketsTab } from "./tabs/JiraTicketsTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { PaymentsTab } from "./tabs/PaymentsTab";
import { ProjectsGitTab } from "./tabs/ProjectsGitTab";
import { StaffTab } from "./tabs/StaffTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "clients", label: "Clients" },
  { id: "projects", label: "Projects & Git" },
  { id: "jira", label: "Jira Tickets" },
  { id: "invoicing", label: "Invoicing" },
  { id: "payments", label: "Payments & Subscriptions" },
  { id: "estimates", label: "Estimates" },
] as const;

// Kept separate from TABS — rendered below the signed-in user's own badge
// in the sidebar rather than in the main nav list, since staff management
// is an account/access-control concern, not a delivery/billing one.
const STAFF_TAB = { id: "staff", label: "Staff" } as const;

type TabId = (typeof TABS)[number]["id"] | typeof STAFF_TAB.id;

export default function AdminPage() {
  return (
    <AuthGate title="Admin sign in" subtitle="GG HighTech staff only.">
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
    // Fetch-on-mount: refresh() sets state only after its awaits resolve,
    // not synchronously within this effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
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

  async function handleCreateProject(orgId: string, title: string, slug: string) {
    setNotice(null);
    try {
      const project = await createProject(auth.token, { org_id: orgId, title, slug });
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
      setNotice(`Invited ${email}. (Email delivery is stubbed — see app/services/email.py.)`);
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
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-accent/15 text-accent-light"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
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
            <InvoicingTab token={auth.token} projects={projects} onError={(e) => handleError(e, "Request failed")} />
          )}
          {activeTab === "payments" && (
            <PaymentsTab
              token={auth.token}
              orgs={orgs}
              projects={projects}
              onError={(e) => handleError(e, "Request failed")}
            />
          )}
          {activeTab === "estimates" && <EstimatesTab estimates={estimates} />}
        </div>
      </main>
    </div>
  );
}
