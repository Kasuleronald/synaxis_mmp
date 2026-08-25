const API_BASE = "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  // A handler returning `null` (e.g. "no devotional posted for this date
  // yet") comes back as a genuinely empty body, not the literal text
  // "null" -- res.json() throws on that ("Unexpected end of JSON input"),
  // so parse manually and treat empty as null instead.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function upload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  // No Content-Type header here -- the browser sets the multipart boundary
  // itself when the body is a FormData; setting it manually breaks it.
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", credentials: "include", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? "Upload failed");
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload,
};
