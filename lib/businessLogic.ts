/**
 * Business logic: project/phase/task generation, business-day-aware
 * scheduling, delay + achievement detection, the approval workflow, and
 * team-performance aggregation. Kept framework-agnostic (no React) so it
 * can be unit-reasoned-about independently of the components that call it.
 */
import { TEMPLATE, EMPLOYEES, genId } from "./data";
import { addWorkingDays, businessDaysBetween, todayISO } from "./dateUtils";
import type {
  Achievement, Actor, HistoryEntry, LivePhaseRow, Phase, PhaseLite, PhaseSummary,
  ProjectBucket, ProjectDetailData, ProjectIndexRow, ProjectWithLiveStats, StatusColorKey,
  Summary, Task, TaskLite, TaskStatus, TeamPerformanceRow,
} from "./types";

/* ----------------------------- phases & tasks ----------------------------- */

// A project's phases are copied out of TEMPLATE at creation time (each
// gets a stable id) so that renaming/deleting/adding phases or tasks on
// one project never affects the shared TEMPLATE or any other project.
export function buildProjectPhases(): Phase[] {
  return TEMPLATE.map((p, i) => ({
    id: `ph_${i}_${genId("x")}`,
    name: p.phase,
    critical: p.critical,
    order: i,
  }));
}

export function computePlanned(startDate: string, dayOffset: number, duration: number): { plannedStart: string; plannedFinish: string } {
  const plannedStart = addWorkingDays(startDate, dayOffset);
  // duration of N working days means N-1 further working days after the start.
  const plannedFinish = addWorkingDays(plannedStart, Math.max(1, duration) - 1);
  return { plannedStart, plannedFinish };
}

export function buildTasks(startDate: string, phases: Phase[]): Task[] {
  const tasks: Task[] = [];
  TEMPLATE.forEach((p, pi) => {
    const phase = phases[pi];
    p.tasks.forEach(([name, offset, duration], ti) => {
      const { plannedStart, plannedFinish } = computePlanned(startDate, offset, duration);
      tasks.push({
        id: `p${pi}_t${ti}`,
        phaseId: phase.id,
        order: ti,
        name,
        description: "",
        assignedTo: null,
        priority: "Medium",
        dependencies: [],
        dayOffset: offset,
        duration,
        plannedStart,
        plannedFinish,
        actualStart: null,
        actualFinish: null,
        status: "Not Started",
        pendingChange: null,
        achievement: null,
        history: [],
      });
    });
  });
  return tasks;
}

export function suggestedEndDate(startDate: string): string {
  let maxOffsetPlusDuration = 0;
  TEMPLATE.forEach(p => p.tasks.forEach(([, offset, duration]) => {
    maxOffsetPlusDuration = Math.max(maxOffsetPlusDuration, offset + duration);
  }));
  return addWorkingDays(startDate, maxOffsetPlusDuration);
}

/* ---------------------------------------------------------------------
   BACKWARD COMPATIBILITY

   Projects created by the earlier build of this app stored tasks with
   a numeric `phaseIndex` into the global TEMPLATE, had no `detail.phases`
   array, and used free-text `owner` strings. This upgrades old project
   detail objects in place (in memory) the first time they're loaded, so
   previously-created projects keep working under the new phase/employee
   model instead of breaking.
------------------------------------------------------------------------ */
type LegacyTask = Partial<Task> & { phaseIndex?: number };
export interface LegacyProjectDetail extends Omit<ProjectDetailData, "phases" | "tasks"> {
  phases?: Phase[];
  tasks?: LegacyTask[];
}

export function ensureProjectShape(detail: LegacyProjectDetail | null | undefined): ProjectDetailData | null {
  if (!detail) return null;
  let phases = detail.phases;
  if (!phases) {
    phases = TEMPLATE.map((p, i) => ({ id: `ph_${i}`, name: p.phase, critical: p.critical, order: i }));
  }
  const tasks: Task[] = (detail.tasks || []).map(t => {
    const phaseId = t.phaseId || (t.phaseIndex !== undefined && phases![t.phaseIndex] ? phases![t.phaseIndex].id : phases![0]?.id);
    return {
      order: 0,
      description: "",
      assignedTo: null,
      priority: "Medium",
      dependencies: [],
      actualStart: null,
      actualFinish: null,
      pendingChange: null,
      achievement: null,
      history: [],
      ...t,
      phaseId,
    } as Task;
  });
  return { ...detail, phases, tasks };
}

// Best-effort match of an old free-text name (e.g. "Bharat") to an
// organization member id, so pre-existing data doesn't just show blank.
export function guessEmployeeIdFromFreeText(name: string | null | undefined): string | null {
  if (!name) return null;
  const norm = name.trim().toLowerCase();
  if (!norm) return null;
  const hit = EMPLOYEES.find(e => e.name.toLowerCase() === norm || e.name.toLowerCase().startsWith(norm));
  return hit ? hit.id : null;
}

/* ------------------------------ delay detection ------------------------------ */

