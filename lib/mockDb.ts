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
import { genId } from "./data";
import { buildProjectPhases, buildTasks, summarize, phaseSummaries, projectStatusFromPhases, toTaskLite, toPhasesLite } from "./businessLogic";
import { todayISO, addWorkingDays } from "./dateUtils";
import type { Phase, ProjectDetailData, ProjectIndexRow, ProjectMeta, Task, Ticket } from "./types";

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

function seed(): void {
  if (store.seeded) return;
  store.seeded = true;

  const startDate = addWorkingDays(todayISO(), -3);
  const phases = buildProjectPhases();
  const tasks = buildTasks(startDate, phases);

  // Give the seed project some real-looking activity so the dashboard
  // accordions, timeline, and team performance grid aren't empty on
  // first run: assign the first few tasks, complete one early.
  const assignments = ["sanika-dose", "shubham-tanapure", "viren-patil", "krishna-kumbhar", "nikhil-warokar"];
  tasks.forEach((t, i) => {
    if (i < assignments.length) t.assignedTo = assignments[i];
  });
  if (tasks[0]) {
    tasks[0].status = "Completed";
    tasks[0].actualStart = tasks[0].plannedStart;
    tasks[0].actualFinish = tasks[0].plannedStart;
    tasks[0].history = [{ ts: new Date().toISOString(), field: "Status", from: "Not Started", to: "Completed", editedBy: "Sanika Dose", reason: "" }];
  }
  if (tasks[1]) {
    tasks[1].status = "In Progress";
    tasks[1].actualStart = tasks[1].plannedStart;
    tasks[1].history = [{ ts: new Date().toISOString(), field: "Status", from: "Not Started", to: "In Progress", editedBy: "Shubham Tanapure", reason: "" }];
  }

  const id = genId("proj");
  const project: ProjectDetailData = {
    id,
    meta: {
      name: "TE Connectivity — Robotic Connector Inspection Cell",
      type: "Product",
      customer: "TE Connectivity",
      owner: "viren-patil",
      startDate,
      endDate: addWorkingDays(startDate, 60),
      createdAt: todayISO(),
    },
    phases,
    tasks,
  };
  store.projects.set(id, project);

  store.tickets.push({
    id: genId("tkt"),
    seq: 1,
    title: "Camera trigger drift on Station 2",
    description: "Intermittent double-trigger under high ambient vibration.",
    projectId: id,
    projectName: project.meta.name,
    phase: "05 · Vision Software",
    assignedTo: "krishna-kumbhar",
    priority: "High",
    status: "Open",
    createdAt: todayISO(),
  });
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
}

export function createProject({ name, type, customer, owner, startDate, endDate }: CreateProjectInput): ProjectDetailData {
  const id = genId("proj");
  const phases = buildProjectPhases();
  const tasks = buildTasks(startDate, phases);
  const project: ProjectDetailData = { id, meta: { name, type, customer, owner, startDate, endDate, createdAt: todayISO() }, phases, tasks };
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
