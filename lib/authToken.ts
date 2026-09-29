/**
 * The bearer token, kept in localStorage and read by RTK Query's
 * prepareHeaders on every request.
 *
 * Deliberately a tiny standalone module rather than React state: the RTK
 * Query base query runs outside the component tree and can't call hooks, so
 * it needs a plain function to read from.
 *
 * Caveat: localStorage is readable by any script on the page, so an XSS can
 * steal this token. An httpOnly cookie is stronger but needs CSRF + same-site
 * handling this split-origin setup (Vercel + the backend host) doesn't have yet.
 */
const TOKEN_KEY = "converge_projects_token_v1";

/**
 * Fired on `window` when the backend rejects the stored token. AuthContext
 * listens and signs the user out — see store/api/baseApi.ts for why this
 * is an event rather than a direct call.
 */
export const UNAUTHORIZED_EVENT = "converge:unauthorized";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string): void {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage unavailable */ }
}

export function clearToken(): void {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
}
