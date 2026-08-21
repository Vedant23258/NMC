import { ApiError } from '@/core/api/errors';
import { appEnv } from '@/core/config/env';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
  token?: string | null;
}

const buildHeaders = (token?: string | null, init?: HeadersInit) => {
  const headers = new Headers(init);
  headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
};

const parseResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

export const httpClient = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);

  try {
    const response = await fetch(`${appEnv.apiBaseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: buildHeaders(options.token, options.headers),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      throw new ApiError(
        typeof payload === 'object' && payload && 'message' in payload
          ? String(payload.message)
          : 'Request failed',
        response.status,
        typeof payload === 'object' && payload && 'code' in payload
          ? String(payload.code)
          : 'http_error',
        payload,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('The request timed out.', 408, 'timeout');
    }
    throw new ApiError('Network request failed.', 0, 'network_error', error);
  } finally {
    clearTimeout(timeout);
  }
};
