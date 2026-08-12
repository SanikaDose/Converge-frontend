import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type { TeamPerformanceRow } from '@/lib/types';

export const teamPerformanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTeamPerformance: builder.query<TeamPerformanceRow[], void>({
      query: () => routePath(apiRoutes.teamPerformance.root, apiRoutes.teamPerformance.getList),
      providesTags: ['TeamPerformance'],
    }),
  }),
});

export const { useGetTeamPerformanceQuery } = teamPerformanceApi;
