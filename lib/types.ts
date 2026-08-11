/**
 * Shared domain types for the mock data layer, business logic, and every
 * component that renders it. Kept framework-agnostic (no React imports)
 * so lib files and app/api route handlers can use them without pulling
 * in client-only dependencies.
 */

/** UI color scheme — independent of AppRole ("viewing as"), see AppContext. */
export type ThemeMode = "light" | "dark";

/* ---------------------------------------------------------------------
   ORGANIZATION DIRECTORY
------------------------------------------------------------------------ */
export type OrgRole = "Team Lead" | "Developer";

export interface TeamMember {
  id: string;
  name: string;
  role: OrgRole;
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
}

export interface Employee extends TeamMember {
  team: string;
  teamId: string;
}

/* ---------------------------------------------------------------------
   ROLES & PERMISSIONS ("viewing as" simulation)
------------------------------------------------------------------------ */
export type AppRole = "Admin" | "Developer";

export type PermissionAction =
  | "createProject"
  | "deleteProject"
  | "editProjectSettings"
  | "managePhases"
  | "editTask"
  | "editScheduleDirectly"
  | "approveChanges"
  | "raiseTicket"
  | "updateTicketStatus"
  | "seeFullBreakdowns"
  | "seeStatusBreakdown"
  | "seeTeamPerformance";

/** The signed-in employee, as returned by POST /auth/login. */
export interface AuthedUser {
  id: string;
  name: string;
  employeeCode: string;
  /** Org job title, e.g. "Team Lead". */
  role: OrgRole;
  /** Application access role — drives `roleCan()`. */
  appRole: AppRole;
  teamId: string;
  team: string;
}

export interface Actor {
  role: AppRole;
  id: string | null;
  name: string;
  can: (action: PermissionAction) => boolean;
}

/* ---------------------------------------------------------------------
   TASK / PHASE / PROJECT TEMPLATE
------------------------------------------------------------------------ */
export type TaskStatus = "Not Started" | "In Progress" | "Pending Approval" | "Delayed" | "Blocked" | "Completed";
export type StatusColorKey = "green" | "amber" | "red" | "slate" | "violet" | "orange";
export type Priority = "Low" | "Medium" | "High" | "Critical";

export type TemplateTaskTuple = [name: string, dayOffset: number, duration: number];

export interface TemplatePhase {
  phase: string;
  critical: boolean;
  tasks: TemplateTaskTuple[];
}

export interface HistoryEntry {
  ts: string;
  field: string;
  from: unknown;
  to: unknown;
  editedBy: string;
  reason: string;
  approvedBy?: string;
}

export interface PendingChange {
  id: string;
  changes: Partial<Task>;
  previousStatus: TaskStatus;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  reason: string;
}

export interface Achievement {
  label: string;
  days: number;
}

/**
 * One "critical point" on a task's checklist. `createdAt`/`updatedAt` are
 * optional only because items added before timestamping existed don't carry
 * them — everything created now always sets both.
 */
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  /** ISO timestamp. */
  createdAt?: string;
  /** ISO timestamp — bumped on text edits and on ticking/unticking. */
  updatedAt?: string;
}

export interface Task {
  id: string;
  phaseId: string;
  order: number;
  name: string;
  description: string;
  assignedTo: string | null;
  priority: Priority;
  dependencies: string[];
  dayOffset: number;
  duration: number;
  plannedStart: string;
  plannedFinish: string;
  actualStart: string | null;
  actualFinish: string | null;
  status: TaskStatus;
  pendingChange: PendingChange | null;
  achievement: Achievement | null;
  history: HistoryEntry[];
  /** "Critical points" for this task — added later, so ensureProjectShape defaults it to []. */
  checklist: ChecklistItem[];
  /** Legacy field from pre-phase-model projects, upgraded by ensureProjectShape. */
  phaseIndex?: number;
}

export interface Phase {
  id: string;
  name: string;
  critical: boolean;
  order: number;
}

export interface Summary {
  total: number;
  completed: number;
  delayed: number;
  plannedEnd: string;
  pct: number;
}

export interface PhaseSummary extends Phase, Summary {
  color: StatusColorKey;
  phaseStart: string | null;
  phaseEnd: string | null;
  weekStart: number | null;
  weekEnd: number | null;
}

export type ProjectType = "Product" | "Solution";
export type ProjectBucket = "Delayed" | "In Progress" | "On Track";

/** 0 = Sunday … 6 = Saturday, matching Date#getUTCDay(). */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ProjectMeta {
  name: string;
  type: ProjectType;
  customer: string;
  location: string | null;
  owner: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  /** Non-working days for this project's business-day calendar — at most 2, defaults to Sat+Sun. */
  weekOff: WeekDay[];
}

export interface ProjectDetailData {
  id: string;
  meta: ProjectMeta;
  phases: Phase[];
  tasks: Task[];
}

export interface TaskLite {
  phaseId: string;
  name: string;
  plannedFinish: string;
  actualFinish: string | null;
  status: TaskStatus;
}

export interface PhaseLite {
  id: string;
  critical: boolean;
  name: string;
}

export interface LivePhaseRow extends PhaseLite {
  total: number;
  completed: number;
  delayed: number;
  color: StatusColorKey;
}

export interface ProjectIndexRow {
  id: string;
  name: string;
  type: ProjectType;
  customer: string;
  owner: string | null;
  startDate: string;
  endDate: string;
  pct: number;
  completed: number;
  total: number;
  delayed: number;
  plannedEnd: string;
  bucket: ProjectBucket;
  taskLite: TaskLite[];
  phasesLite: PhaseLite[];
}

export interface ProjectWithLiveStats extends ProjectIndexRow {
  phases?: LivePhaseRow[];
}

export interface CreateProjectInput {
  name: string;
  type: ProjectType;
  customer: string;
  location: string;
  owner: string | null;
  startDate: string;
  endDate: string;
  weekOff: WeekDay[];
}

export interface UpdateProjectPatch {
  meta?: Partial<ProjectMeta>;
  phases?: Phase[];
  tasks?: Task[];
}

/* ---------------------------------------------------------------------
   TICKETS
------------------------------------------------------------------------ */
export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";

export interface Ticket {
  id: string;
  seq: number;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  phase: string | null;
  assignedTo: string | null;
  priority: Priority;
  status: TicketStatus;
  createdAt: string;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  projectId: string;
  phase: string | null;
  assignedTo: string | null;
  priority: Priority;
}

/* ---------------------------------------------------------------------
   TEAM PERFORMANCE
------------------------------------------------------------------------ */
export interface TeamPerformanceRow extends Employee {
  total: number;
  completed: number;
  pending: number;
  delayed: number;
  completionPct: number;
}

/* ---------------------------------------------------------------------
   DASHBOARD ANALYTICS
------------------------------------------------------------------------ */
/**
 * Portfolio-wide stats captured the first time the backend computes them
 * (see converge_backend's DashboardService.getBaseline) — a real, stable
 * reference point the live dashboard/tickets numbers can be diffed
 * against for "vs last month"-style trend captions, rather than
 * fabricated deltas.
 */
export interface DashboardBaseline {
  activeProjects: number;
  completedProjects: number;
  avgCompletionPct: number;
  delayedTasks: number;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  ticketResolutionPct: number;
  capturedAt: string;
}
