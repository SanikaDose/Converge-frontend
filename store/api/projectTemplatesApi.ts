import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type { PhaseTemplateItem } from '@/lib/types';

/**
 * The master project template — the phases and default tasks new projects are
 * built from. Reading is open to any signed-in user (the create form previews
 * it); the mutations are admin-only and enforced server-side. Every mutation
 * returns the whole updated template, so the cache is replaced from the
 * response rather than refetched.
 */
export const projectTemplatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProjectTemplate: builder.query<PhaseTemplateItem[], void>({
      query: () => routePath(apiRoutes.projectTemplates.root, apiRoutes.projectTemplates.get),
      providesTags: ['ProjectTemplate'],
    }),

    addTemplateTask: builder.mutation<PhaseTemplateItem[], { phaseId: string; name: string; dayOffset: number; duration: number }>({
      query: ({ phaseId, ...body }) => ({
        url: routePath(apiRoutes.projectTemplates.root, apiRoutes.projectTemplates.addTask(phaseId)),
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ProjectTemplate'],
    }),

    updateTemplateTask: builder.mutation<PhaseTemplateItem[], { taskId: string; name?: string; dayOffset?: number; duration?: number; order?: number }>({
      query: ({ taskId, ...body }) => ({
        url: routePath(apiRoutes.projectTemplates.root, apiRoutes.projectTemplates.updateTask(taskId)),
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['ProjectTemplate'],
    }),

    deleteTemplateTask: builder.mutation<PhaseTemplateItem[], { taskId: string }>({
      query: ({ taskId }) => ({
        url: routePath(apiRoutes.projectTemplates.root, apiRoutes.projectTemplates.deleteTask(taskId)),
        method: 'DELETE',
      }),
      invalidatesTags: ['ProjectTemplate'],
    }),
  }),
});

export const {
  useGetProjectTemplateQuery,
  useAddTemplateTaskMutation,
  useUpdateTemplateTaskMutation,
  useDeleteTemplateTaskMutation,
} = projectTemplatesApi;
