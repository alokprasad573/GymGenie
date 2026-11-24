"use client";

export interface ApiClientError {
  code: string;
  message: string;
  requestId?: string;
  details?: Record<string, string[]>;
}

export class ClientRequestError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, string[]>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ClientRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let inflightRefresh: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (!inflightRefresh) {
    inflightRefresh = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        inflightRefresh = null;
      });
  }
  return inflightRefresh;
}

export async function apiFetch<T>(
  input: string,
  init: RequestInit = {},
  options: { retryOnUnauthorized?: boolean } = {}
): Promise<T> {
  const retryOnUnauthorized = options.retryOnUnauthorized ?? true;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  });

  if (
    response.status === 401 &&
    retryOnUnauthorized &&
    !input.startsWith("/api/auth/")
  ) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return apiFetch<T>(input, init, { retryOnUnauthorized: false });
    }
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errObj =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error?: unknown }).error === "object"
        ? ((payload as { error: ApiClientError }).error)
        : null;

    throw new ClientRequestError(
      response.status,
      errObj?.code ?? "REQUEST_FAILED",
      errObj?.message ?? "Request failed",
      errObj?.details
    );
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}
