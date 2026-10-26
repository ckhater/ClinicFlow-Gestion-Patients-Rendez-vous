import type { ApiErrorBody, ValidationIssue } from "@clinic/shared";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(
  /\/$/,
  "",
);

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: ValidationIssue[];
  public readonly requestId?: string;

  constructor(status: number, body: ApiErrorBody | null, fallback: string) {
    super(body?.error.message ?? fallback);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.error.code ?? "UNKNOWN_ERROR";
    this.details = body?.error.details;
    this.requestId = body?.error.requestId;
  }
}

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

async function fetchCsrfToken(force = false): Promise<string> {
  if (csrfToken && !force) return csrfToken;
  if (csrfRequest && !force) return csrfRequest;

  csrfRequest = (async () => {
    const response = await fetch(`${API_URL}/auth/csrf`, {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new ApiError(response.status, null, "Could not initialize a secure session");
    }
    const payload = (await response.json()) as { data: { csrfToken: string } };
    csrfToken = payload.data.csrfToken;
    return csrfToken;
  })();

  try {
    return await csrfRequest;
  } finally {
    csrfRequest = null;
  }
}

export function resetCsrfToken(): void {
  csrfToken = null;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

function isMutating(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method);
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const mutating = isMutating(method);
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  const execute = async (): Promise<Response> => {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    if (mutating) {
      headers.set("X-CSRF-Token", await fetchCsrfToken());
    }

    return fetch(url, {
      ...options,
      method,
      headers,
      credentials: "include",
      cache: "no-store",
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  };

  let response = await execute();

  if (mutating && response.status === 403) {
    const body = (await parseBody(response.clone())) as ApiErrorBody | null;
    if (body?.error.code === "CSRF_TOKEN_INVALID" || body?.error.code === "CSRF_TOKEN_MISSING") {
      csrfToken = null;
      await fetchCsrfToken(true);
      response = await execute();
    }
  }

  const body = await parseBody(response);

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    if (
      response.status === 401 &&
      !path.startsWith("/auth/login") &&
      !path.startsWith("/auth/csrf")
    ) {
      window.dispatchEvent(new CustomEvent("clinic:unauthorized"));
    }
    throw new ApiError(response.status, errorBody, `Request failed with status ${response.status}`);
  }

  return body as T;
}

export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.details && error.details.length > 0) {
      return error.details.map((detail) => detail.message).join(". ");
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
