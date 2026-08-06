/**
 * Core static data: the 12-phase project template, the organization's
 * team/employee directory, and role/permission tables. Nothing in this
 * file is React — it's the same kind of plain-data module the original
 * app used for TEMPLATE, kept as the single source of truth so business
 * logic (business-day math, task generation, team aggregation) and UI
 * components all read from one place.
 */
import type { AppRole, Employee, PermissionAction, Team, TemplatePhase, WeekDay } from "./types";

/* ---------------------------------------------------------------------
   TEMPLATE — derived from the project plan spreadsheet.
   12 phases, 62 tasks. dayOffset = planned start, relative to project
   start date (in *working* days — see dateUtils.ts). duration = task
   length in working days. Both are editable per-task after a project
   is created, and every edit is logged to that task's change history.
------------------------------------------------------------------------ */
export const TEMPLATE: TemplatePhase[] = [
  { phase: "01 · Project Initialization", critical: true, tasks: [
    ["Project Kick-off Meeting", 0, 1],
    ["Requirement Gathering & Analysis", 1, 1],
    ["Site Survey & Feasibility Study", 1, 1],
    ["Project Planning & Resource Allocation", 1, 1],
    ["Scope Freeze & Customer Approval (DAP)", 1, 1],
  ]},
  { phase: "02 · Engineering", critical: true, tasks: [
    ["Requirement Review", 7, 1],
    ["BOM Finalization", 7, 1],
    ["Electrical Design", 7, 2],
    ["Mechanical / Layout Design", 8, 1],
    ["Network Architecture", 8, 1],
    ["Software Architecture", 8, 1],
    ["Database Architecture", 8, 1],
    ["Application Flow", 8, 1],
    ["Design Review", 9, 1],
    ["Engineering Release", 9, 1],
  ]},
  { phase: "03 · Infrastructure", critical: false, tasks: [
    ["Windows / Linux Setup", 10, 1],
    ["Vision Tool Installation", 10, 1],
    ["Software Tools Installation", 10, 1],
    ["Automation Tool Installation", 10, 1],
    ["Integration Utility Installations", 10, 1],
    ["Remote Access Utilities", 10, 1],
  ]},
  { phase: "04 · Software", critical: true, tasks: [
    ["Database Creation", 11, 1],
    ["Backend Module Finalization", 11, 1],
    ["Frontend UX/UI Design", 12, 1],
    ["Backend Development", 13, 3],
    ["Frontend Development", 13, 3],
    ["End-to-End Software Testing", 16, 2],
    ["Integration Testing", 18, 1],
    ["Complete Application Testing", 19, 1],
    ["Software Deployment", 20, 1],
  ]},
  { phase: "05 · Vision Software", critical: true, tasks: [
    ["Inspection Requirement Definition", 7, 2],
    ["Vision Hardware Selection (Camera, Lens, Lighting)", 7, 1],
    ["Camera Installation & Calibration", 12, 1],
    ["Lighting Design & Optimization", 12, 1],
    ["Image Acquisition Configuration", 13, 1],
    ["Vision Inspection Tool / AI Model Development", 14, 4],
    ["Golden Sample & Recipe Creation", 18, 1],
    ["Machine Integration", 19, 1],
    ["Performance Validation", 20, 1],
  ]},
  { phase: "06 · Automation", critical: true, tasks: [
    ["PLC IO Mapping & Tag List", 11, 1],
    ["PLC Program Development", 12, 3],
    ["HMI Development (if applicable)", 15, 2],
    ["Integration Development", 17, 2],
  ]},
  { phase: "07 · FAT", critical: true, tasks: [
    ["Performance Testing", 21, 1],
    ["Factory Acceptance Test", 22, 1],
    ["FAT Closure", 23, 1],
    ["As-Built Document Setup", 23, 1],
  ]},
  { phase: "08 · Dispatch", critical: false, tasks: [
    ["Packing", 24, 1],
    ["Dispatch", 25, 1],
    ["Delivery Confirmation", 27, 1],
  ]},
  { phase: "09 · Site", critical: true, tasks: [
    ["Site Readiness", 27, 1],
    ["Equipment Installation", 28, 1],
    ["Electrical & Network Integration", 29, 1],
  ]},
  { phase: "10 · SAT", critical: true, tasks: [
    ["Production Trial", 30, 2],
    ["Customer Validation", 32, 1],
    ["Final SAT", 33, 1],
  ]},
  { phase: "11 · Handover", critical: false, tasks: [
    ["Operator Training", 34, 2],
    ["Project Documentation", 34, 2],
    ["Final Handover", 36, 1],
    ["Minutes of Meeting", 36, 1],
  ]},
  { phase: "12 · Closure", critical: false, tasks: [
    ["Warranty Support", 37, 1],
    ["Project Closure", 37, 1],
  ]},
];

