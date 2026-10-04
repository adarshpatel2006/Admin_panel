const KEY = "inamigos_token";
export const getToken = () => localStorage.getItem(KEY);
export const setToken = t => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

async function req(path, opts = {}) {
  const res = await fetch("/api" + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(getToken() && { Authorization: "Bearer " + getToken() }) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path !== "/auth/login") { setToken(null); window.dispatchEvent(new Event("logout")); }
    throw new Error(data.error || "Something went wrong");
  }
  return data;
}

export const api = {
  login: (email, password) => req("/auth/login", { method: "POST", body: { email, password } }),
  me: () => req("/auth/me"),
  stats: () => req("/stats"),
  list: (type, q = "") => req(`/${type}${q ? "?q=" + encodeURIComponent(q) : ""}`),
  create: (type, body) => req(`/${type}`, { method: "POST", body }),
  update: (type, id, body) => req(`/${type}/${id}`, { method: "PUT", body }),
  remove: (type, id) => req(`/${type}/${id}`, { method: "DELETE" }),
};
