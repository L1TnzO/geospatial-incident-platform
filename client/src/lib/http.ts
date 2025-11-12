type QueryParamValue = string | number | boolean | Array<string | number> | undefined;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, QueryParamValue>;
  authToken?: string | null;
}

export interface HttpErrorBody {
  message?: string;
  code?: string;
  details?: unknown;
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly body?: HttpErrorBody;

  constructor(status: number, message: string, body?: HttpErrorBody) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_TIMEOUT_MS = Number.parseInt(
  resolveEnv(
    () => (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_TIMEOUT_MS,
    '15000',
  ),
  10,
);

function resolveEnv<T>(resolver: () => T | undefined, fallback: T): T {
  try {
    const value = resolver();
    return value === undefined ? fallback : value;
  } catch (error) {
    console.warn('Unable to resolve environment variable from import.meta. Using fallback.', error);
    return fallback;
  }
}

const normalizeBaseUrl = (path: string) => {
  const rawBase = resolveEnv(
    () => (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL,
    '/api',
  );
  const base = rawBase.trim() === '' ? '/api' : rawBase.trim();
  if (base.startsWith('http')) {
    return `${base.replace(/\/?$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${base.replace(/\/?$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
};

const encodeQueryValue = (value: QueryParamValue): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const filtered = value.filter((item) => item !== undefined && item !== null);
    if (filtered.length === 0) {
      return undefined;
    }
    return filtered.join(',');
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
};

const buildUrl = (path: string, query?: Record<string, QueryParamValue>) => {
  const url = new URL(normalizeBaseUrl(path));
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      const encoded = encodeQueryValue(value);
      if (encoded !== undefined) {
        url.searchParams.set(key, encoded);
      }
    });
  }
  return url;
};

const defaultHeaders: Record<string, string> = {
  Accept: 'application/json',
};

const createAbortController = (signal?: AbortSignal, timeoutMs?: number) => {
  if (!timeoutMs && !signal) {
    return { signal: undefined as AbortSignal | undefined, dispose: () => {} };
  }

  const controller = new AbortController();

  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs && Number.isFinite(timeoutMs)) {
    timeoutId = setTimeout(() => {
      controller.abort(new DOMException('Request timed out', 'TimeoutError'));
    }, timeoutMs);
  }

  const dispose = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    signal?.removeEventListener('abort', onAbort);
  };

  return { signal: controller.signal, dispose };
};

export const request = async <TResponse>(path: string, options: RequestOptions = {}) => {
  const { method = 'GET', signal, headers, body, query, authToken, timeoutMs } = options;
  const url = buildUrl(path, query);

  const { signal: derivedSignal, dispose } = createAbortController(
    signal,
    timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  const mergedHeaders: Record<string, string> = {
    ...defaultHeaders,
    ...headers,
  };

  if (authToken) {
    mergedHeaders.Authorization = `Bearer ${authToken}`;
  }

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer) {
      payload = body as BodyInit;
    } else {
      mergedHeaders['Content-Type'] = headers?.['Content-Type'] ?? 'application/json';
      payload = JSON.stringify(body);
    }
  }

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method,
      headers: mergedHeaders,
      body: payload,
      signal: derivedSignal,
      credentials: 'same-origin',
    });
  } finally {
    dispose();
  }

  if (response.ok) {
    if (response.status === 204) {
      return undefined as TResponse;
    }

    const responseContentType = response.headers.get('Content-Type') ?? '';

    if (responseContentType.includes('application/json')) {
      return (await response.json()) as TResponse;
    }

    const text = await response.text();
    return text as unknown as TResponse;
  }

  let parsedBody: HttpErrorBody | undefined;

  try {
    parsedBody = (await response.json()) as HttpErrorBody;
  } catch {
    const text = await response.text();
    parsedBody = text ? { message: text } : undefined;
  }

  const message = parsedBody?.message || `Request failed with status ${response.status}`;
  throw new HttpError(response.status, message, parsedBody);
};

export const http = {
  get: <TResponse>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<TResponse>(path, { ...options, method: 'GET' }),
  post: <TResponse>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<TResponse>(path, { ...options, method: 'POST', body }),
  put: <TResponse>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<TResponse>(path, { ...options, method: 'PUT', body }),
  patch: <TResponse>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<TResponse>(path, { ...options, method: 'PATCH', body }),
  delete: <TResponse>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<TResponse>(path, { ...options, method: 'DELETE' }),
};
