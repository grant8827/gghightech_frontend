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
    // FastAPI sends a plain string for errors it raises itself, but a list
    // of {msg, loc, ...} objects for request-validation failures (422).
    // Show the first of those as a sentence rather than "[object Object]".
    const detail = Array.isArray(body.detail)
      ? String(body.detail[0]?.msg ?? "Please check the form and try again.").replace(/^Value error, /, "")
      : body.detail;
    throw new ApiError(res.status, detail ?? "Request failed");
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

// Emails a reset link if the address has an account; the response is the
// same either way.
export const forgotPassword = (email: string) =>
  request<{ detail: string }>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

// Second half of forgotPassword(): signs the user in on success.
export const resetPassword = (token: string, password: string) =>
  request<LoginResponse>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });

// Ends the session on the server (every device, not just this one — the
// backend has no per-device sessions) so the token can't be reused by
// anyone who copied it. Callers should clear local state regardless of
// whether this succeeds.
export const logout = (token: string) =>
  request<void>("/api/v1/auth/logout", { method: "POST", token });

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
  request_type: string;
  client_email?: string;
  client_phone?: string;
  project_description: string;
};

export type InfrastructureCost = {
  name: string;
  monthly_min: number;
  monthly_max: number;
  annual_min: number;
  annual_max: number;
  note: string;
};

export type ScopeAnalysis = {
  summary: string;
  complexity: string;
  adjustment_percent: number;
  detected_requirements: string[];
  risks: string[];
  market_comparison: string;
  recommended_price_min: number;
  recommended_price_max: number;
  recommended_weeks_min: number;
  recommended_weeks_max: number;
  recommended_monthly_min: number;
  recommended_monthly_max: number;
  recommended_hours_per_week_min: number;
  recommended_hours_per_week_max: number;
  source: "openai" | "rules";
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
  request_type: string;
  calculated_min_price: number;
  calculated_max_price: number;
  estimated_weeks_min: number;
  estimated_weeks_max: number;
  infrastructure: InfrastructureCost[];
  monthly_operating_min: number;
  monthly_operating_max: number;
  first_year_operating_min: number;
  first_year_operating_max: number;
  maintenance_monthly_min: number;
  maintenance_monthly_max: number;
  maintenance_hours_per_week_min: number;
  maintenance_hours_per_week_max: number;
};