export function isOverdue(task: { status: TaskStatus; plannedFinish: string }, today: string): boolean {
  return task.status !== "Completed" && today > task.plannedFinish;
}

export function overdueWorkingDays(task: { status: TaskStatus; plannedFinish: string }, today: string): number {
  if (!isOverdue(task, today)) return 0;
  return businessDaysBetween(today, task.plannedFinish);
}

export function summarize(tasks: Task[], today: string): Summary {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "Completed").length;
  const delayed = tasks.filter(t => isOverdue(t, today)).length;
  const plannedEnd = tasks.reduce((max, t) => t.plannedFinish > max ? t.plannedFinish : max, tasks[0]?.plannedFinish || today);
  return { total, completed, delayed, plannedEnd, pct: total ? Math.round((completed / total) * 100) : 0 };
}

// Per-phase rollup. A phase is "delayed" (red) if any of its tasks are
// overdue; cascades up into project status via `criticalPhaseDelayed`.
export function phaseSummaries(phases: Phase[], tasks: Task[], today: string, projectStartDate: string): PhaseSummary[] {
  return phases.slice().sort((a, b) => a.order - b.order).map((phase) => {
    const pts = tasks.filter(t => t.phaseId === phase.id);
    const s = summarize(pts, today);
    let color: StatusColorKey = "slate";
    if (s.total && s.completed === s.total) color = "green";
    else if (s.delayed > 0) color = "red";
    else if (pts.some(t => t.status !== "Not Started")) color = "amber";

    const phaseStart = pts.length ? pts.reduce((min, t) => t.plannedStart < min ? t.plannedStart : min, pts[0].plannedStart) : null;
    const phaseEnd = pts.length ? pts.reduce((max, t) => t.plannedFinish > max ? t.plannedFinish : max, pts[0].plannedFinish) : null;

    return {
      id: phase.id, name: phase.name, critical: phase.critical, order: phase.order,
      ...s, color, phaseStart, phaseEnd,
      weekStart: phaseStart ? Math.floor((new Date(phaseStart).getTime() - new Date(projectStartDate).getTime()) / 86400000 / 7) + 1 : null,
      weekEnd: phaseEnd ? Math.floor((new Date(phaseEnd).getTime() - new Date(projectStartDate).getTime()) / 86400000 / 7) + 1 : null,
    };
  });
}

// Project-level status cascade: Task delayed -> Phase delayed -> (if that
// phase is critical) Project delayed. Non-critical phases can be red
// without pulling the whole project into "Delayed".
export function projectStatusFromPhases(phaseRows: { critical: boolean; color: StatusColorKey; total: number; completed: number }[]): ProjectBucket {
  const anyCriticalDelayed = phaseRows.some(p => p.critical && p.color === "red");
  if (anyCriticalDelayed) return "Delayed";
  const allDone = phaseRows.length > 0 && phaseRows.every(p => p.total > 0 && p.completed === p.total);
  if (allDone) return "On Track"; // completed-and-clean folds into "On Track"
  const started = phaseRows.some(p => p.completed > 0 || p.color === "amber" || p.color === "red");
  return started ? "In Progress" : "On Track";
}

/* ---------------------------- achievement detection ---------------------------- */

// A task earns an achievement badge when it finished early against its
// planned finish date, or under its own estimated duration.
export function computeAchievement(task: Task): Achievement | null {
  if (task.status !== "Completed" || !task.actualFinish) return null;
  const daysEarly = businessDaysBetween(task.plannedFinish, task.actualFinish);
  if (daysEarly >= 2) return { label: `Completed ${daysEarly} Days Early`, days: daysEarly };
  if (daysEarly === 1) return { label: "Finished Before Deadline", days: 1 };
  if (task.actualStart) {
    const actualDuration = businessDaysBetween(task.actualStart, task.actualFinish) + 1;
    if (actualDuration < task.duration) return { label: "Outstanding Performance", days: task.duration - actualDuration };
  }
  return null;
}

/* ------------------------------ approval workflow ------------------------------ */

// Developer (or anyone without editScheduleDirectly) proposes a change to
// one or more scheduling fields. Nothing is applied yet — the task just
// carries the proposal and flips to "Pending Approval".
export function requestScheduleChange(task: Task, changes: Partial<Task>, actor: Actor, reason: string): Task {
  return {
    ...task,
    pendingChange: {
      id: genId("chg"),
      changes,
      previousStatus: task.status,
      requestedBy: actor.id || actor.role,
      requestedByName: actor.name || actor.role,
      requestedAt: new Date().toISOString(),
      reason: reason || "",
    },
    status: "Pending Approval",
  };
}

