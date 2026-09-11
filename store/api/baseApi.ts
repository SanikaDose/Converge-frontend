import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { apiRoutes } from '@/constants/apiRoutes';
import { UNAUTHORIZED_EVENT, clearToken, getToken } from '@/lib/authToken';

const API_ROOT = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_ROOT}/${apiRoutes.main.root}/`,
  prepareHeaders: (headers) => {
    // Every request carries the bearer token; the backend's global
    // JwtAuthGuard rejects anything without it except POST /auth/login.
    const token = getToken();
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

/**
 * Signs the user out when the backend rejects the token — expired, revoked,
 * or forged. Without this a stale token leaves the app rendering its shell
 * over a wall of failed requests instead of returning to /login.
 *
 * The token is cleared here (this module owns it) and the rest is announced
 * as a DOM event: this base query runs outside React and can't call
 * `signOut()` directly, and importing AuthContext here would make the
 * context and the store import each other. `AuthContext` listens for the
 * event and drops its user, which is what `AuthGate` already redirects on.
 *
 * The login request itself is exempt — a 401 there means "wrong password",
 * and it belongs to the login form's error banner, not to a session that
 * doesn't exist yet.
 */
const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && api.endpoint !== 'login') {
    clearToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
  }

  return result;
};

/**
 * The single RTK Query API, following Scout's `baseProtectedApi` shape:
 * an empty `createApi` that feature slices extend via `injectEndpoints`,
 * plus the `tagTypes` those slices use for cache invalidation.
 *
 * Scout splits this into a public and a protected API because its backend
 * requires a JWT. Converge's backend does too now — a global JwtAuthGuard
 * rejects everything except POST /auth/login. One instance still covers
 * both: `prepareHeaders` simply omits the header when no token is stored,
 * which is exactly what the one public endpoint needs.
 */
export const baseApi = createApi({
  reducerPath: 'convergeApi',
  baseQuery: baseQueryWithAuth,
  /**
   * One tag per collection. Mutations invalidate the tags their write
   * touches, which is what replaced the manual `refreshKey` counters the
   * components used to thread through props to force a refetch.
   */
  tagTypes: ['Projects', 'Project', 'Tickets', 'Employees', 'TeamPerformance', 'DashboardBaseline', 'Profile', 'ProjectTemplate', 'Notifications', 'MiscTasks', 'Scrum'],
  endpoints: () => ({}),
});
