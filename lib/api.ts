// Thin fetch wrapper around the FastAPI backend (backend-fastapi/).
// Every call goes through here so swapping in real Clerk bearer tokens
// later (see getAuthHeaders below) is a one-file change.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { devRole?: string } = {},
): Promise<T> {
  const { devRole, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      // Dev-auth fallback (see backend app/services/auth.py) — used only
      // until Clerk keys are configured, and only by the admin UI.
      ...(devRole ? { "X-Dev-User-Role": devRole } : {}),
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

// ---- Estimates (GGH-201 / GGH-202) ----

export type EstimateCreate = {
  project_type: string;
  features: string[];
  design_tier: string;
  client_email?: string;
  // Free-text "tell us exactly what you want" — reviewed by staff against
  // the toggle-based price, not used in the calculation itself.
  project_description?: string;
};

export type EstimateOut = {
  id: string;
  client_email: string | null;
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
  created_at: string;
};

export const listOrganizations = (devRole: string) =>
  request<OrganizationOut[]>("/api/v1/organizations", { devRole });

export const createOrganization = (devRole: string, payload: { name: string; domain?: string }) =>
  request<OrganizationOut>("/api/v1/organizations", {
    method: "POST",
    body: JSON.stringify(payload),
    devRole,
  });

export const listProjects = (devRole: string, orgId?: string) =>
  request<ProjectOut[]>(`/api/v1/projects${orgId ? `?org_id=${orgId}` : ""}`, { devRole });

export const createProject = (
  devRole: string,
  payload: { org_id: string; title: string; slug: string },
) =>
  request<ProjectOut>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify(payload),
    devRole,
  });

export const listEstimates = (devRole: string) =>
  request<EstimateOut[]>("/api/v1/estimates", { devRole });

export const inviteUser = (
  devRole: string,
  payload: { org_id: string; email: string; full_name: string; role: string },
) =>
  request<unknown>("/api/v1/users/invite", {
    method: "POST",
    body: JSON.stringify(payload),
    devRole,
  });