export function approveScheduleChange(task: Task, approver: Actor): Task {
  if (!task.pendingChange) return task;
  const { changes, requestedByName, reason, previousStatus } = task.pendingChange;
  const merged: Task = { ...task, ...changes };
  const history: HistoryEntry[] = [...(task.history || [])];
  const taskRecord = task as unknown as Record<string, unknown>;
  Object.entries(changes).forEach(([field, to]) => {
    history.push({
      ts: new Date().toISOString(), field: fieldLabel(field), from: taskRecord[field], to,
      editedBy: requestedByName, reason: reason || "", approvedBy: approver.name || approver.role,
    });
  });
  const nowOverdue = merged.status !== "Completed" && todayISO() > merged.plannedFinish;
  merged.status = nowOverdue ? "Delayed" : (previousStatus === "Pending Approval" ? "In Progress" : previousStatus);
  merged.pendingChange = null;
  merged.history = history;
  return merged;
}

export function rejectScheduleChange(task: Task, approver: Actor, comment?: string): Task {
  if (!task.pendingChange) return task;
  const history: HistoryEntry[] = [...(task.history || []), {
    ts: new Date().toISOString(), field: "Change Request", from: "Pending Approval", to: "Rejected — values restored",
    editedBy: task.pendingChange.requestedByName, reason: comment || task.pendingChange.reason || "",
    approvedBy: approver.name || approver.role,
  }];
  return { ...task, status: task.pendingChange.previousStatus, pendingChange: null, history };
}

export function fieldLabel(field: string): string {
  return ({
    dayOffset: "Day from Project Start",
    plannedStart: "Planned Start Date",
    plannedFinish: "Planned Finish Date",
    duration: "Duration (Working Days)",
    name: "Task Name",
    description: "Description",
    assignedTo: "Assigned To",
    priority: "Priority",
    dependencies: "Dependencies",
    status: "Status",
  } as Record<string, string>)[field] || field;
}

/* ---------------------------------------------------------------------
   LIVE DASHBOARD RECOMPUTATION

   The portfolio index stores a lightweight snapshot of each project
   (`taskLite`: phaseId/plannedFinish/status only, and `phasesLite`:
   id/critical) computed at write time. isOverdue() depends on *today's*
   date, not just stored data — a task can silently cross its planned
   finish date without anyone touching the project, leaving the
   dashboard showing "On Track" for a project that's actually behind.
   The dashboard recomputes delayed counts / phase colors / bucket from
   this snapshot against today's date on every render instead of trusting
   the write-time snapshot.
------------------------------------------------------------------------ */
export function toTaskLite(tasks: Task[]): TaskLite[] {
  return tasks.map(t => ({ phaseId: t.phaseId, plannedFinish: t.plannedFinish, status: t.status }));
}
export function toPhasesLite(phases: Phase[]): PhaseLite[] {
  return phases.map(p => ({ id: p.id, critical: p.critical, name: p.name }));
}

export function liveProjectStats(taskLite: TaskLite[], phasesLite: PhaseLite[], today: string): { delayed: number; phases: LivePhaseRow[]; bucket: ProjectBucket } {
  const byPhase = new Map<string, LivePhaseRow>(phasesLite.map(p => [p.id, { ...p, total: 0, completed: 0, delayed: 0, color: "slate" }]));
  taskLite.forEach(t => {
    const row = byPhase.get(t.phaseId);
    if (!row) return;
    row.total += 1;
    if (t.status === "Completed") row.completed += 1;
    else if (isOverdue(t, today)) row.delayed += 1;
  });
  const phaseRows: LivePhaseRow[] = Array.from(byPhase.values()).map(row => {
    let color: StatusColorKey = "slate";
    if (row.total && row.completed === row.total) color = "green";
    else if (row.delayed > 0) color = "red";
    else if (row.completed > 0 || row.total > row.completed) color = row.completed > 0 ? "amber" : "slate";
    return { ...row, color };
  });
  const delayed = taskLite.filter(t => isOverdue(t, today)).length;
  const bucket = projectStatusFromPhases(phaseRows);
  return { delayed, phases: phaseRows, bucket };
}

export function withLiveStats(project: ProjectIndexRow, today: string): ProjectWithLiveStats {
  if (!project.taskLite || !project.phasesLite) return { ...project, bucket: project.delayed > 0 ? "Delayed" : "On Track" };
  const { delayed, phases, bucket } = liveProjectStats(project.taskLite, project.phasesLite, today);
  return { ...project, delayed, phases, bucket };
}

/* ------------------------------ team performance ------------------------------ */

export function aggregateTeamPerformance(allProjectDetails: ProjectDetailData[], today: string): TeamPerformanceRow[] {
  const byEmployee = new Map(EMPLOYEES.map(e => [e.id, { ...e, total: 0, completed: 0, pending: 0, delayed: 0 }]));
  allProjectDetails.forEach(detail => {
    (detail.tasks || []).forEach(task => {
      if (!task.assignedTo || !byEmployee.has(task.assignedTo)) return;
      const row = byEmployee.get(task.assignedTo)!;
      row.total += 1;
      if (task.status === "Completed") row.completed += 1;
      else if (isOverdue(task, today)) row.delayed += 1;
      else row.pending += 1;
    });
  });
  return Array.from(byEmployee.values()).map(row => ({
    ...row,
    completionPct: row.total ? Math.round((row.completed / row.total) * 100) : 0,
  }));
}