export const STATUS_OPTIONS = ["Not Started", "In Progress", "Pending Approval", "Delayed", "Completed"] as const;
export const STATUS_COLOR = {
  "Not Started": "slate",
  "In Progress": "amber",
  "Pending Approval": "violet",
  "Delayed": "red",
  "Completed": "green",
} as const;

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

/* ---------------------------------------------------------------------
   ORGANIZATION DIRECTORY — replaces every free-text owner/assignee
   field in the app. Every person has a stable id used for storage;
   `label` includes the (TL) suffix used in the grouped dropdown.
------------------------------------------------------------------------ */
export const TEAMS: Team[] = [
  {
    id: "software",
    name: "Software Team",
    members: [
      { id: "viren-patil", name: "Viren Patil", role: "Team Lead" },
      { id: "shubham-tanapure", name: "Shubham Tanapure", role: "Developer" },
      { id: "sanika-dose", name: "Sanika Dose", role: "Developer" },
      { id: "prachi-jamgaonkar", name: "Prachi Jamgaonkar", role: "Developer" },
      { id: "mayuri-bondre", name: "Mayuri Bondre", role: "Developer" },
    ],
  },
  {
    id: "vision",
    name: "Vision Team",
    members: [
      { id: "nikhil-warokar", name: "Nikhil Warokar", role: "Team Lead" },
      { id: "krishna-kumbhar", name: "Krishna Kumbhar", role: "Developer" },
      { id: "jay-remalukar", name: "Jay Remalukar", role: "Developer" },
      { id: "pavitra-joshi", name: "Pavitra Joshi", role: "Developer" },
      { id: "mayur-jare", name: "Mayur Jare", role: "Developer" },
      { id: "ashutosh-dodiya", name: "Ashutosh Dodiya", role: "Developer" },
      { id: "hritik-patil", name: "Hritik Patil", role: "Developer" },
    ],
  },
  {
    id: "automation",
    name: "Automation Team",
    members: [
      { id: "bharat-vinchwekar", name: "Bharat Vinchwekar", role: "Team Lead" },
      { id: "sanket-chavhan", name: "Sanket Chavhan", role: "Developer" },
    ],
  },
];

// Flat lookup — every UI piece that needs "the employee for this id"
// (avatars, task cards, team performance) reads from this map.
export const EMPLOYEES: Employee[] = TEAMS.flatMap(team =>
  team.members.map(m => ({ ...m, team: team.name, teamId: team.id }))
);
export const EMPLOYEE_BY_ID: Record<string, Employee> = Object.fromEntries(EMPLOYEES.map(e => [e.id, e]));

export function employeeLabel(id: string | null | undefined): string {
  const e = id ? EMPLOYEE_BY_ID[id] : undefined;
  if (!e) return "Unassigned";
  return e.role === "Team Lead" ? `${e.name} (TL)` : e.name;
}

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

   IMPORTANT: same caveat as before — this is a client-side "view as"
   simulation with no real backend/auth. Simplified for now to just
   Admin and Developer, both granted every permission below (full
   access for both, temporarily) — the per-action permission table is
   kept intact so real role differentiation (e.g. reinstating an
   approval workflow) is a data change here, not a rewrite.
------------------------------------------------------------------------ */
export const ROLES: AppRole[] = ["Admin", "Developer"];
export const ROLE_INFO: Record<AppRole, { blurb: string }> = {
  "Admin": { blurb: "Full portfolio oversight — every project, every control, all breakdowns." },
  "Developer": { blurb: "Full access for now — every project, every control, all breakdowns." },
};
const ALL_ROLES = ROLES;
export const PERMISSIONS: Record<PermissionAction, AppRole[]> = {
  createProject: ALL_ROLES,
  editProjectSettings: ALL_ROLES,
  managePhases: ALL_ROLES,
  editTask: ALL_ROLES,
  // Scheduling edits made by these roles apply immediately; everyone else's
  // scheduling edits are routed through the approval workflow instead.
  editScheduleDirectly: ALL_ROLES,
  approveChanges: ALL_ROLES,
  raiseTicket: ALL_ROLES,
  updateTicketStatus: ALL_ROLES,
  seeFullBreakdowns: ALL_ROLES,
  seeStatusBreakdown: ALL_ROLES,
  seeTeamPerformance: ALL_ROLES,
};
export function roleCan(role: AppRole, action: PermissionAction): boolean {
  return (PERMISSIONS[action] || []).includes(role);
}

export const SCHEDULING_FIELDS = ["dayOffset", "plannedStart", "plannedFinish", "duration"] as const;

export function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
