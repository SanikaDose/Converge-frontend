/**
 * Core static data: the 12-phase project template, status/priority palettes,
 * and the role/permission tables. Plain data, no React.
 *
 * The team/employee directory is NOT here — it's backend data fetched via
 * `useOrgContext()` (GET /employees).
 */
import type { AppRole, PermissionAction, TemplatePhase, WeekDay } from "./types";

/* ---------------------------------------------------------------------
   TEMPLATE — derived from the project plan spreadsheet.
   12 phases, 62 tasks. Each phase has `weekStart` (1-based project week it
   begins in) and `durationWeeks`. A task's dayOffset is its "day from the
   phase's week start" and duration is its length — both in *working* days
   (see dateUtils.ts). So a task's planned start = the working day that opens
   the phase's week + dayOffset working days. Both are editable per-task
   after a project is created, and every edit is logged to task history.
------------------------------------------------------------------------ */
export const TEMPLATE: TemplatePhase[] = [
  { phase: "01 · Project Initialization", critical: true, weekStart: 1, durationWeeks: 1, tasks: [
    ["Project Kick-off Meeting", 0, 1],
    ["Requirement Gathering & Analysis", 1, 2],
    ["Site Survey & Feasibility Study", 1, 2],
    ["Project Planning & Resource Allocation", 3, 2],
    ["Scope Freeze & Customer Approval (DAP)", 5, 2],
  ]},
  { phase: "02 · Engineering", critical: true, weekStart: 2, durationWeeks: 1, tasks: [
    ["Requirement Review", 2, 1],
    ["BOM Finalization", 2, 1],
    ["Electrical Design", 2, 2],
    ["Mechanical / Layout Design", 3, 1],
    ["Network Architecture", 3, 1],
    ["Software Architecture", 3, 1],
    ["Database Architecture", 3, 1],
    ["Application Flow", 3, 1],
    ["Design Review", 4, 1],
    ["Engineering Release", 5, 1],
  ]},
  { phase: "03 · Infrastructure", critical: false, weekStart: 3, durationWeeks: 1, tasks: [
    ["Windows / Linux Setup", 0, 1],
    ["Vision Tool Installation", 0, 1],
    ["Software Tools Installation", 0, 1],
    ["Automation Tool Installation", 0, 1],
    ["Integration Utility Installations", 0, 1],
    ["Remote Access Utilities", 0, 1],
  ]},
  { phase: "04 · Software", critical: true, discipline: "Software", weekStart: 3, durationWeeks: 2, tasks: [
    ["Database Creation", 1, 1],
    ["Backend Module Finalization", 1, 1],
    ["Frontend UX/UI Design", 2, 1],
    ["Backend Development", 3, 3],
    ["Frontend Development", 3, 3],
    ["End-to-End Software Testing", 6, 2],
    ["Integration Testing", 8, 1],
    ["Complete Application Testing", 9, 1],
    ["Software Deployment", 10, 1],
  ]},
  { phase: "05 · Vision Software", critical: true, discipline: "Vision", weekStart: 3, durationWeeks: 2, tasks: [
    ["Inspection Requirement Definition", 0, 2],
    ["Vision Hardware Selection (Camera, Lens, Lighting)", 0, 1],
    ["Camera Installation & Calibration", 2, 1],
    ["Lighting Design & Optimization", 2, 1],
    ["Image Acquisition Configuration", 3, 1],
    ["Vision Inspection Tool / AI Model Development", 4, 4],
    ["Golden Sample & Recipe Creation", 8, 1],
    ["Machine Integration", 9, 1],
    ["Performance Validation", 10, 1],
  ]},
  { phase: "06 · Automation", critical: true, discipline: "Automation", weekStart: 3, durationWeeks: 2, tasks: [
    ["PLC IO Mapping & Tag List", 1, 1],
    ["PLC Program Development", 2, 3],
    ["HMI Development (if applicable)", 5, 2],
    ["Integration Development", 7, 2],
  ]},
  { phase: "07 · FAT", critical: true, weekStart: 4, durationWeeks: 1, tasks: [
    ["Performance Testing", 6, 1],
    ["Factory Acceptance Test", 7, 1],
    ["FAT Closure", 8, 1],
    ["As-Built Document Setup", 8, 1],
  ]},
  { phase: "08 · Dispatch", critical: false, weekStart: 5, durationWeeks: 1, tasks: [
    ["Packing", 4, 1],
    ["Dispatch", 5, 1],
    ["Delivery Confirmation", 7, 1],
  ]},
  { phase: "09 · Site", critical: true, weekStart: 5, durationWeeks: 1, tasks: [
    ["Site Readiness", 7, 1],
    ["Equipment Installation", 8, 1],
    ["Electrical & Network Integration", 9, 1],
  ]},
  { phase: "10 · SAT", critical: true, weekStart: 5, durationWeeks: 3, tasks: [
    ["Production Trial", 10, 2],
    ["Customer Validation", 12, 1],
    ["Final SAT", 13, 1],
  ]},
  { phase: "11 · Handover", critical: false, weekStart: 8, durationWeeks: 1, tasks: [
    ["Operator Training", 0, 2],
    ["Project Documentation", 0, 2],
    ["Final Handover", 1, 1],
    ["Minutes of Meeting", 1, 1],
  ]},
  { phase: "12 · Closure", critical: false, weekStart: 8, durationWeeks: 1, tasks: [
    ["Warranty Support", 2, 1],
    ["Project Closure", 2, 1],
  ]},
];

