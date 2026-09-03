import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type { MiscTask, MiscTaskInput } from '@/lib/types';

/**
 * Miscellaneous (ad-hoc) tasks — full CRUD. A standalone resource; it doesn't
 * touch the Projects/Tickets caches. Every mutation invalidates the MiscTasks
 * tag so the list refetches.
 */
export const miscTasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMiscTasks: builder.query<MiscTask[], void>({
      query: () => routePath(apiRoutes.miscTasks.root, apiRoutes.miscTasks.getList),
      providesTags: ['MiscTasks'],
    }),

    createMiscTask: builder.mutation<MiscTask, MiscTaskInput>({
      query: (body) => ({
        url: routePath(apiRoutes.miscTasks.root, apiRoutes.miscTasks.create),
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MiscTasks'],
    }),

    updateMiscTask: builder.mutation<MiscTask, { id: string; patch: Partial<MiscTaskInput> }>({
      query: ({ id, patch }) => ({
        url: routePath(apiRoutes.miscTasks.root, apiRoutes.miscTasks.updateById(id)),
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: ['MiscTasks'],
    }),

    deleteMiscTask: builder.mutation<{ id: string }, string>({
      query: (id) => ({
        url: routePath(apiRoutes.miscTasks.root, apiRoutes.miscTasks.deleteById(id)),
        method: 'DELETE',
      }),
      invalidatesTags: ['MiscTasks'],
    }),
  }),
});

export const {
  useGetMiscTasksQuery,
  useCreateMiscTaskMutation,
  useUpdateMiscTaskMutation,
  useDeleteMiscTaskMutation,
} = miscTasksApi;
