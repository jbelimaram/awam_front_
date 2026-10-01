const API_URL = import.meta.env.VITE_API_URL;

interface RequestOptions extends RequestInit {
  body?: any;
}

/**
 * Transforme le `detail` d'une erreur du back en message lisible.
 *  - texte (erreurs 400, 401, 404, 409…) : renvoyé tel quel ;
 *  - liste (erreur 422 de validation FastAPI/Pydantic) : on garde le `msg`
 *    de chaque élément, sans le préfixe « Value error, » ajouté par Pydantic.
 */
export function formatErrorDetail(detail: unknown, fallback = 'Une erreur est survenue.'): string {
  if (typeof detail === 'string') return detail || fallback;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        item && typeof item === 'object' && typeof (item as { msg?: unknown }).msg === 'string'
          ? (item as { msg: string }).msg.replace(/^Value error, /, '')
          : null
      )
      .filter((msg): msg is string => Boolean(msg));
    return messages.length > 0 ? messages.join(' ') : fallback;
  }

  return detail ? JSON.stringify(detail) : fallback;
}

class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(formatErrorDetail(detail));
    this.status = status;
    this.detail = detail;
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
    throw new ApiError(
      response.status,
      errorData?.detail || 'Une erreur est survenue.'
    );
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
  patch: <T>(endpoint: string, body?: any): Promise<T> =>
  request<T>(endpoint, { method: 'PATCH', body }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

export { ApiError };