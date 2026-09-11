/**
 * Every backend route the app calls, in one place — the frontend mirror of
 * `converge_backend/src/constants/routeConstants.ts` and the same
 * convention as the Scout frontend's `constants/apiRoutes.ts`.
 *
 * `main.root` is the backend's global prefix. Endpoint definitions build
 * their URLs from these rather than inlining path strings, so a route that
 * moves is one edit on each side instead of a search across components.
 */
export const apiRoutes = {
  main: {
    root: 'api/v1',
  },

  auth: {
    root: 'auth',
    login: 'login',
    me: 'me',
    updateProfile: 'profile',
    changePassword: 'change-password',
    forgotPassword: 'forgot-password',
    verifyOtp: 'verify-otp',
    resetPassword: 'reset-password',
  },

  projects: {
    root: 'projects',
    getList: '',
    create: '',
    getById: (id: string) => id,
    updateById: (id: string) => id,
    deleteById: (id: string) => id,
  },

  tickets: {
    root: 'tickets',
    getList: '',
    create: '',
    updateById: (id: string) => id,
  },

  miscTasks: {
    root: 'misc-tasks',
    getList: '',
    create: '',
    updateById: (id: string) => id,
    updateStatusById: (id: string) => `${id}/status`,
    deleteById: (id: string) => id,
  },

  projectTemplates: {
    root: 'project-templates',
    get: '',
    addTask: (phaseId: string) => `phases/${phaseId}/tasks`,
    reorderTasks: (phaseId: string) => `phases/${phaseId}/tasks/reorder`,
    updateTask: (taskId: string) => `tasks/${taskId}`,
    deleteTask: (taskId: string) => `tasks/${taskId}`,
  },

  employees: {
    root: 'employees',
    getList: '',
    create: '',
    updateById: (id: string) => id,
    deleteById: (id: string) => id,
  },

  teamPerformance: {
    root: 'team-performance',
    getList: '',
  },

  dashboard: {
    root: 'dashboard-summary',
    getSummary: '',
  },

  notifications: {
    root: 'notifications',
    getList: '',
    markRead: 'mark-read',
  },

  scrum: {
    root: 'scrum',
    getByDate: '',
    save: '',
  },
} as const;

/** Joins a controller root and an endpoint path, tolerating an empty path. */
export const routePath = (root: string, path = ''): string => (path ? `${root}/${path}` : root);
