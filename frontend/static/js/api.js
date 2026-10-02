const API_BASE = "/api";

const Api = {
  token: localStorage.getItem("fm_token") || null,
  user: JSON.parse(localStorage.getItem("fm_user") || "null"),

  setSession(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem("fm_token", token);
    localStorage.setItem("fm_user", JSON.stringify(user));
  },
  clearSession() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("fm_token");
    localStorage.removeItem("fm_user");
  },
  async request(method, path, data) {
    const opts = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (this.token) opts.headers["Authorization"] = "Bearer " + this.token;
    if (data !== undefined) opts.body = JSON.stringify(data);
    let res;
    try {
      res = await fetch(API_BASE + path, opts);
    } catch (e) {
      throw new Error("Network error — is the backend server running?");
    }
    if (res.status === 401) {
      Api.clearSession();
      window.location.reload();
      throw new Error("Session expired");
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return res; // e.g. csv download
    }
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Request failed");
    return json;
  },
  get(path) { return this.request("GET", path); },
  post(path, data) { return this.request("POST", path, data); },
  put(path, data) { return this.request("PUT", path, data); },
  del(path) { return this.request("DELETE", path); },
};
