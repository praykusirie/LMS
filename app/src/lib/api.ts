import axios from 'axios';
import type { AxiosError, AxiosInstance } from 'axios';

const BASE_URL = 'http://localhost:8080/api';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

// ── Error normalization ──────────────────────────────────────────────
export interface ApiError {
  status: number;
  message: string;
  data?: unknown;
}

const normalizeError = (error: AxiosError): ApiError => ({
  status: error.response?.status ?? 0,
  message:
    (error.response?.data as { message?: string })?.message ??
    (error.response?.data as { error?: string })?.error ??
    error.message ??
    'An unexpected error occurred',
  data: error.response?.data,
});

// ── Response interceptor ─────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Session expired → redirect to login
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }

    return Promise.reject(normalizeError(error));
  },
);

// ── Request wrapper ──────────────────────────────────────────────────
/**
 * Wraps any async API call and returns `{ data, error }` instead of throwing.
 *
 * Usage:
 * ```ts
 * const { data, error } = await apiRequest(() => api.get('/books'));
 * ```
 */
export async function apiRequest<T = unknown>(
  fn: () => Promise<T>,
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err: unknown) {
    const apiErr = err as ApiError;
    return {
      data: null,
      error: {
        status: apiErr?.status ?? 0,
        message: apiErr?.message ?? 'An unexpected error occurred',
        data: apiErr?.data,
      },
    };
  }
}

export default api;
