/**
 * In-memory mock "database" for API routes. There is no real persistence
 * layer yet — this module-level store lives for as long as the Next.js
 * server process is running (reset on restart). It exists so the API
 * routes have something real to read/write while the app is wired up
 * against mock data, instead of the frontend hard-coding fixtures.
 *
 * Swap this module for a real database client later — every function
 * here is already the exact shape a real data-access layer would need
 * (listProjectsIndex/getProject/createProject/updateProject/…), so
 * call sites in the API routes shouldn't need to change.
 */
import { genId, EMPLOYEES } from "./data";
import { buildProjectPhases, buildTasks, summarize, phaseSummaries, projectStatusFromPhases, toTaskLite, toPhasesLite, computeAchievement } from "./businessLogic";
import { todayISO, addWorkingDays, DEFAULT_WEEK_OFF } from "./dateUtils";
import type { Phase, ProjectDetailData, ProjectIndexRow, ProjectMeta, Task, Ticket, WeekDay } from "./types";

interface Store {
  projects: Map<string, ProjectDetailData>;
  tickets: Ticket[];
  seeded: boolean;
}

const store: Store = {
  projects: new Map(),
  tickets: [],
  seeded: false,
};

const EMPLOYEE_CYCLE = EMPLOYEES.map(e => e.id);

function historyEntry(status: Task["status"]): Task["history"][number] {
  return { ts: new Date().toISOString(), field: "Status", from: "Not Started", to: status, editedBy: "Admin", reason: "" };
}

// Stamps a whole task list with a plausible in-flight snapshot as of
// `today`: tasks already past their planned finish are mostly marked
// Completed (some finishing early, earning an achievement badge; a
// deliberate ~1-in-6 left in-flight so the dashboard's "Delayed" count
// isn't always zero), tasks currently spanning today are "In Progress",
// and future tasks are left untouched. Two out of every three tasks get
// a round-robin owner (leaving the rest unassigned, same as a real
// backlog would). Illustrative mock data only — task IDs are stable
// (`p{phase}_t{task}`) but this doesn't try to model realistic
// cross-task dependencies beyond what TEMPLATE already encodes.
function simulateProgress(tasks: Task[], today: string, weekOff: WeekDay[]): void {
  tasks.forEach((t, i) => {
    if (i % 3 !== 0) t.assignedTo = EMPLOYEE_CYCLE[i % EMPLOYEE_CYCLE.length];

    if (t.plannedFinish < today) {
      if (i % 6 === 5) {
        t.status = "In Progress";
        t.actualStart = t.plannedStart;
        t.history = [historyEntry("In Progress")];
      } else {
        t.status = "Completed";
        t.actualStart = t.plannedStart;
        t.actualFinish = i % 4 === 0 ? addWorkingDays(t.plannedFinish, -2, weekOff) : t.plannedFinish;
        t.achievement = computeAchievement(t, weekOff);
        t.history = [historyEntry("Completed")];
      }
    } else if (t.plannedStart <= today) {
      t.status = "In Progress";
      t.actualStart = t.plannedStart;
      t.history = [historyEntry("In Progress")];
    }
  });
}

function findTask(tasks: Task[], phaseIndex: number, taskIndex: number): Task {
  const task = tasks.find(t => t.id === `p${phaseIndex}_t${taskIndex}`);
  if (!task) throw new Error(`Seed data: task p${phaseIndex}_t${taskIndex} not found`);
  return task;
}

