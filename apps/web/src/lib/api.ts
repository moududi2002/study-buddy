// ============================================================
// Path: apps/web/src/lib/api.ts
// ============================================================

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// In-memory access token (set by auth store)
let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiSuccess<{ accessToken: string }>;
    accessToken = json.data.accessToken;
    return accessToken;
  } catch {
    return null;
  } finally {
    refreshing = null;
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  retry?: boolean;
  body?: any;
}

export async function apiFetch<T = any>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { skipAuth, retry = true, ...rest } = opts;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((rest.headers as Record<string, string>) || {}),
  };

  if (!skipAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const url = path.startsWith('http') ? path : `${API_URL}${path.startsWith('/') ? path : '/' + path}`;

  const res = await fetch(url, {
    ...rest,
    headers,
    credentials: 'include',
    body:
      rest.body && typeof rest.body === 'object' && !(rest.body instanceof FormData)
        ? JSON.stringify(rest.body)
        : rest.body,
  });

  // Auto-refresh on 401 (once)
  if (res.status === 401 && !skipAuth && retry) {
    if (!refreshing) refreshing = doRefresh();
    const newToken = await refreshing;
    if (newToken) {
      return apiFetch<T>(path, { ...opts, retry: false });
    }
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const err: ApiError = json ?? {
      success: false,
      message: 'সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন',
    };
    throw err;
  }

  return json as T;
}

// Convenience methods
export const api = {
  get: <T = any>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'GET' }),
  post: <T = any>(path: string, body?: any, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'POST', body }),
  patch: <T = any>(path: string, body?: any, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'PATCH', body }),
  del: <T = any>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'DELETE' }),
  upload: async <T = any>(path: string, formData: FormData, opts?: RequestOptions) => {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw json as ApiError;
    return json as ApiSuccess<T>;
  },
};

export { API_URL };