export const previewEstimate = (payload: Omit<EstimateCreate, "project_description">) =>
  request<EstimatePreview>("/api/v1/estimates/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// What the public POST /estimates returns: the estimate plus a short-lived
// pdf_token that lets this visitor (and nobody else) download its PDF.
export type EstimateCreated = EstimateOut & { pdf_token: string | null };

export const createEstimate = (payload: EstimateCreate) =>
  request<EstimateCreated>("/api/v1/estimates", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// The estimate PDF contains the lead's contact details, so the API only
// serves it to signed-in staff (`token`) or to the visitor who just created
// it (`pdfToken`, from createEstimate above). Credentials go in a header,
// which a plain <a href> can't send — hence fetch + a blob download rather
// than a link.
export async function downloadEstimatePdf(
  id: string,
  credentials: { token: string } | { pdfToken: string },
): Promise<void> {
  const headers: Record<string, string> =
    "token" in credentials
      ? { Authorization: `Bearer ${credentials.token}` }
      : { "X-Estimate-Token": credentials.pdfToken };

  const res = await fetch(`${API_URL}/api/v1/estimates/${id}/pdf`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? "Could not download the PDF");
  }

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `gghightech-estimate-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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
  // The client's real website; staging_url above is the preview.
  live_url: string | null;
  // Newest first; refreshed by GitHub sync (on save, on demand, and every
  // 15 minutes in the background).
  recent_commits: CommitOut[] | null;
  // Commits per week for the last 12 weeks (oldest first), from the same
  // GitHub sync. capped: the window hit GitHub's 100-commit page.
  commit_activity: { weeks: { start: string; commits: number }[]; capped: boolean } | null;
  overall_progress: number;
  created_at: string;
};

export type CommitOut = {
  sha: string;
  message: string;
  author: string | null;
  committed_at: string | null;
  url: string | null;
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

export type ProjectCreate = {
  org_id: string;
  title: string;
  slug: string;
  repository_url?: string;
  live_url?: string;
  staging_url?: string;
};

export const createProject = (token: string, payload: ProjectCreate) =>
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
  // For the URL fields, "" or null clears the value.
  payload: Partial<{
    title: string;
    status: string;
    budget_estimate: number;
    staging_url: string | null;
    live_url: string | null;
    repository_url: string | null;
    jira_project_key: string | null;
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
  // due_date: "YYYY-MM-DD", or null to clear it.
  payload: { progress_percentage?: number; status?: string; due_date?: string | null; amount?: number },
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

// ---- Milestone approval / invoicing (Stripe Checkout) ----

export type InvoiceOut = {
  id: string;
  org_id: string;
  project_id: string;
  milestone_id: string | null;
  description: string | null;
  amount: number;
  status: string;
  customer_email: string | null;
  created_at: string;
  paid_at: string | null;
  // Set once PAID: CARD when the client paid online through Stripe;
  // otherwise how staff recorded it (see markInvoicePaid).
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  // INV-YYYY-NNNN. Older milestone/subscription invoices have no line items.
  invoice_number: string | null;
  line_items: LineItem[] | null;
  subtotal: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  issue_date: string | null;
  due_date: string | null;
  notes: string | null;
  bill_to_name: string | null;
  sent_at: string | null;
};

export type LineItem = { description: string; quantity: number; unit_price: number };

export type InvoiceCreate = {
  project_id: string;
  // Itemized, or a single amount with a description (older callers).
  line_items?: LineItem[];
  amount?: number;
  tax_rate?: number;
  description?: string;
  customer_email?: string;
  bill_to_name?: string;
  issue_date?: string;
  due_date?: string;
  notes?: string;
};

export type PaymentMethod = "CARD" | "CHECK" | "WIRE" | "CASH" | "OTHER";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: "Card (paid online)",
  CHECK: "Check",
  WIRE: "Bank transfer / wire",
  CASH: "Cash",
  OTHER: "Recorded by GG HighTech",
};

// Matches the number printed on the receipt PDF (app/services/pdf.py).
export const receiptNumber = (invoiceId: string) => `R-${invoiceId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

export const approveMilestone = (token: string, milestoneId: string) =>
  request<InvoiceOut>(`/api/v1/milestones/${milestoneId}/approve`, { method: "POST", token });

export const listInvoices = (token: string, projectId?: string) =>
  request<InvoiceOut[]>(`/api/v1/invoices${projectId ? `?project_id=${projectId}` : ""}`, { token });

// Staff-only, ad-hoc — not tied to a milestone. The server computes the
// totals from the line items and tax rate.
export const createInvoice = (token: string, payload: InvoiceCreate) =>
  request<InvoiceOut>("/api/v1/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });

// Invoice and receipt PDFs need the session token, which a plain <a href>
// can't send — so fetch with the header and hand the browser a blob.
async function downloadAuthedPdf(token: string, path: string, filename: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? "Could not download the PDF");
  }
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const downloadInvoicePdf = (token: string, invoiceId: string, number?: string | null) =>
  downloadAuthedPdf(token, `/api/v1/invoices/${invoiceId}/pdf`, `gghightech-invoice-${number ?? invoiceId}.pdf`);

// Staff-only: emails the invoice PDF with a pay-online link; also resends.
export const sendInvoice = (token: string, invoiceId: string) =>
  request<{ invoice: InvoiceOut; email_sent: boolean; checkout_url: string | null }>(
    `/api/v1/invoices/${invoiceId}/send`,
    { method: "POST", token },
  );

// ---- Contracts ----

export type ContractStatus = "DRAFT" | "SENT" | "SIGNED" | "VOID";
export type PaymentStep = { label: string; amount: number; due: string };

export type ContractFields = {
  title: string;
  client_name: string;
  client_email: string | null;
  effective_date: string | null;
  scope: string;
  deliverables: string[];
  timeline: string | null;
  payment_schedule: PaymentStep[];
  total_value: number;
  payment_terms: string | null;
  terms: string;
};

export type ContractOut = ContractFields & {
  id: string;
  org_id: string;
  project_id: string;
  contract_number: string | null;
  status: ContractStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  sent_at: string | null;
  provider_signer_name: string | null;
  signed_at: string | null;
  signer_name: string | null;
  signer_email: string | null;
  signed_content_hash: string | null;
  voided_at: string | null;
};

export const listContracts = (token: string, projectId?: string) =>
  request<ContractOut[]>(`/api/v1/contracts${projectId ? `?project_id=${projectId}` : ""}`, { token });

export const getContractDefaults = (token: string) =>
  request<{ terms: string; payment_terms: string }>("/api/v1/contracts/defaults", { token });

export const createContract = (token: string, payload: ContractFields & { project_id: string }) =>
  request<ContractOut>("/api/v1/contracts", { method: "POST", body: JSON.stringify(payload), token });

// Editing a SENT contract returns it to DRAFT (it must be sent again).
export const updateContract = (token: string, id: string, payload: Partial<ContractFields>) =>
  request<ContractOut>(`/api/v1/contracts/${id}`, { method: "PATCH", body: JSON.stringify(payload), token });

export const sendContract = (token: string, id: string) =>
  request<{ contract: ContractOut; email_sent: boolean }>(`/api/v1/contracts/${id}/send`, { method: "POST", token });

// CLIENT_ADMIN only.
export const signContract = (token: string, id: string, signerName: string) =>
  request<ContractOut>(`/api/v1/contracts/${id}/sign`, {
    method: "POST",
    body: JSON.stringify({ signer_name: signerName, agree: true }),
    token,
  });

export const voidContract = (token: string, id: string) =>
  request<ContractOut>(`/api/v1/contracts/${id}/void`, { method: "POST", token });

export const deleteContract = (token: string, id: string) =>
  request<void>(`/api/v1/contracts/${id}`, { method: "DELETE", token });

export const downloadContractPdf = (token: string, contract: Pick<ContractOut, "id" | "contract_number">) =>
  downloadAuthedPdf(
    token,
    `/api/v1/contracts/${contract.id}/pdf`,
    `gghightech-agreement-${contract.contract_number ?? contract.id}.pdf`,
  );

// Only for PAID invoices — the API answers 409 otherwise.
export const downloadReceiptPdf = (token: string, invoiceId: string) =>
  downloadAuthedPdf(token, `/api/v1/invoices/${invoiceId}/receipt`, `gghightech-receipt-${receiptNumber(invoiceId)}.pdf`);

export const payInvoice = (token: string, invoiceId: string) =>
  request<{ checkout_url: string }>(`/api/v1/invoices/${invoiceId}/pay`, { method: "POST", token });

// Staff-only: a payment made outside Stripe. CARD is reserved for the
// Stripe webhook.
export const markInvoicePaid = (
  token: string,
  invoiceId: string,
  payload: { payment_method: Exclude<PaymentMethod, "CARD">; payment_reference?: string } = { payment_method: "OTHER" },
) =>
  request<InvoiceOut>(`/api/v1/invoices/${invoiceId}/mark-paid`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });

// One-time payment path — this invoice is never a SubscriptionPlan. Staff-
// initiated (unlike payInvoice above, which is the client's own self-serve
// pay button): creates a Stripe Checkout session and emails the link to
// the invoice's stored customer_email. Also callable again to resend.
export const sendInvoicePaymentLink = (token: string, invoiceId: string) =>
  request<{ checkout_url: string }>(`/api/v1/invoices/${invoiceId}/send-payment-link`, {
    method: "POST",
    token,
  });

// ---- Email Server (SUPER_ADMIN; proxied to the Java service) ----

export type DnsRecord = { purpose: string; type: string; name: string; value: string; hint: string };
export type RecordCheck = { purpose: string; name: string; ok: boolean; found: string[]; problem: string | null };

export type EmailDomain = {
  id: string;
  name: string;
  status: "PENDING_DNS" | "VERIFIED";
  createdAt: string;
  createdBy: string | null;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  dnsRecords: DnsRecord[];
  lastCheck: RecordCheck[];
  activeAccounts: number;
};

export type SmtpAccount = {
  id: string;
  domainId: string;
  address: string;
  description: string | null;
  status: "ACTIVE" | "REVOKED";
  createdAt: string;
  createdBy: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
};

// Returned once, at creation: the password can't be retrieved again.
export type NewSmtpCredential = {
  account: SmtpAccount;
  smtpHost: string;
  smtpPort: number;
  security: string;
  username: string;
  password: string;
};

export type EmailMessage = {
  mailId: string;
  messageId: string | null;
  account: string | null;
  domain: string | null;
  sender: string | null;
  recipients: string[];
  status: string;
  firstSeen: string;
  lastUpdate: string;
  history: { event: string; at: string; error: string | null }[];
};

export type EmailOverview = {
  domains: number;
  verifiedDomains: number;
  activeAccounts: number;
  last24h: Record<string, number>;
  smtpHost: string | null;
  smtpPort: number;
};

const EMAIL = "/api/v1/email-server";

export const emailServerStatus = (token: string) => request<{ enabled: boolean }>(`${EMAIL}/status`, { token });

export const emailOverview = (token: string) => request<EmailOverview>(`${EMAIL}/overview`, { token });

export const listEmailDomains = (token: string) => request<EmailDomain[]>(`${EMAIL}/domains`, { token });

export const addEmailDomain = (token: string, name: string) =>
  request<EmailDomain>(`${EMAIL}/domains`, { method: "POST", token, body: JSON.stringify({ name }) });

export const verifyEmailDomain = (token: string, domainId: string) =>
  request<EmailDomain>(`${EMAIL}/domains/${domainId}/verify`, { method: "POST", token });

export const deleteEmailDomain = (token: string, domainId: string) =>
  request<void>(`${EMAIL}/domains/${domainId}`, { method: "DELETE", token });

export const listSmtpAccounts = (token: string, domainId: string) =>
  request<SmtpAccount[]>(`${EMAIL}/domains/${domainId}/accounts`, { token });

export const createSmtpAccount = (token: string, domainId: string, localPart: string, description?: string) =>
  request<NewSmtpCredential>(`${EMAIL}/domains/${domainId}/accounts`, {
    method: "POST",
    token,
    body: JSON.stringify({ local_part: localPart, description: description || undefined }),
  });

export const revokeSmtpAccount = (token: string, accountId: string) =>
  request<SmtpAccount>(`${EMAIL}/accounts/${accountId}/revoke`, { method: "POST", token });

export const listEmailMessages = (token: string, domain?: string) =>
  request<EmailMessage[]>(`${EMAIL}/messages${domain ? `?domain=${encodeURIComponent(domain)}` : ""}`, { token });

// ---- Instant payments (staff-only: email + amount → Stripe link) ----

export type InstantPaymentOut = {
  id: string;
  customer_email: string;
  amount: number;
  description: string | null;
  status: string;
  checkout_url: string | null;
  created_by: string | null;
  created_at: string;
  paid_at: string | null;
};

export type InstantPaymentSent = {
  payment: InstantPaymentOut;
  checkout_url: string;
  email_sent: boolean;
};

export const listInstantPayments = (token: string) =>
  request<InstantPaymentOut[]>("/api/v1/instant-payments", { token });

export const createInstantPayment = (
  token: string,
  body: { customer_email: string; amount: number; description?: string },
) =>
  request<InstantPaymentSent>("/api/v1/instant-payments", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });

export const resendInstantPayment = (token: string, paymentId: string) =>
  request<InstantPaymentSent>(`/api/v1/instant-payments/${paymentId}/resend`, { method: "POST", token });

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

export type UserOut = {
  id: string;
  org_id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
};

export const inviteUser = (
  token: string,
  payload: { org_id: string; email: string; full_name: string; role: string },
) =>
  request<UserOut>("/api/v1/users/invite", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });

export const listUsers = (token: string) => request<UserOut[]>("/api/v1/users", { token });

export const deleteUser = (token: string, userId: string) =>
  request<void>(`/api/v1/users/${userId}`, { method: "DELETE", token });

// ---- Jira ticket creation ----
// Outbound only — writes a real issue into Jira via
// backend-fastapi/app/services/jira_service.py's create_issue. 503s until
// JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN are all set server-side, same as
// syncProjectJira. This is a local record of tickets created *through this
// tool*, not a live mirror of the project's Jira backlog.

export type JiraTicketOut = {
  id: string;
  project_id: string;
  org_id: string;
  jira_issue_key: string;
  jira_url: string;
  summary: string;
  description: string | null;
  issue_type: string;
  created_by_email: string | null;
  created_at: string;
};

export const listJiraTickets = (token: string, projectId: string) =>
  request<JiraTicketOut[]>(`/api/v1/projects/${projectId}/jira-tickets`, { token });

export const createJiraTicket = (
  token: string,
  projectId: string,
  payload: { summary: string; description: string; issue_type?: string },
) =>
  request<JiraTicketOut>(`/api/v1/projects/${projectId}/jira-tickets`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });

// ---- Subscriptions / recurring billing plans ----
// Plans can create a Stripe-hosted recurring Checkout link. Manual invoice
// generation remains available for clients paying outside Stripe.

