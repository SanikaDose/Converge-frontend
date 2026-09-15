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
/**
 * Directory role. Replaced the earlier "Team Lead" | "Developer" pair: the
 * directory now distinguishes only who administers the app from everyone
 * else, so the two roles line up 1:1 with AppRole.
 */
export type OrgRole = "Admin" | "User" | "Lead";

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

export type EmployeeStatus = "active" | "inactive";
export interface Employee extends TeamMember {
  team: string;
  teamId: string;
  /** Directory lifecycle + scrum participation (present from GET /employees). */
  status?: EmployeeStatus;
  scrumEnabled?: boolean;
  email?: string | null;
  phoneNumber?: string | null;
}

/** Body for POST /employees and PATCH /employees/:id (partial). */
export interface EmployeeInput {
  name: string;
  teamId: string;
  role?: OrgRole;
  email?: string;
  phoneNumber?: string;
  status?: EmployeeStatus;
  scrumEnabled?: boolean;
}

/* ---------------------------------------------------------------------
   ROLES & PERMISSIONS ("viewing as" simulation)
------------------------------------------------------------------------ */
export type AppRole = "Admin" | "User" | "Lead";

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
  /** Login identifier now — the email the user signs in with. */
  email: string;
  /** Org job title, e.g. "Admin". */
  role: OrgRole;
  /** Application access role — drives `roleCan()`. */
  appRole: AppRole;
  teamId: string;
  team: string;
}

/**
 * What POST /auth/login returns: the profile plus the bearer token every
 * later request carries. The token is stored separately from the profile
 * (see lib/authToken.ts) rather than kept on this object in localStorage.
 */
export interface LoginResponse extends AuthedUser {
  accessToken: string;
}

/** Body of PATCH /auth/profile. Name is the only self-editable field. */
export interface UpdateProfileInput {
  name: string;
}