export const STATUS_OPTIONS = ["Not Started", "In Progress", "Pending Approval", "Delayed", "Blocked", "Completed", "Not Required"] as const;
export const STATUS_COLOR = {
  "Not Started": "slate",
  "In Progress": "amber",
  "Pending Approval": "violet",
  "Delayed": "red",
  "Blocked": "orange",
  "Completed": "green",
  // Neutral grey — a Not-Required task is out of scope, not an active state.
  "Not Required": "slate",
} as const;

// Discipline-specific phases; a project includes any subset of these (plus
// common phases). Selecting all — or none — means the full plan.
export const PHASE_DISCIPLINE_OPTIONS = ["Software", "Vision", "Automation"] as const;

// Financial years selectable at creation (Apr–Mar). First = current, the default.
export const FINANCIAL_YEAR_OPTIONS = ["FY26-27", "FY25-26", "FY24-25"] as const;

export const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"] as const;
export const PRIORITY_COLOR = { Low: "slate", Medium: "amber", High: "red", Critical: "red" } as const;

/* ---------------------------------------------------------------------
   WEEK-OFF (non-working days) — per-project, chosen at creation time.
   Index matches Date#getUTCDay() (0 = Sunday … 6 = Saturday), which is
   also what WeekDay values in lib/types.ts use.
------------------------------------------------------------------------ */
export const WEEKDAY_LABELS: Record<WeekDay, string> = {
  0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday",
};
export const WEEKDAY_SHORT: Record<WeekDay, string> = {
  0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat",
};
export const MAX_WEEK_OFF_DAYS = 2;

export function initials(name: string | null | undefined): string {
  return (name || "?").split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

// Deterministic pastel-on-brand avatar color from a name, so the same
// person always gets the same avatar color across the app.
export function avatarColor(name: string | null | undefined): string {
  const palette = ["#2f7d8f", "#3f6fb0", "#4c8c6f", "#8a6fb0", "#b0784c", "#5a7fae", "#6f8c4c"];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = (hash * 31 + name!.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

/* ---------------------------------------------------------------------
   ROLES & PERMISSIONS

   Admin has full access; User is read-only. A User sees exactly what an
   Admin sees — every project, task, ticket, board and breakdown — but
   cannot create, edit, delete, move a Kanban card, or raise a ticket.

   This gates the UI. The backend authenticates every request (global
   JwtAuthGuard), but does not yet enforce Admin-only *writes* on every
   mutating route, so full "view only" enforcement still needs a role check
   server-side. See converge_frontend/CLAUDE.md → "Roles".
------------------------------------------------------------------------ */
export const ROLES: AppRole[] = ["Admin", "User"];
const ALL_ROLES = ROLES;
/** Write access — Admin only. */
const ADMIN_ONLY: AppRole[] = ["Admin"];
/** Ticket management — Admin and Lead (Leads run the ticket section). */
const ADMIN_LEAD: AppRole[] = ["Admin", "Lead"];
export const PERMISSIONS: Record<PermissionAction, AppRole[]> = {
  createProject: ADMIN_ONLY,
  deleteProject: ADMIN_ONLY,
  editProjectSettings: ADMIN_ONLY,
  managePhases: ADMIN_ONLY,
  editTask: ADMIN_ONLY,
  // Only matters for roles that can edit tasks at all. A User is blocked by
  // `editTask` first, so this never routes them into the approval workflow —
  // read-only means read-only, not "edit by request".
  editScheduleDirectly: ADMIN_ONLY,
  approveChanges: ADMIN_ONLY,
  raiseTicket: ADMIN_LEAD,
  updateTicketStatus: ADMIN_LEAD,
  // Viewing is unrestricted — a User sees every breakdown an Admin does.
  seeFullBreakdowns: ALL_ROLES,
  seeStatusBreakdown: ALL_ROLES,
  seeTeamPerformance: ALL_ROLES,
};
export function roleCan(role: AppRole, action: PermissionAction): boolean {
  return (PERMISSIONS[action] || []).includes(role);
}

/** Tooltip on controls a read-only User can see but not use. Write controls are
 *  disabled (not hidden) so the UI reads the same for everyone. */
export const VIEW_ONLY_HINT = "View-only access — ask an admin to make changes.";

export const SCHEDULING_FIELDS = ["dayOffset", "plannedStart", "plannedFinish", "duration"] as const;

/** A real v4 UUID for anything that becomes a DB primary key (e.g. a new task).
 *  Must match the backend's `newId()` — `tasks.id` is a native `uuid` column. */
export function newId(): string {
  return crypto.randomUUID();
}

/** Prefixed id for items living inside a jsonb column (checklist points, ticket
 *  action points) — never a primary key, so a readable prefix beats a UUID. */
export function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
