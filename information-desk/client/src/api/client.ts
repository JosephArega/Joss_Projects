import type {
  Admin,
  AdminCategory,
  AdminService,
  AuditPage,
  CategoryInput,
  FieldError,
  PortalPayload,
  ServiceInput,
} from './types';

const CSRF_COOKIE = 'id_csrf';
const CSRF_HEADER = 'X-CSRF-Token';

/** An HTTP failure carrying the server's message and any per-field errors. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: FieldError[];

  constructor(status: number, message: string, code = 'error', fields: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get requiresPasswordChange(): boolean {
    return this.code === 'password_change_required';
  }
}

/**
 * Reads the double-submit CSRF token. The cookie is deliberately not httpOnly
 * so the value can be echoed back in a header; the session JWT itself lives in
 * an httpOnly cookie and is never readable here.
 */
function readCsrfToken(): string | null {
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE.length + 1)) : null;
}

/**
 * Whether the browser is holding session cookies at all.
 *
 * The JWT cookie is httpOnly and unreadable, but it is always issued together
 * with the script-readable CSRF cookie and expires alongside it. Checking for
 * that companion lets the route guard skip a pointless (and console-noisy)
 * 401 round trip for a visitor who was never signed in.
 */
export function hasSessionHint(): boolean {
  return readCsrfToken() !== null;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (method !== 'GET') {
    const csrf = readCsrfToken();
    if (csrf) headers[CSRF_HEADER] = csrf;
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.', 'network');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error ?? `Request failed (${response.status}).`,
      payload?.code ?? 'error',
      payload?.fields ?? [],
    );
  }

  return payload as T;
}

export const api = {
  // --- public -------------------------------------------------------------
  getPortal: (signal?: AbortSignal) => request<PortalPayload>('/services', { signal }),

  // --- auth ---------------------------------------------------------------
  login: (username: string, password: string) =>
    request<{ admin: Admin; csrfToken: string }>('/auth/login', {
      method: 'POST',
      body: { username, password },
    }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ admin: Admin }>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ admin: Admin }>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),

  // --- admin: services ----------------------------------------------------
  listServices: () => request<{ services: AdminService[] }>('/admin/services'),
  createService: (input: ServiceInput) =>
    request<{ service: AdminService }>('/admin/services', { method: 'POST', body: input }),
  updateService: (id: string, input: Partial<ServiceInput>) =>
    request<{ service: AdminService }>(`/admin/services/${id}`, { method: 'PUT', body: input }),
  deleteService: (id: string) =>
    request<{ service: AdminService }>(`/admin/services/${id}`, { method: 'DELETE' }),
  reorderServices: (ids: string[]) =>
    request<{ services: AdminService[] }>('/admin/services/reorder', {
      method: 'PUT',
      body: { ids },
    }),

  // --- admin: categories --------------------------------------------------
  listCategories: () => request<{ categories: AdminCategory[] }>('/admin/categories'),
  createCategory: (input: CategoryInput) =>
    request<{ category: AdminCategory }>('/admin/categories', { method: 'POST', body: input }),
  updateCategory: (id: number, input: Partial<CategoryInput>) =>
    request<{ category: AdminCategory }>(`/admin/categories/${id}`, { method: 'PUT', body: input }),
  deleteCategory: (id: number) =>
    request<{ ok: true; id: number }>(`/admin/categories/${id}`, { method: 'DELETE' }),
  reorderCategories: (ids: number[]) =>
    request<{ categories: AdminCategory[] }>('/admin/categories/reorder', {
      method: 'PUT',
      body: { ids },
    }),

  // --- admin: audit -------------------------------------------------------
  listAudit: (page: number, pageSize: number) =>
    request<AuditPage>(`/admin/audit?page=${page}&pageSize=${pageSize}`),
};
