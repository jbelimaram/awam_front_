const API_URL = import.meta.env.VITE_API_URL;

interface RequestOptions extends RequestInit {
  body?: any;
}

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const AUTH_ENDPOINTS_EXCLUDED_FROM_REDIRECT = ['/auth/login', '/auth/register'];

function handleUnauthorized(endpoint: string): void {
  const isAuthFormEndpoint = AUTH_ENDPOINTS_EXCLUDED_FROM_REDIRECT.some((path) =>
    endpoint.startsWith(path)
  );
  if (isAuthFormEndpoint) return;

  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    let message = 'Une erreur est survenue.';

    if (errorData?.detail) {
      if (typeof errorData.detail === 'string') {
        message = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        message = errorData.detail
          .map((err: { loc?: (string | number)[]; msg: string }) =>
            err.loc ? `${err.loc[err.loc.length - 1]} : ${err.msg}` : err.msg
          )
          .join(' — ');
      }
    }

    if (response.status === 401) {
      handleUnauthorized(endpoint);
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body }),
  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

export { ApiError, handleUnauthorized };