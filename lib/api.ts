// Thin fetch wrapper around the FastAPI backend (backend-fastapi/).
// Every call goes through here so swapping in real Clerk bearer tokens
// later (see the admin login helpers below) is a one-file change.

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

// ---- Admin login (GGH-401) ----
// Real email/password login against backend-fastapi's self-issued JWT
// (see app/services/local_auth.py) — this is what the SUPER_ADMIN account
// created via `python -m app.cli create-superadmin` signs in with. Swapped
// out for Clerk automatically once NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set.

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

export const createProject = (token: string, payload: { org_id: string; title: string; slug: string }) =>
  request<ProjectOut>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });

export const listEstimates = (token: string) => request<EstimateOut[]>("/api/v1/estimates", { token });

export const inviteUser = (
  token: string,
  payload: { org_id: string; email: string; full_name: string; role: string },
) =>
  request<unknown>("/api/v1/users/invite", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