function seed(): void {
  if (store.seeded) return;
  store.seeded = true;

  const today = todayISO();

  /* -----------------------------------------------------------------
     Project A — early-stage, Product. Started a few days ago so only
     Project Initialization is naturally due; hand-curated instead of
     simulateProgress so specific showcase states (Pending Approval,
     an "Outstanding Performance" achievement) are guaranteed visible.
  ------------------------------------------------------------------ */
  const startA = addWorkingDays(today, -3);
  const weekOffA = DEFAULT_WEEK_OFF;
  const phasesA = buildProjectPhases();
  const tasksA = buildTasks(startA, phasesA, weekOffA);
  simulateProgress(tasksA, today, weekOffA);

  const kickoff = findTask(tasksA, 0, 0);
  kickoff.assignedTo = "sanika-dose";
  kickoff.status = "Completed";
  kickoff.actualStart = kickoff.plannedStart;
  kickoff.actualFinish = kickoff.plannedStart;
  kickoff.achievement = null;
  kickoff.history = [historyEntry("Completed")];

  const reqGathering = findTask(tasksA, 0, 1);
  reqGathering.assignedTo = "viren-patil";
  reqGathering.status = "Completed";
  reqGathering.actualStart = reqGathering.plannedStart;
  reqGathering.actualFinish = addWorkingDays(reqGathering.plannedFinish, -1, weekOffA);
  reqGathering.achievement = computeAchievement(reqGathering, weekOffA);
  reqGathering.history = [historyEntry("Completed")];

  const planning = findTask(tasksA, 0, 3);
  planning.assignedTo = "viren-patil";
  planning.status = "In Progress";
  planning.actualStart = planning.plannedStart;
  planning.history = [historyEntry("In Progress")];

  // Requirement Review — seeded straight into Pending Approval so the
  // approval-workflow UI (violet chip, dashed timeline border, Approve/
  // Reject) has something to show even though the workflow itself is
  // currently unreachable through normal editing (see "Roles" above).
  const reqReview = findTask(tasksA, 1, 0);
  reqReview.assignedTo = "prachi-jamgaonkar";
  reqReview.status = "Pending Approval";
  reqReview.pendingChange = {
    id: genId("chg"),
    changes: { duration: 2, plannedFinish: addWorkingDays(reqReview.plannedFinish, 1, weekOffA) },
    previousStatus: "Not Started",
    requestedBy: "prachi-jamgaonkar",
    requestedByName: "Prachi Jamgaonkar",
    requestedAt: new Date().toISOString(),
    reason: "Customer added two extra interfaces to the spec — need an extra day to review.",
  };

  // PLC Program Development — started a day late but compressed the
  // work to still land on the original deadline (Outstanding Performance).
  const plcProgram = findTask(tasksA, 5, 1);
  plcProgram.assignedTo = "bharat-vinchwekar";
  plcProgram.status = "Completed";
  plcProgram.actualStart = addWorkingDays(plcProgram.plannedStart, 1, weekOffA);
  plcProgram.actualFinish = plcProgram.plannedFinish;
  plcProgram.achievement = computeAchievement(plcProgram, weekOffA);
  plcProgram.history = [historyEntry("Completed")];

  const idA = genId("proj");
  const projectA: ProjectDetailData = {
    id: idA,
    meta: {
      name: "TE Connectivity — Robotic Connector Inspection Cell",
      type: "Product",
      customer: "TE Connectivity",
      owner: "viren-patil",
      startDate: startA,
      endDate: addWorkingDays(startA, 60),
      createdAt: today,
      weekOff: weekOffA,
    },
    phases: phasesA,
    tasks: tasksA,
  };
  store.projects.set(idA, projectA);

  /* -----------------------------------------------------------------
     Project B — well underway, Solution. Started ~35 working days ago
     (most of the plan is in the past) so simulateProgress produces a
     realistic mostly-complete project with a handful of genuine delays,
     without hand-authoring status for all 62 tasks.
  ------------------------------------------------------------------ */
  const startB = addWorkingDays(today, -35);
  const weekOffB: WeekDay[] = [5, 6]; // Fri + Sat — different work week, shows weekOff is per-project
  const phasesB = buildProjectPhases();
  const tasksB = buildTasks(startB, phasesB, weekOffB);
  simulateProgress(tasksB, today, weekOffB);

  const idB = genId("proj");
  const projectB: ProjectDetailData = {
    id: idB,
    meta: {
      name: "Vertex Robotics — Automated Palletizing Solution",
      type: "Solution",
      customer: "Vertex Robotics",
      owner: "bharat-vinchwekar",
      startDate: startB,
      endDate: addWorkingDays(startB, 45),
      createdAt: startB,
      weekOff: weekOffB,
    },
    phases: phasesB,
    tasks: tasksB,
  };
  store.projects.set(idB, projectB);

  /* ---------------------------------- tickets ---------------------------------- */
  store.tickets.push(
    {
      id: genId("tkt"), seq: 1,
      title: "Camera trigger drift on Station 2",
      description: "Intermittent double-trigger under high ambient vibration.",
      projectId: idA, projectName: projectA.meta.name, phase: "05 · Vision Software",
      assignedTo: "krishna-kumbhar", priority: "High", status: "Open", createdAt: today,
    },
    {
      id: genId("tkt"), seq: 2,
      title: "Backend API timeout under load",
      description: "Requests over ~50 req/s start timing out during the integration test rig.",
      projectId: idA, projectName: projectA.meta.name, phase: "04 · Software",
      assignedTo: "shubham-tanapure", priority: "Medium", status: "In Progress", createdAt: today,
    },
    {
      id: genId("tkt"), seq: 3,
      title: "Kickoff meeting recording missing slide 4",
      description: "Recording cuts out during the scope walkthrough — re-share the deck separately.",
      projectId: idA, projectName: projectA.meta.name, phase: "01 · Project Initialization",
      assignedTo: null, priority: "Low", status: "Resolved", createdAt: today,
    },
    {
      id: genId("tkt"), seq: 4,
      title: "Palletizer gripper misalignment on SKU changeover",
      description: "Gripper offset drifts ~2mm after a SKU changeover — recalibration needed each shift.",
      projectId: idB, projectName: projectB.meta.name, phase: "06 · Automation",
      assignedTo: "sanket-chavhan", priority: "High", status: "Closed", createdAt: startB,
    },
  );
}
seed();

