import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type { CreateProjectInput, ProjectDetailData, ProjectIndexRow, UpdateProjectPatch } from '@/lib/types';

/**
 * Projects endpoints, injected into the shared baseApi (Scout's
 * `injectEndpoints` convention).
 *
 * Invalidation is deliberately coarse: a project write touches the
 * portfolio index, that project's document, and the dashboard baseline's
 * inputs, so each mutation invalidates all three rather than trying to be
 * clever. These are small payloads and the refetch is what the manual
 * `refreshKey` prop-threading used to do by hand.
 */
export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<ProjectIndexRow[], void>({
      query: () => routePath(apiRoutes.projects.root, apiRoutes.projects.getList),
      providesTags: ['Projects'],
    }),

    getProject: builder.query<ProjectDetailData, string>({
      query: (id) => routePath(apiRoutes.projects.root, apiRoutes.projects.getById(id)),
      // Tagged per id so updating one project doesn't refetch every other
      // project detail that happens to be cached.
      providesTags: (_result, _error, id) => [{ type: 'Project' as const, id }],
    }),

    /**
     * The portfolio Kanban needs every project's full task list, which is
     * the index plus one detail fetch per project. `queryFn` keeps that
     * fan-out as a single cached query rather than a `Promise.all` living
     * in the page's effect — same requests, but one cache entry, one
     * loading flag, and a refetch that the Refresh button and tag
     * invalidation can both drive.
     */
    getProjectsWithDetails: builder.query<{ index: ProjectIndexRow[]; details: ProjectDetailData[] }, void>({
      async queryFn(_arg, _api, _opts, fetchWithBQ) {
        const indexResult = await fetchWithBQ(routePath(apiRoutes.projects.root, apiRoutes.projects.getList));
        if (indexResult.error) return { error: indexResult.error };
        const index = indexResult.data as ProjectIndexRow[];

        const detailResults = await Promise.all(
          index.map((p) => fetchWithBQ(routePath(apiRoutes.projects.root, apiRoutes.projects.getById(p.id)))),
        );
        const failed = detailResults.find((r) => r.error);
        if (failed?.error) return { error: failed.error };

        return { data: { index, details: detailResults.map((r) => r.data as ProjectDetailData) } };
      },
      providesTags: ['Projects'],
    }),

    createProject: builder.mutation<ProjectDetailData, CreateProjectInput>({
      query: (body) => ({
        url: routePath(apiRoutes.projects.root, apiRoutes.projects.create),
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Projects', 'DashboardBaseline'],
    }),

    updateProject: builder.mutation<ProjectDetailData, { id: string; patch: UpdateProjectPatch }>({
      query: ({ id, patch }) => ({
        url: routePath(apiRoutes.projects.root, apiRoutes.projects.updateById(id)),
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_result, _error, { id }) => ['Projects', 'DashboardBaseline', { type: 'Project' as const, id }],
    }),

    deleteProject: builder.mutation<{ id: string }, string>({
      query: (id) => ({
        url: routePath(apiRoutes.projects.root, apiRoutes.projects.deleteById(id)),
        method: 'DELETE',
      }),
      invalidatesTags: ['Projects', 'DashboardBaseline'],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useLazyGetProjectsQuery,
  useGetProjectQuery,
  useLazyGetProjectQuery,
  useGetProjectsWithDetailsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} = projectsApi;
