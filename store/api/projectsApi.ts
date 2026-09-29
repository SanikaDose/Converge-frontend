import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type {
  Achievement, ChecklistItem, CreateProjectInput, Priority, ProjectDetailData, ProjectIndexRow,
  ProjectType, TaskStatus, UpdateProjectPatch, WeekDay,
} from '@/lib/types';

/**
 * The trimmed task shape the Kanban board fetches (see the backend's
 * `toBoardTask`) — only the fields a card, the overdue/late math, and the
 * complete-blocked-by-checklist gate read. The heavy jsonb (history/
 * dependencies/pendingChange) and description/scheduling internals are omitted;
 * a drag reloads the one project's full detail before persisting, so nothing is
 * lost by trimming here.
 */
export interface BoardTaskData {
  id: string;
  phaseId: string;
  name: string;
  status: TaskStatus;
  priority: Priority;
  assignees: string[];
  plannedStart: string;
  plannedFinish: string;
  actualFinish: string | null;
  achievement: Achievement | null;
  checklist: ChecklistItem[];
}
export interface BoardProjectData {
  id: string;
  meta: { name: string; type: ProjectType; weekOff: WeekDay[] };
  phases: { id: string; name: string; notRequired: boolean }[];
  tasks: BoardTaskData[];
}
/**
 * The board's index is only used for the project-filter dropdowns and their
 * labels, so it carries just id/name/type — not the full portfolio stats +
 * `taskLite`/`phasesLite` the dashboard index (`ProjectIndexRow`) ships, which
 * were ~35% of the board payload and unused by the Kanban.
 */
export interface BoardIndexRow {
  id: string;
  name: string;
  type: ProjectType;
}
export interface BoardData {
  index: BoardIndexRow[];
  details: BoardProjectData[];
}

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
     * The portfolio Kanban needs every project's full task list. This used to
     * fetch the index and then one detail request per project — `1 + N` HTTP
     * round trips (28 for 27 projects), each paying the remote-DB latency,
     * which was the main reason the Kanban was slow to load. It now hits a
     * single bulk endpoint (`GET /projects/board`) that returns the index and
     * every project's details together, computed server-side from three DB
     * queries. One request, one cache entry, one loading flag.
     */
    getProjectsWithDetails: builder.query<BoardData, void>({
      query: () => routePath(apiRoutes.projects.root, apiRoutes.projects.board),
      providesTags: ['Projects'],
    }),

    createProject: builder.mutation<ProjectDetailData, CreateProjectInput>({
      query: (body) => ({
        url: routePath(apiRoutes.projects.root, apiRoutes.projects.create),
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Projects', 'DashboardBaseline', 'Notifications'],
    }),

    updateProject: builder.mutation<ProjectDetailData, { id: string; patch: UpdateProjectPatch }>({
      query: ({ id, patch }) => ({
        url: routePath(apiRoutes.projects.root, apiRoutes.projects.updateById(id)),
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_result, _error, { id }) => ['Projects', 'DashboardBaseline', 'Notifications', { type: 'Project' as const, id }],
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