function computeIndexRow(project: ProjectDetailData): ProjectIndexRow {
  const today = todayISO();
  const s = summarize(project.tasks, today);
  const phaseRows = phaseSummaries(project.phases, project.tasks, today, project.meta.startDate);
  const bucket = projectStatusFromPhases(phaseRows);
  return {
    id: project.id,
    name: project.meta.name,
    type: project.meta.type,
    customer: project.meta.customer,
    owner: project.meta.owner,
    startDate: project.meta.startDate,
    endDate: project.meta.endDate,
    pct: s.pct,
    completed: s.completed,
    total: s.total,
    delayed: s.delayed,
    plannedEnd: s.plannedEnd,
    bucket,
    taskLite: toTaskLite(project.tasks),
    phasesLite: toPhasesLite(project.phases),
  };
}

export function listProjectsIndex(): ProjectIndexRow[] {
  return Array.from(store.projects.values()).map(computeIndexRow);
}

export function listProjectDetails(): ProjectDetailData[] {
  return Array.from(store.projects.values());
}

export function getProject(id: string): ProjectDetailData | null {
  return store.projects.get(id) || null;
}

export interface CreateProjectInput {
  name: string;
  type: ProjectMeta["type"];
  customer: string;
  owner: string | null;
  startDate: string;
  endDate: string;
  weekOff: ProjectMeta["weekOff"];
}

export function createProject({ name, type, customer, owner, startDate, endDate, weekOff }: CreateProjectInput): ProjectDetailData {
  const id = genId("proj");
  const resolvedWeekOff = weekOff && weekOff.length ? weekOff.slice(0, 2) : DEFAULT_WEEK_OFF;
  const phases = buildProjectPhases();
  const tasks = buildTasks(startDate, phases, resolvedWeekOff);
  const project: ProjectDetailData = { id, meta: { name, type, customer, owner, startDate, endDate, createdAt: todayISO(), weekOff: resolvedWeekOff }, phases, tasks };
  store.projects.set(id, project);
  return project;
}

export interface UpdateProjectPatch {
  meta?: Partial<ProjectMeta>;
  phases?: Phase[];
  tasks?: Task[];
}

export function updateProject(id: string, patch: UpdateProjectPatch): ProjectDetailData | null {
  const existing = store.projects.get(id);
  if (!existing) return null;
  const next: ProjectDetailData = {
    ...existing,
    meta: patch.meta ? { ...existing.meta, ...patch.meta } : existing.meta,
    phases: patch.phases || existing.phases,
    tasks: patch.tasks || existing.tasks,
  };
  store.projects.set(id, next);
  return next;
}

export function deleteProject(id: string): boolean {
  return store.projects.delete(id);
}

export function listTickets(): Ticket[] {
  return store.tickets;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  projectId: string;
  phase: string | null;
  assignedTo: string | null;
  priority: Ticket["priority"];
}

export function createTicket({ title, description, projectId, phase, assignedTo, priority }: CreateTicketInput): Ticket {
  const project = store.projects.get(projectId);
  const nextSeq = store.tickets.length ? Math.max(...store.tickets.map(t => t.seq || 0)) + 1 : 1;
  const ticket: Ticket = {
    id: genId("tkt"), seq: nextSeq, title, description, projectId,
    projectName: project ? project.meta.name : "Unknown project", phase: phase || null,
    assignedTo, priority, status: "Open", createdAt: todayISO(),
  };
  store.tickets.push(ticket);
  return ticket;
}

export function updateTicket(id: string, patch: Partial<Ticket>): Ticket | null {
  const idx = store.tickets.findIndex(t => t.id === id);
  if (idx === -1) return null;
  store.tickets[idx] = { ...store.tickets[idx], ...patch };
  return store.tickets[idx];
}
