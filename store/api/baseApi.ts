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
 * Signs the user out when the backend rejects the token (expired/revoked/forged).
 * The token is cleared here, then a DOM event is dispatched: this runs outside
 * React, so it can't call `signOut()` directly, and importing AuthContext would
 * create a cycle — AuthContext listens for the event and drops its user.
 *
 * `login` is exempt: a 401 there means "wrong password" and belongs to the login
 * form, not a session that doesn't exist yet.
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
 * The single RTK Query API: an empty `createApi` that feature slices extend via
 * `injectEndpoints`. One instance serves both authed and public endpoints —
 * `prepareHeaders` just omits the header when no token is stored (POST
 * /auth/login is the only public route).
 */
export const baseApi = createApi({
  reducerPath: 'convergeApi',
  baseQuery: baseQueryWithAuth,
  // One tag per collection; mutations invalidate the tags they touch to trigger refetches.
  tagTypes: ['Projects', 'Project', 'Tickets', 'Employees', 'TeamPerformance', 'DashboardBaseline', 'Profile', 'ProjectTemplate', 'Notifications', 'MiscTasks', 'Scrum'],
  endpoints: () => ({}),
});
