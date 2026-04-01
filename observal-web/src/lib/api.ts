const BASE = "";

async function request(path: string, options: RequestInit = {}) {
  const apiKey = typeof window !== "undefined" ? localStorage.getItem("observal_api_key") : null;
  const headers: Record<string, string> = { ...((options.headers as Record<string, string>) || {}) };
  if (apiKey) headers["X-API-Key"] = apiKey;
  if (options.body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("observal_api_key");
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = body.detail;
    if (Array.isArray(detail)) {
      throw new Error(detail.map((e: any) => `${e.loc?.slice(-1)?.[0] || "field"}: ${e.msg}`).join("; "));
    }
    throw new Error(typeof detail === "string" ? detail : res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) => request(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: (path: string, body: unknown) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  del: (path: string) => request(path, { method: "DELETE" }),
};
