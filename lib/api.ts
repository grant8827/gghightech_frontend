// Thin fetch wrapper around the FastAPI backend (backend-fastapi/).
// Every call goes through here so auth headers stay a one-file change.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- Login (GGH-401) ----
// Email/password login against backend-fastapi's self-issued JWT (see
// app/services/local_auth.py) — the site's only auth system. Used by both
// /admin and /portal. New users get in via acceptInvite() below, not this
// directly — invite_user() only creates the row; there's no password until
// the invite link is followed.

const AUTH_STORAGE_KEY = "gghightech_admin_auth";

export type StoredAuth = {
  token: string;
  role: string;
  email: string;
  full_name: string;
};

type LoginResponse = { access_token: string; role: string; email: string; full_name: string };

export const login = (email: string, password: string) =>
  request<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

// Second half of the invite flow started by inviteUser() below.
export const acceptInvite = (token: string, password: string) =>
  request<LoginResponse>("/api/v1/auth/accept-invite", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });

export function saveAuth(auth: StoredAuth): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  } catch {
    // localStorage unavailable (private mode, etc.) — session just won't persist across reloads.
  }
}

export function loadAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // nothing to clean up
  }
}

// ---- Estimates (GGH-201 / GGH-202) ----

export type EstimateCreate = {
  project_type: string;
  features: string[];
  design_tier: string;
  client_email?: string;
  client_phone?: string;
  // Free-text "tell us exactly what you want" — reviewed by staff against
  // the toggle-based price, not used in the calculation itself.
  project_description?: string;
};

export type EstimateOut = {
  id: string;
  client_email: string | null;
  client_phone: string | null;
  scope_configuration: Record<string, unknown>;
  project_description: string | null;
  calculated_min_price: number;
  calculated_max_price: number;
  estimated_weeks_min: number;
  estimated_weeks_max: number;
  status: string;
  created_at: string;
};

export type EstimatePreview = {
  calculated_min_price: number;
  calculated_max_price: number;
  estimated_weeks_min: number;
  estimated_weeks_max: number;
};

export const previewEstimate = (payload: EstimateCreate) =>
  request<EstimatePreview>("/api/v1/estimates/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const createEstimate = (payload: EstimateCreate) =>
  request<EstimateOut>("/api/v1/estimates", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const estimatePdfUrl = (id: string) => `${API_URL}/api/v1/estimates/${id}/pdf`;

// ---- Admin (GGH-401) ----
// Every call below takes the signed-in admin's bearer token (from
// login()/loadAuth() above) instead of the old dev-role header.

export type OrganizationOut = {
  id: string;
  name: string;
  domain: string | null;
  plan_tier: string;
  created_at: string;
};

export type ProjectOut = {
  id: string;
  org_id: string;
  title: string;
  slug: string;
  status: string;
  budget_estimate: number | null;
  health_score: number;
  staging_url: string | null;
  repository_url: string | null;
  last_deploy_commit_sha: string | null;
  last_deploy_status: string | null;
  last_deployed_at: string | null;
  latest_commit_sha: string | null;
  latest_commit_message: string | null;
  latest_commit_synced_at: string | null;
  jira_project_key: string | null;
  jira_issue_count: number | null;
  jira_done_count: number | null;
  jira_synced_at: string | null;
  overall_progress: number;
  created_at: string;
};

export const listOrganizations = (token: string) =>
  request<OrganizationOut[]>("/api/v1/organizations", { token });

export const createOrganization = (token: string, payload: { name: string; domain?: string }) =>
  request<OrganizationOut>("/api/v1/organizations", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });

export const listProjects = (token: string, orgId?: string) =>
  request<ProjectOut[]>(`/api/v1/projects${orgId ? `?org_id=${orgId}` : ""}`, { token });

export const getProject = (token: string, projectId: string) =>
  request<ProjectOut>(`/api/v1/projects/${projectId}`, { token });

export const createProject = (token: string, payload: { org_id: string; title: string; slug: string }) =>
  request<ProjectOut>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });

