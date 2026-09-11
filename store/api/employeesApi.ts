import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type { Employee, EmployeeInput, Team } from '@/lib/types';

export const employeesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmployees: builder.query<{ teams: Team[]; employees: Employee[] }, void>({
      query: () => routePath(apiRoutes.employees.root, apiRoutes.employees.getList),
      providesTags: ['Employees'],
    }),

    // Admin-only (enforced server-side). All invalidate the directory so every
    // consumer (OrgContext, pickers, the scrum board) refreshes.
    createEmployee: builder.mutation<Employee, EmployeeInput>({
      query: (body) => ({
        url: routePath(apiRoutes.employees.root, apiRoutes.employees.create),
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Employees'],
    }),

    updateEmployee: builder.mutation<Employee, { id: string; patch: Partial<EmployeeInput> }>({
      query: ({ id, patch }) => ({
        url: routePath(apiRoutes.employees.root, apiRoutes.employees.updateById(id)),
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: ['Employees'],
    }),

    // Delete re-authenticates: the admin's password is verified server-side.
    deleteEmployee: builder.mutation<{ id: string }, { id: string; password: string }>({
      query: ({ id, password }) => ({
        url: routePath(apiRoutes.employees.root, apiRoutes.employees.deleteById(id)),
        method: 'DELETE',
        body: { password },
      }),
      invalidatesTags: ['Employees'],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} = employeesApi;
