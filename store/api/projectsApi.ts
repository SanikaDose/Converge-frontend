import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type {
  Achievement, ChecklistItem, CreateProjectInput, Priority, ProjectDetailData, ProjectIndexRow,
  ProjectType, TaskStatus, UpdateProjectPatch, WeekDay,
} from '@/lib/types';

/**
 * Trimmed task shape the Kanban board fetches (mirrors the backend's
 * `toBoardTask`) — only what a card and the overdue/late/checklist logic read.
 * A drag reloads the project's full detail before saving.
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
/** The board's index feeds only the project-filter dropdowns, so id/name/type
 *  is all it needs — not the full stats + lite arrays the dashboard index ships. */
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
 * Projects endpoints. Invalidation is coarse on purpose: a write touches the
 * portfolio index, that project's document, and the dashboard baseline, so each
 * mutation invalidates all three.
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
     * Everything the Kanban board needs (index + per-project details) from one
     * bulk endpoint, replacing the old fetch-index-then-one-request-per-project
     * fan-out. See the backend's `findAllBoard`.
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