// Staff-only. Every field optional — only what's sent gets changed. This
// is the only way to set staging_url and jira_project_key.
export const updateProject = (
  token: string,
  projectId: string,
  payload: Partial<{
    title: string;
    status: string;
    budget_estimate: number;
    staging_url: string;
    repository_url: string;
    jira_project_key: string;
  }>,
) =>
  request<ProjectOut>(`/api/v1/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });

// Outbound polling — see backend-fastapi/app/services/github_service.py.
// Unauthenticated calls already work for public repos.
export const syncProjectGithub = (token: string, projectId: string) =>
  request<ProjectOut>(`/api/v1/projects/${projectId}/sync-github`, { method: "POST", token });

// Outbound polling — see backend-fastapi/app/services/jira_service.py.
// 503s until JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN are all set server-side.
export const syncProjectJira = (token: string, projectId: string) =>
  request<ProjectOut>(`/api/v1/projects/${projectId}/sync-jira`, { method: "POST", token });

// GGH-302 — staff-only, recorded manually until a CI webhook exists.
export const updateProjectDeployment = (
  token: string,
  projectId: string,
  payload: { commit_sha: string; status: string },
) =>
  request<ProjectOut>(`/api/v1/projects/${projectId}/deployment`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });

export const listEstimates = (token: string) => request<EstimateOut[]>("/api/v1/estimates", { token });

// ---- Milestones / Portal (GGH-301) ----

export type MilestoneOut = {
  id: string;
  project_id: string;
  title: string;
  progress_percentage: number;
  status: string;
  due_date: string | null;
  amount: number | null;
  approved_at: string | null;
  created_at: string;
};

export const listMilestones = (token: string, projectId: string) =>
  request<MilestoneOut[]>(`/api/v1/milestones?project_id=${projectId}`, { token });

export const createMilestone = (
  token: string,
  payload: { project_id: string; title: string; due_date?: string; amount?: number },
) =>
  request<MilestoneOut>("/api/v1/milestones", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });

export const updateMilestone = (
  token: string,
  milestoneId: string,
  payload: { progress_percentage?: number; status?: string; due_date?: string; amount?: number },
) =>
  request<MilestoneOut>(`/api/v1/milestones/${milestoneId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });

// GGH-301 — bare-signal live updates; browsers can't set custom headers on
// a WebSocket, so the token travels as a query param instead. Callers should
// treat any message as "something changed, refetch" rather than parse it.
export const projectUpdatesSocketUrl = (token: string, projectId: string) => {
  const wsUrl = API_URL.replace(/^http/, "ws");
  return `${wsUrl}/api/v1/ws/projects/${projectId}?token=${encodeURIComponent(token)}`;
};

// ---- Milestone approval / invoicing (Stripe stubbed) ----

export type InvoiceOut = {
  id: string;
  org_id: string;
  project_id: string;
  milestone_id: string | null;
  description: string | null;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
};

export const approveMilestone = (token: string, milestoneId: string) =>
  request<InvoiceOut>(`/api/v1/milestones/${milestoneId}/approve`, { method: "POST", token });

export const listInvoices = (token: string, projectId?: string) =>
  request<InvoiceOut[]>(`/api/v1/invoices${projectId ? `?project_id=${projectId}` : ""}`, { token });

// Staff-only, ad-hoc — not tied to a milestone (retainers, one-off charges).
export const createInvoice = (
  token: string,
  payload: { project_id: string; amount: number; description: string },
) =>
  request<InvoiceOut>("/api/v1/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });

export const invoicePdfUrl = (id: string) => `${API_URL}/api/v1/invoices/${id}/pdf`;

export const payInvoice = (token: string, invoiceId: string) =>
  request<{ checkout_url: string }>(`/api/v1/invoices/${invoiceId}/pay`, { method: "POST", token });

export const markInvoicePaid = (token: string, invoiceId: string) =>
  request<InvoiceOut>(`/api/v1/invoices/${invoiceId}/mark-paid`, { method: "PATCH", token });

// ---- Architect status feed ----

export type ProjectUpdateOut = {
  id: string;
  project_id: string;
  author_name: string;
  author_role: string;
  message: string;
  created_at: string;
};

export const listProjectUpdates = (token: string, projectId: string) =>
  request<ProjectUpdateOut[]>(`/api/v1/projects/${projectId}/updates`, { token });

export const postProjectUpdate = (token: string, projectId: string, message: string) =>
  request<ProjectUpdateOut>(`/api/v1/projects/${projectId}/updates`, {
    method: "POST",
    body: JSON.stringify({ message }),
    token,
  });

export const inviteUser = (
  token: string,
  payload: { org_id: string; email: string; full_name: string; role: string },
) =>
  request<unknown>("/api/v1/users/invite", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
