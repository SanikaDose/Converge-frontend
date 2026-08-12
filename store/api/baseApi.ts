import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { apiRoutes } from '@/constants/apiRoutes';

const API_ROOT = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * The single RTK Query API, following Scout's `baseProtectedApi` shape:
 * an empty `createApi` that feature slices extend via `injectEndpoints`,
 * plus the `tagTypes` those slices use for cache invalidation.
 *
 * Scout splits this into a public and a protected API because its backend
 * requires a JWT. Converge's backend has no auth guards yet (every data
 * endpoint is open — see the backend's known limitations), so a second
 * "protected" instance that attached no headers would be ceremony without
 * function. `prepareHeaders` below is where the token goes when that lands,
 * and splitting then is a small change.
 */
export const baseApi = createApi({
  reducerPath: 'convergeApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_ROOT}/${apiRoutes.main.root}/`,
    prepareHeaders: (headers) => {
      // Nothing to attach yet — see the note above. Auth headers belong here.
      return headers;
    },
  }),
  /**
   * One tag per collection. Mutations invalidate the tags their write
   * touches, which is what replaced the manual `refreshKey` counters the
   * components used to thread through props to force a refetch.
   */
  tagTypes: ['Projects', 'Project', 'Tickets', 'Employees', 'TeamPerformance', 'DashboardBaseline'],
  endpoints: () => ({}),
});
