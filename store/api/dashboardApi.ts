import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type { DashboardBaseline } from '@/lib/types';

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardBaseline: builder.query<DashboardBaseline, void>({
      query: () => routePath(apiRoutes.dashboard.root, apiRoutes.dashboard.getSummary),
      providesTags: ['DashboardBaseline'],
    }),
  }),
});

export const { useGetDashboardBaselineQuery } = dashboardApi;
