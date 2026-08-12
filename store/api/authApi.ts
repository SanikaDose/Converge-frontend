import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type { AuthedUser } from '@/lib/types';

/**
 * Sign-in. A mutation rather than a query: it isn't cacheable and must
 * only run when the user submits the form.
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthedUser, { employeeCode: string; password: string }>({
      query: (body) => ({
        url: routePath(apiRoutes.auth.root, apiRoutes.auth.login),
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useLoginMutation } = authApi;
