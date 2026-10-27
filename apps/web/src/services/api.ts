let csrfTokenMemory = '';

export function setCsrfToken(token: string) {
  csrfTokenMemory = token;
}

export function getCsrfToken(): string {
  return csrfTokenMemory;
}

const API_BASE_URL = String((import.meta as any).env?.VITE_API_URL || '').replace(/\/+$/, '');

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (csrfTokenMemory && options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
    headers.set('X-CSRF-Token', csrfTokenMemory);
  }

  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/me') {
      csrfTokenMemory = '';
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('svss:session-expired', {
            detail: {
              error: errBody.error || 'SESSION_EXPIRED',
              message:
                errBody.message ||
                'आपका सत्र समाप्त हो गया है। कृपया दोबारा लॉगिन करें। (Your session has expired. Please sign in again.)',
            },
          })
        );
      }
    }
    throw new Error(errBody.message || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}