/** Body of POST /auth/change-password. */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
export interface RelatedRepository {
  name: string;
  url: string;
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
// "Not Required" is excluded from progress math entirely (see businessLogic
// summarize/isOverdue). Kept last so existing status ordering is unchanged.
export type TaskStatus = "Not Started" | "In Progress" | "Pending Approval" | "Delayed" | "Blocked" | "Completed" | "Not Required";
export type StatusColorKey = "green" | "amber" | "red" | "slate" | "violet" | "orange";
export type Priority = "Low" | "Medium" | "High" | "Critical";

export type TemplateTaskTuple = [name: string, dayOffset: number, duration: number, description?: string];

/** A discipline-specific phase belongs to exactly one team's workstream. */
export type PhaseDiscipline = "Software" | "Vision" | "Automation";
/** Chosen at creation: "All" keeps every phase; a specific one drops the other disciplines' phases. */
export type ProjectDiscipline = "All" | PhaseDiscipline;

export interface TemplatePhase {
  phase: string;
  critical: boolean;
  tasks: TemplateTaskTuple[];
  /** Omitted for common phases (always generated); set for Software/Vision/Automation phases. */
  discipline?: PhaseDiscipline;
}

/* The DB-backed master template (GET /project-templates) — admins edit its
   tasks; new projects are generated from it. */
export interface TaskTemplateItem {
  id: string;
  name: string;
  description: string;
  dayOffset: number;
  duration: number;
  order: number;
}
export interface PhaseTemplateItem {
  id: string;
  name: string;
  order: number;
  critical: boolean;
  discipline: PhaseDiscipline | null;
  tasks: TaskTemplateItem[];
}

/** One item in the signed-in user's bell feed (GET /notifications). */
export type NotificationKind = "task" | "project" | "ticket" | "misc-task";
export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  context: string;
  projectId: string;
  createdAt: string | null;
  /** Stored events (misc-task) carry a read flag; derived items are always unread. */
  read?: boolean;
  /** Explicit in-app deep link for stored events, e.g. "/tasks?task=<id>". */
  link?: string | null;
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

/** Warranty details captured when a project is completed. */
export interface Warranty {
  /** ISO date the project was completed / warranty starts. */
  completionDate: string;
  contactPerson: string;
  phone: string;
  email: string;
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
  /** Primary owner — mirrors assignees[0], kept for existing single-avatar display. */
  assignedTo: string | null;
  /** All owners. ensureProjectShape backfills this from assignedTo for legacy tasks. */
  assignees: string[];
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
  /** When true the whole phase is excluded from progress math (its tasks don't count). */
  notRequired?: boolean;
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
  /** ISO timestamp of the last change to the project or any of its phases/tasks; null for pre-feature rows. */
  updatedAt?: string | null;
  /** Financial year, e.g. "FY26-27". */
  financialYear?: string | null;
  /** Warranty details, filled once the project is completed; null until then. */
  warranty?: Warranty | null;
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
  notRequired?: boolean;
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
  location: string | null;
  owner: string | null;
  startDate: string;
  endDate: string;
  updatedAt?: string | null;
  /** Financial year, e.g. "FY26-27". */
  financialYear?: string | null;
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
  /** Which disciplines' phases to generate; empty means every phase. */
  disciplines: PhaseDiscipline[];
  /** Financial year, e.g. "FY26-27". */
  financialYear: string;
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
export type TicketStatus = "Open" | "In Progress" | "Closed" | "Reopened";

export interface Ticket {
  id: string;
  seq: number;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  phase: string | null;
  /** Primary assignee — mirrors assignees[0], kept for single-avatar display. */
  assignedTo: string | null;
  /** All assignees (multi-select). */
  assignees: string[];
  priority: Priority;
  status: TicketStatus;
  createdAt: string;
  /**
   * The date the ticket reached Resolved/Closed, stamped server-side and
   * cleared on reopen — null while it's still open.
   */
  resolvedAt: string | null;
  /** "What was done about this" entries — same shape as a task's critical-points checklist. */
  actionPoints: ChecklistItem[];
}

export interface CreateTicketInput {
  title: string;
  description: string;
  projectId: string;
  phase: string | null;
  assignees: string[];
  priority: Priority;
}

/* ---------------------------------------------------------------------
   MISCELLANEOUS TASKS (ad-hoc work, not part of a project's phase plan)
------------------------------------------------------------------------ */
export type MiscTaskStatus = "To Do" | "In Progress" | "On Hold" | "Completed";

export interface MiscTask {
  id: string;
  title: string;
  description: string;
  /** null = "Other (not related to any project)". */
  projectId: string | null;
  projectName: string | null;
  /** Primary assignee — mirrors assignees[0]. */
  assignedTo: string | null;
  assignees: string[];
  priority: Priority;
  status: MiscTaskStatus;
  dueDate: string | null;
  /** Planned start / end of the work. */
  startDate: string | null;
  endDate: string | null;
  checklist: ChecklistItem[];
  createdAt: string;
  /** Employee id of the creator (the person who assigned the task). */
  createdBy?: string | null;
  updatedAt: string | null;
  history: HistoryEntry[];
}

/* ---------------------------------------------------------------------
   DAILY SCRUM
------------------------------------------------------------------------ */
/** Where an employee worked on a given day — the scrum "Work Mode". */
export type WorkMode = "Office" | "Onsite" | "Both" | "WFH" | "Leave";

/** A generic reference to a project / task / ticket worked on (not assignment-scoped). */
export type ScrumReferenceType = "project" | "task" | "ticket" | "na" | "other";
export interface ScrumReference {
  type: ScrumReferenceType;
  id: string;
  label: string;
}

/** One saved scrum update (GET /scrum, PUT /scrum). */
export interface ScrumEntry {
  id: string;
  employeeId: string;
  date: string;
  workPerformed: string;
  workMode: WorkMode;
  references: ScrumReference[];
  updatedAt: string;
}

/** One row in the save payload. */
export interface ScrumSaveEntry {
  employeeId: string;
  workPerformed: string;
  workMode: WorkMode;
  references: ScrumReference[];
}

/** Body for PUT /scrum — the whole day at once. */
export interface ScrumSavePayload {
  date: string;
  entries: ScrumSaveEntry[];
}

/** Body for POST /misc-tasks and PATCH /misc-tasks/:id (partial). */
export interface MiscTaskInput {
  title: string;
  description: string;
  projectId: string | null;
  assignees: string[];
  priority: Priority;
  status: MiscTaskStatus;
  startDate: string | null;
  endDate: string | null;
  checklist: ChecklistItem[];
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