export type SubscriptionPlanOut = {
  id: string;
  org_id: string;
  project_id: string | null;
  name: string;
  amount: number;
  billing_frequency: "MONTHLY" | "ANNUAL";
  is_subscription: boolean;
  billing_day: number | null;
  customer_email: string | null;
  // ACTIVE | PAUSED | CANCELED | COMPLETED (all payments of a fixed-length plan made)
  status: string;
  // Fixed length in billing periods (months/years); null = until canceled.
  total_cycles: number | null;
  cycles_billed: number;
  stripe_subscription_id: string | null;
  created_at: string;
  last_invoiced_at: string | null;
};

export const listSubscriptionPlans = (token: string, orgId?: string) =>
  request<SubscriptionPlanOut[]>(`/api/v1/subscriptions${orgId ? `?org_id=${orgId}` : ""}`, { token });

export const createSubscriptionPlan = (
  token: string,
  payload: {
    org_id: string;
    project_id?: string;
    name: string;
    amount: number;
    billing_frequency: "MONTHLY" | "ANNUAL";
    is_subscription: boolean;
    billing_day?: number;
    customer_email?: string;
    total_cycles?: number;
  },
) =>
  request<SubscriptionPlanOut>("/api/v1/subscriptions", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });

export const updateSubscriptionPlan = (
  token: string,
  planId: string,
  payload: Partial<{ name: string; amount: number; billing_day: number; customer_email: string; status: string }>,
) =>
  request<SubscriptionPlanOut>(`/api/v1/subscriptions/${planId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });

export const generateSubscriptionInvoice = (token: string, planId: string) =>
  request<InvoiceOut>(`/api/v1/subscriptions/${planId}/generate-invoice`, { method: "POST", token });

export const createSubscriptionCheckout = (token: string, planId: string) =>
  request<{ checkout_url: string }>(`/api/v1/subscriptions/${planId}/checkout`, { method: "POST", token });

// ---- Client reviews ----
// Public side: anyone can submit (no email verification) and read published
// reviews. The reviewer's email is collected for staff follow-up only and is
// never returned by the public endpoints — hence two types below.

export type ReviewPublic = {
  id: string;
  name: string;
  rating: number;
  message: string;
  is_featured: boolean;
  created_at: string;
};

export type ReviewSummary = {
  average: number | null; // null until there's at least one published review
  count: number;
  breakdown: Record<string, number>; // "5".."1" -> how many reviews gave that rating
};

export type ReviewStatus = "PENDING" | "PUBLISHED" | "HIDDEN";

export type ReviewAdmin = ReviewPublic & {
  email: string;
  status: ReviewStatus;
  moderated_at: string | null;
  moderated_by: string | null;
};

export const listReviews = (limit = 50, offset = 0) =>
  request<ReviewPublic[]>(`/api/v1/reviews?limit=${limit}&offset=${offset}`);

// Staff-featured reviews, or recent 4-5 star ones until something is featured.
export const listReviewHighlights = (limit = 3) =>
  request<ReviewPublic[]>(`/api/v1/reviews/highlights?limit=${limit}`);

export const getReviewSummary = () => request<ReviewSummary>("/api/v1/reviews/summary");

// `website` is the form's hidden spam-trap field — always sent, always
// empty for a real visitor (see components/ReviewForm.tsx).
export const submitReview = (payload: {
  name: string;
  email: string;
  rating: number;
  message: string;
  website: string;
}) =>
  request<{ status: ReviewStatus }>("/api/v1/reviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const listAllReviews = (token: string) => request<ReviewAdmin[]>("/api/v1/reviews/admin", { token });

export const moderateReview = (
  token: string,
  reviewId: string,
  payload: Partial<{ status: ReviewStatus; is_featured: boolean }>,
) =>
  request<ReviewAdmin>(`/api/v1/reviews/${reviewId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });

export const deleteReview = (token: string, reviewId: string) =>
  request<void>(`/api/v1/reviews/${reviewId}`, { method: "DELETE", token });

// ---- Contact messages ----
// Sent from the Contact page and the floating message button; read by staff
// in the admin Messages tab. Never shown publicly.

export type MessageStatus = "NEW" | "READ" | "ARCHIVED";
export type MessageSource = "CONTACT_PAGE" | "WIDGET";

export type ContactMessageAdmin = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  source: MessageSource;
  status: MessageStatus;
  created_at: string;
  handled_at: string | null;
  handled_by: string | null;
};

// `website` is the form's hidden spam-trap field — always sent, always
// empty for a real visitor (see components/ContactForm.tsx).
export const sendContactMessage = (payload: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  source: MessageSource;
  website: string;
}) =>
  request<{ ok: boolean }>("/api/v1/messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const listMessages = (token: string) => request<ContactMessageAdmin[]>("/api/v1/messages/admin", { token });

export const getUnreadMessageCount = (token: string) =>
  request<{ unread: number }>("/api/v1/messages/admin/unread-count", { token });

export const updateMessageStatus = (token: string, messageId: string, status: MessageStatus) =>
  request<ContactMessageAdmin>(`/api/v1/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    token,
  });

export const deleteMessage = (token: string, messageId: string) =>
  request<void>(`/api/v1/messages/${messageId}`, { method: "DELETE", token });
