// Small wrapper around fetch: adds the login token and turns error responses into Errors.
// The token is kept in sessionStorage, so it disappears when the tab is closed.
// (A real app would use an httpOnly cookie instead.)
const SERVER_DOWN = 'Cannot reach the API server. Start it with "npm run server" and try again.';

let token = sessionStorage.getItem('token');
let onUnauthorized = () => {};

export const getToken = () => token;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };
export function setToken(value) {
  token = value;
  if (value) sessionStorage.setItem('token', value); else sessionStorage.removeItem('token');
}

export async function request(method, url, { json, form, raw = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`/api${url}`, { method, headers, body: json ? JSON.stringify(json) : form });
  } catch {
    throw new Error(SERVER_DOWN);
  }
  if (res.status === 401 && !url.startsWith('/auth/login')) onUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // A 5xx without a JSON body comes from the dev proxy: the API server is not running
    const message = body.error ?? (res.status >= 500 ? SERVER_DOWN : `Request failed (${res.status})`);
    throw Object.assign(new Error(message), { status: res.status });
  }
  if (raw) return res;
  return res.status === 204 ? null : res.json();
}
