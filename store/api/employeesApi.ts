import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type { Employee, Team } from '@/lib/types';

export const employeesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmployees: builder.query<{ teams: Team[]; employees: Employee[] }, void>({
      query: () => routePath(apiRoutes.employees.root, apiRoutes.employees.getList),
      providesTags: ['Employees'],
    }),
  }),
});

export const { useGetEmployeesQuery } = employeesApi;
