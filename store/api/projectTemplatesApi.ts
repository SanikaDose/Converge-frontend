import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type { PhaseDiscipline, PhaseTemplateItem, ProjectTemplateSummary } from '@/lib/types';

/**
 * Named project templates — the phases + default tasks new projects are built
 * from. Reading is open to any signed-in user (the create form previews them);
 * mutations are admin-only, enforced server-side. Template/phase/task mutations
 * return either the template list or a template's phases, and everything is
 * tagged 'ProjectTemplate' so a change refetches both the list and the open
 * template.
 */
export const projectTemplatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // The list of templates (id, name, counts).
    getProjectTemplates: builder.query<ProjectTemplateSummary[], void>({
      query: () => routePath(apiRoutes.projectTemplates.root, apiRoutes.projectTemplates.list),
      providesTags: ['ProjectTemplate'],
    }),

    // One template's phases + tasks.
    getTemplatePhases: builder.query<PhaseTemplateItem[], string>({
      query: (templateId) => routePath(apiRoutes.projectTemplates.root, apiRoutes.projectTemplates.getOne(templateId)),
      providesTags: ['ProjectTemplate'],
    }),

    // ---- template groups ----
    createProjectTemplate: builder.mutation<ProjectTemplateSummary[], { name: string; description?: string; sourceTemplateId?: string }>({
      query: (body) => ({
        url: routePath(apiRoutes.projectTemplates.root, apiRoutes.projectTemplates.create),
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ProjectTemplate'],
    }),
    updateProjectTemplate: builder.mutation<ProjectTemplateSummary[], { templateId: string; name?: string; description?: string }>({
      query: ({ templateId, ...body }) => ({
        url: routePath(apiRoutes.projectTemplates.root, apiRoutes.projectTemplates.updateTemplate(templateId)),
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['ProjectTemplate'],
    }),
    deleteProjectTemplate: builder.mutation<ProjectTemplateSummary[], { templateId: string }>({
      query: ({ templateId }) => ({
        url: routePath(apiRoutes.projectTemplates.root, apiRoutes.projectTemplates.deleteTemplate(templateId)),
        method: 'DELETE',
      }),
      invalidatesTags: ['ProjectTemplate'],
    }),

    // ---- phases ----
    addTemplatePhase: builder.mutation<PhaseTemplateItem[], { templateId: string; name: string; critical?: boolean; discipline?: PhaseDiscipline | null }>({
      query: ({ templateId, ...body }) => ({
        url: routePath(apiRoutes.projectTemplates.root, apiRoutes.projectTemplates.addPhase(templateId)),
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ProjectTemplate'],
    }),
    updateTemplatePhase: builder.mutation<PhaseTemplateItem[], { phaseId: string; name?: string; critical?: boolean; discipline?: PhaseDiscipline | null }>({
      query: ({ phaseId, ...body }) => ({
        url: routePath(apiRoutes.projectTemplates.root, apiRoutes.projectTemplates.updatePhase(phaseId)),
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['ProjectTemplate'],
    }),
    deleteTemplatePhase: builder.mutation<PhaseTemplateItem[], { phaseId: string }>({
      query: ({ phaseId }) => ({
        url: routePath(apiRoutes.projectTemplates.root, apiRoutes.projectTemplates.deletePhase(phaseId)),
        method: 'DELETE',
      }),
      invalidatesTags: ['ProjectTemplate'],
    }),

    // ---- tasks ----
    addTemplateTask: builder.mutation<PhaseTemplateItem[], { phaseId: string; name: string; description?: string; dayOffset: number; duration: number; criticalPoints?: string[] }>({
      query: ({ phaseId, ...body }) => ({
        url: routePath(apiRoutes.projectTemplates.root, apiRoutes.projectTemplates.addTask(phaseId)),
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ProjectTemplate'],
    }),
    reorderTemplateTasks: builder.mutation<PhaseTemplateItem[], { phaseId: string; taskIds: string[] }>({
      query: ({ phaseId, taskIds }) => ({
        url: routePath(apiRoutes.projectTemplates.root, apiRoutes.projectTemplates.reorderTasks(phaseId)),
        method: 'PATCH',
        body: { taskIds },
      }),
      invalidatesTags: ['ProjectTemplate'],
    }),
    updateTemplateTask: builder.mutation<PhaseTemplateItem[], { taskId: string; name?: string; description?: string; dayOffset?: number; duration?: number; criticalPoints?: string[]; order?: number }>({
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
  useGetProjectTemplatesQuery,
  useGetTemplatePhasesQuery,
  useCreateProjectTemplateMutation,
  useUpdateProjectTemplateMutation,
  useDeleteProjectTemplateMutation,
  useAddTemplatePhaseMutation,
  useUpdateTemplatePhaseMutation,
  useDeleteTemplatePhaseMutation,
  useAddTemplateTaskMutation,
  useReorderTemplateTasksMutation,
  useUpdateTemplateTaskMutation,
  useDeleteTemplateTaskMutation,
} = projectTemplatesApi;
