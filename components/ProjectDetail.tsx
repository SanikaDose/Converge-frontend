"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Chip from "@mui/material/Chip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SettingsIcon from "@mui/icons-material/Settings";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import GridViewIcon from "@mui/icons-material/GridView";
import TimelineIcon from "@mui/icons-material/Timeline";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import BusinessIcon from "@mui/icons-material/Business";
import PlaceIcon from "@mui/icons-material/Place";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

import { CompletionRing } from "./CompletionRing";
import { PhaseNavList, AddTaskDialog, PhaseTaskPanel, type NewTaskPayload } from "./PhaseManager";
import { TaskDetailsDialog, type TaskDetailsPatch } from "./TaskDetailsDialog";
import { TaskHistoryDialog } from "./TaskHistoryDialog";
import { TimelineView } from "./TimelineView";
import { KanbanView } from "./KanbanView";
import { ProjectForm, type ProjectFormPayload } from "./ProjectForm";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import { WarrantyDialog } from "./WarrantyDialog";
import { EmployeeAvatar, KanbanStatusFilter, defaultKanbanVisible } from "./common";

import { useGetProjectQuery, useUpdateProjectMutation } from "@/store/api/projectsApi";
import {
  ensureProjectShape, phaseSummaries, summarize, computePlanned,
  approveScheduleChange, rejectScheduleChange, computeAchievement, requestScheduleChange, fieldLabel,
} from "@/lib/businessLogic";
import { newId, roleCan, VIEW_ONLY_HINT } from "@/lib/data";
import { useOrgContext } from "@/context/OrgContext";
import { fmt, todayISO, diffDays, businessDaysBetween } from "@/lib/dateUtils";
import type { Actor, ChecklistItem, HistoryEntry, ProjectDetailData, Task, TaskStatus, RelatedRepository, Warranty } from "@/lib/types";

type ViewMode = "phases" | "timeline" | "kanban";

export function ProjectDetail({ projectId, actor, onBack, initialTaskId = null }: {
  projectId: string;
  actor: Actor;
  onBack: () => void;
  /** Task to open expanded on arrival (the portfolio Kanban's `?task=` param). */
  initialTaskId?: string | null;
}) {
  const { role } = actor;
  const { employeeLabel } = useOrgContext();
  const [detail, setDetail] = useState<ProjectDetailData | null>(null);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  // View is mirrored in the URL (?view=timeline|kanban) so switching views is a
  // real history step: the browser Back button then returns to the previous
  // view / this project instead of skipping straight out to the dashboard.
  const readViewFromUrl = (): ViewMode => {
    if (typeof window === "undefined") return "phases";
    const v = new URLSearchParams(window.location.search).get("view");
    return v === "timeline" || v === "kanban" ? v : "phases";
  };
  const [viewMode, setViewMode] = useState<ViewMode>(readViewFromUrl);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showWarranty, setShowWarranty] = useState(false);
  const [savingWarranty, setSavingWarranty] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [addTaskPhaseId, setAddTaskPhaseId] = useState<string | null>(null);
  // Which task PhaseTaskPanel should open expanded, set when arriving from a
  // Kanban card, a Timeline bar, or a ?task= link off the portfolio Kanban.
  const [focusTask, setFocusTask] = useState<{ id: string; seq: number } | null>(null);
  // Which Kanban status columns are shown — Delayed + Not Required start off
  // (see defaultKanbanVisible). Lives here so the checkbox row can sit inline
  // in the view-toggle toolbar rather than adding a second row.
  const [kanbanVisible, setKanbanVisible] = useState<Set<TaskStatus>>(defaultKanbanVisible);
  const toggleKanbanStatus = (s: TaskStatus) => setKanbanVisible(prev => {
    const next = new Set(prev);
    if (next.has(s)) next.delete(s); else next.add(s);
    return next;
  });
  const today = todayISO();

  /** Switch to Phases view with `taskId`'s card open and scrolled to. */
  const openTask = useCallback((phaseId: string, taskId: string) => {
    setActivePhaseId(phaseId);
    setViewMode("phases");
    // Keep the URL in step (drop ?view) without adding a history entry — opening
    // a task isn't a navigation the user should have to "Back" out of.
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view")) {
      window.history.replaceState(window.history.state, "", `/projects/${projectId}`);
    }
    // Bump seq so clicking the same task twice re-opens it after a manual collapse.
    setFocusTask(prev => ({ id: taskId, seq: (prev?.seq ?? 0) + 1 }));
  }, [projectId]);

  // Manual view switch (the Phases/Timeline/Kanban toggle): mirror it into the
  // URL as a real history push, so the browser Back button steps back through
  // views and returns to the project rather than exiting to the dashboard.
  const changeView = useCallback((v: ViewMode) => {
    setViewMode(v);
    const url = v === "phases" ? `/projects/${projectId}` : `/projects/${projectId}?view=${v}`;
    window.history.pushState(window.history.state, "", url);
  }, [projectId]);

  // Browser Back/Forward within the project: re-read the view from the URL.
  useEffect(() => {
    const onPop = () => setViewMode(readViewFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const canViewProjectSettings = true;
  const canEditProjectSettings = roleCan(role, "editProjectSettings");
  const canDeleteProject = roleCan(role, "deleteProject");
  const canManagePhases = roleCan(role, "managePhases");
  const canEditTask = roleCan(role, "editTask");
  const canEditScheduleDirectly = roleCan(role, "editScheduleDirectly");
  const canApprove = roleCan(role, "approveChanges");

  /**
   * The fetch moves to RTK Query, but the *editing* model deliberately does
   * not: this screen holds the whole project document in `detail` and
   * mutates it locally before PATCHing the full thing back (see `persist`).
   * Driving that off the cache directly would mean re-deriving the document
   * on every keystroke, so the query seeds local state and local state stays
   * the source of truth while the page is open.
   */
  const { data: fetchedProject, isFetching, isError } = useGetProjectQuery(projectId);
  const [updateProjectMutation] = useUpdateProjectMutation();
  const loading = isFetching && !detail;

  useEffect(() => {
    if (isError) { setDetail(null); return; }
    if (!fetchedProject) return;
    const data = ensureProjectShape(fetchedProject);
    setDetail(data);
    if (!data) return;
    setActivePhaseId(prev => {
      if (prev) return prev;
      const phases = phaseSummaries(data.phases, data.tasks, today, data.meta.startDate);
      const idx = phases.findIndex(p => p.completed < p.total);
      return (idx === -1 ? phases[phases.length - 1] : phases[idx])?.id || null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedProject, isError]);

  // Deep link from the portfolio Kanban. Deliberately waits for `detail` —
  // the URL carries only a task id, and the phase to switch to has to be
  // looked up on the loaded task. Runs once per id; a task id that no longer
  // exists is ignored rather than switching to an empty phase.
  const appliedInitialTask = useRef<string | null>(null);
  useEffect(() => {
    if (!detail || !initialTaskId || appliedInitialTask.current === initialTaskId) return;
    const task = detail.tasks.find(t => t.id === initialTaskId);
    if (!task) return;
    appliedInitialTask.current = initialTaskId;
    openTask(task.phaseId, task.id);
  }, [detail, initialTaskId, openTask]);

  // When a project first reaches 100% (every countable task Completed), pop the
  // warranty form so its contact details get recorded. Fires once per
  // completion (the ref resets if the project drops back to incomplete), and
  // only for someone who can edit — a read-only viewer isn't prompted.
  const warrantyPrompted = useRef(false);
  useEffect(() => {
    if (!detail) return;
    const counted = detail.tasks.filter(t => t.status !== "Not Required");
    const complete = counted.length > 0 && counted.every(t => t.status === "Completed");
    if (!complete) { warrantyPrompted.current = false; return; }
    if (complete && canEditProjectSettings && !detail.meta.warranty && !warrantyPrompted.current) {
      warrantyPrompted.current = true;
      setShowWarranty(true);
    }
  }, [detail, canEditProjectSettings]);

  // Full project detail (meta + phases + tasks) is PATCHed to the mock
  // API as one document; the API recomputes the dashboard's lightweight
  // index row (bucket/delayed/etc) from this on every GET /api/projects,
  // so there's no separate index to keep in sync here.
  const persist = async (next: ProjectDetailData) => {
    setDetail(next);
    try { await updateProjectMutation({ id: projectId, patch: { meta: next.meta, phases: next.phases, tasks: next.tasks } }).unwrap(); }
    catch (e) { console.error(e); }
  };

  /**
   * Applies a task-list change and persists it.
   *
   * The next state is computed *outside* any updater on purpose. This used
   * to run `fn` and call `persist` inside `setDetail(prev => …)`, which
   * makes the updater impure — it fired a network request and a nested
   * setState. React invokes updaters twice in development to surface
   * exactly that, and the doubled run was appending a newly created task
   * twice, producing "Encountered two children with the same key".
   *
   * `persist` already calls `setDetail(next)`, so state still updates
   * immediately; every caller is a discrete user action, so reading
   * `detail` from the closure is safe here.
   */
  const mutateTasks = (fn: (tasks: Task[]) => Task[]) => {
    if (!detail) return;
    persist({ ...detail, tasks: fn(detail.tasks) });
  };

  // Mark a whole phase not-required (or back), and cascade to its tasks:
  // turning a phase off marks every task in it "Not Required" (actuals
  // cleared); turning it back on reactivates those tasks to "Not Started".
  const handleTogglePhaseNotRequired = (phaseId: string) => {
    if (!detail) return;
    const phase = detail.phases.find(p => p.id === phaseId);
    if (!phase) return;
    const next = !phase.notRequired;
    const ts = new Date().toISOString();
    const editedBy = actor.name || actor.role;
    persist({
      ...detail,
      phases: detail.phases.map(p => p.id === phaseId ? { ...p, notRequired: next } : p),
      tasks: detail.tasks.map(t => {
        if (t.phaseId !== phaseId) return t;
        if (next) {
          if (t.status === "Not Required") return t;
          return {
            ...t, status: "Not Required", actualStart: null, actualFinish: null, achievement: null,
            history: [...(t.history || []), { ts, field: "Status", from: t.status, to: "Not Required", editedBy, reason: "Phase marked not required" }],
          };
        }
        // Reactivating the phase: only tasks the phase-off had set to
        // Not Required come back (as Not Started).
        if (t.status !== "Not Required") return t;
        return {
          ...t, status: "Not Started",
          history: [...(t.history || []), { ts, field: "Status", from: "Not Required", to: "Not Started", editedBy, reason: "Phase marked required" }],
        };
      }),
    });
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    mutateTasks(tasks => tasks.map(t => {
      if (t.id !== taskId) return t;
      const updates: Partial<Task> = { status };
      // "Not Required" is out-of-scope work, like Not Started it carries no
      // actual start/finish.
      if (status === "Not Started" || status === "Not Required") { updates.actualStart = null; updates.actualFinish = null; }
      else {
        if (!t.actualStart) updates.actualStart = today;
        updates.actualFinish = status === "Completed" ? (t.actualFinish || today) : null;
      }
      const merged: Task = { ...t, ...updates };
      merged.achievement = status === "Completed" ? computeAchievement(merged, detail?.meta.weekOff) : null;
      merged.history = [...(t.history || []), { ts: new Date().toISOString(), field: "Status", from: t.status, to: status, editedBy: actor.name || actor.role, reason: "" }];
      return merged;
    }));
  };

  const handleSaveTaskPatch = (taskId: string, patch: TaskDetailsPatch) => {
    mutateTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, ...patch } : t));
  };

  const handleApprove = (taskId: string) => {
    mutateTasks(tasks => tasks.map(t => t.id === taskId ? approveScheduleChange(t, actor) : t));
  };
  const handleReject = (taskId: string, comment: string) => {
    mutateTasks(tasks => tasks.map(t => t.id === taskId ? rejectScheduleChange(t, actor, comment) : t));
  };
  const handleDeleteTask = (taskId: string) => {
    mutateTasks(tasks => tasks.filter(t => t.id !== taskId));
  };

  // Owner and notes are non-scheduling fields — they apply immediately
  // for anyone who can edit the task at all, same as a status change.
  const commitField = <K extends keyof Task>(taskId: string, field: K, value: Task[K]) => {
    mutateTasks(tasks => tasks.map(t => {
      if (t.id !== taskId || t[field] === value) return t;
      const history: HistoryEntry[] = [...(t.history || []), { ts: new Date().toISOString(), field: fieldLabel(field), from: t[field], to: value, editedBy: actor.name || actor.role, reason: "" }];
      return { ...t, [field]: value, history };
    }));
  };
  // Owners: assignees is the source of truth; assignedTo mirrors the first
  // so single-avatar display and the backend FK stay valid. One history
  // entry records the whole owner set changing, not one per person.
  const handleCommitAssignees = (taskId: string, assignees: string[]) => {
    mutateTasks(tasks => tasks.map(t => {
      if (t.id !== taskId) return t;
      const current = t.assignees ?? [];
      if (current.length === assignees.length && current.every((v, i) => v === assignees[i])) return t;
      const history: HistoryEntry[] = [...(t.history || []), { ts: new Date().toISOString(), field: "Owners", from: current, to: assignees, editedBy: actor.name || actor.role, reason: "" }];
      return { ...t, assignees, assignedTo: assignees[0] ?? null, history };
    }));
  };
  const handleCommitDescription = (taskId: string, description: string) => commitField(taskId, "description", description);

  // Checklist edits deliberately bypass commitField: they'd push an entry
  // into the task's change history on every single checkbox tick, drowning
  // the genuinely notable status/scheduling changes it exists to surface.
  /**
   * Checklist edits, plus the rule that a Completed task can't quietly hold
   * new unfinished work: adding an unticked critical point to a Completed
   * task reopens it as In Progress.
   *
   * This is the mirror of TaskCard's "can't complete with open points" guard.
   * Without it the two rules disagree — you couldn't reach Completed with an
   * open point, but you could add one afterwards and the task would sit there
   * claiming to be done.
   *
   * Scoped to *newly added* points on purpose. Unticking an existing point
   * still doesn't reopen the task (a long-standing decision — see the task
   * checklist notes in CLAUDE.md); this only fires for work that wasn't part
   * of the task when it was signed off.
   */
  const handleChecklistChange = (taskId: string, checklist: ChecklistItem[]) => {
    mutateTasks(tasks => tasks.map(t => {
      if (t.id !== taskId) return t;

      const previousIds = new Set((t.checklist ?? []).map(c => c.id));
      const addedOpenPoints = checklist.filter(c => !previousIds.has(c.id) && !c.done).length;
      if (t.status !== "Completed" || addedOpenPoints === 0) return { ...t, checklist };

      // Reopening undoes the completion: the finish date and any early-finish
      // achievement were earned against a scope that has since grown.
      const history: HistoryEntry[] = [...(t.history || []), {
        ts: new Date().toISOString(),
        field: "Status",
        from: "Completed",
        to: "In Progress",
        editedBy: actor.name || actor.role,
        reason: `Reopened — ${addedOpenPoints} new critical point${addedOpenPoints === 1 ? "" : "s"} added after completion.`,
      }];
      return { ...t, checklist, status: "In Progress" as TaskStatus, actualFinish: null, achievement: null, history };
    }));
  };

  /**
   * Scheduling fields (day offset / planned start / duration) go through
   * the approval branch point: direct apply for roles with
   * editScheduleDirectly, otherwise a Pending Approval change request.
   *
   * `reason` is always supplied now — TaskCard collects it up front via
   * ScheduleReasonDialog before calling any of these, so both branches
   * record *why* the date moved rather than only that it did.
   */
  const commitSchedule = (taskId: string, scheduleChanges: Partial<Task>, reason: string) => {
    mutateTasks(tasks => tasks.map(t => {
      if (t.id !== taskId) return t;
      const taskRecord = t as unknown as Record<string, unknown>;
      const changed = Object.entries(scheduleChanges).some(([field, to]) => taskRecord[field] !== to);
      if (!changed) return t;
      if (canEditScheduleDirectly) {
        const history: HistoryEntry[] = [...(t.history || [])];
        Object.entries(scheduleChanges).forEach(([field, to]) => {
          if (taskRecord[field] !== to) history.push({ ts: new Date().toISOString(), field: fieldLabel(field), from: taskRecord[field], to, editedBy: actor.name || actor.role, reason });
        });
        return { ...t, ...scheduleChanges, history };
      }
      return requestScheduleChange(t, scheduleChanges, actor, reason);
    }));
  };
  const handleCommitOffset = (taskId: string, rawOffset: string | number, reason: string) => {
    const task = detail?.tasks.find(t => t.id === taskId);
    if (!task || !detail) return;
    const offset = Math.max(0, Number(rawOffset) || 0);
    if (offset === task.dayOffset) return;
    const { plannedStart, plannedFinish } = computePlanned(detail.meta.startDate, offset, task.duration, detail.meta.weekOff);
    commitSchedule(taskId, { dayOffset: offset, plannedStart, plannedFinish }, reason);
  };
  /**
   * Commits a start/finish pair from the reschedule dialog.
   *
   * `duration` is derived here rather than sent by the card: the two dates
   * are the source of truth now, and dayOffset/duration are the stored
   * representation the template maths runs on. Both are recomputed so the
   * Gantt, the phase window, and "day from start" all stay consistent with
   * whatever the user picked.
   */
  const handleCommitDates = (taskId: string, plannedStart: string, plannedFinish: string, reason: string) => {
    const task = detail?.tasks.find(t => t.id === taskId);
    if (!task || !detail || !plannedStart || !plannedFinish) return;
    if (plannedFinish < plannedStart) return;
    if (plannedStart === task.plannedStart && plannedFinish === task.plannedFinish) return;
    const dayOffset = Math.max(0, diffDays(plannedStart, detail.meta.startDate));
    // +1 because duration counts the start day itself, mirroring
    // computePlanned's `finish = start + (duration - 1)`.
    const duration = Math.max(1, businessDaysBetween(plannedFinish, plannedStart, detail.meta.weekOff) + 1);
    commitSchedule(taskId, { dayOffset, duration, plannedStart, plannedFinish }, reason);
  };
  const handleAddTask = ({ name, assignees, dayOffset, duration }: NewTaskPayload) => {
    if (!addTaskPhaseId || !detail) return;
    const { plannedStart, plannedFinish } = computePlanned(detail.meta.startDate, dayOffset, duration, detail.meta.weekOff);
    const siblingOrders = detail.tasks.filter(t => t.phaseId === addTaskPhaseId).map(t => t.order);
    const newTask: Task = {
      id: newId(), phaseId: addTaskPhaseId, order: siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0,
      name, description: "", assignedTo: assignees[0] ?? null, assignees, priority: "Medium", dependencies: [],
      dayOffset, duration, plannedStart, plannedFinish, actualStart: null, actualFinish: null,
      status: "Not Started", pendingChange: null, achievement: null, checklist: [],
      history: [{ ts: new Date().toISOString(), field: "Task Created", from: null, to: name, editedBy: actor.name || actor.role, reason: "" }],
    };
    mutateTasks(tasks => [...tasks, newTask]);
    setAddTaskPhaseId(null);
  };

  const saveSettings = async (meta: ProjectFormPayload) => {
    if (!canEditProjectSettings || !detail) return;
    setSavingSettings(true);
    const startChanged = meta.startDate !== detail.meta.startDate;
    const weekOffChanged = JSON.stringify(meta.weekOff.slice().sort()) !== JSON.stringify(detail.meta.weekOff.slice().sort());
    const tasks = (startChanged || weekOffChanged)
      ? detail.tasks.map(t => ({ ...t, ...computePlanned(meta.startDate, t.dayOffset, t.duration, meta.weekOff) }))
      : detail.tasks;
    const next = { ...detail, meta: { ...detail.meta, ...meta }, phases: detail.phases, tasks };
    await persist(next);
    setSavingSettings(false);
    setShowSettings(false);
  };

  const saveWarranty = async (warranty: Warranty) => {
    if (!canEditProjectSettings || !detail) return;
    setSavingWarranty(true);
    await persist({ ...detail, meta: { ...detail.meta, warranty } });
    setSavingWarranty(false);
    setShowWarranty(false);
  };

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;
  if (!detail) return <Typography color="text.secondary">Project not found.</Typography>;

  const s = summarize(detail.tasks, today);
  const projectComplete = s.total > 0 && s.completed === s.total;
  const warranty = detail.meta.warranty ?? null;
  const phaseRows = phaseSummaries(detail.phases, detail.tasks, today, detail.meta.startDate);
  const activePhaseRow = phaseRows.find(p => p.id === activePhaseId) || phaseRows[0];
  const activeTasks = detail.tasks.filter(t => t.phaseId === activePhaseRow?.id);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: { xs: "calc(100vh - 96px)", md: "calc(100vh - 116px)" } }}>
      {/* Header block — fixed height, never scrolls. Only the phases/
          timeline region below it (flex:1) scrolls. */}
      <Box sx={{ flexShrink: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}
          sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 1.25 }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Back to portfolio">
                <IconButton size="small" onClick={onBack} sx={{ ml: -0.75, color: "text.secondary" }}>
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Typography variant="h5" noWrap sx={{ fontWeight: 600 }}>{detail.meta.name}</Typography>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 0.5, ml: 0.5 }} color="text.secondary" flexWrap="wrap">
              <Stack direction="row" spacing={0.5} alignItems="center"><BusinessIcon sx={{ fontSize: 14 }} /><Typography variant="caption">{detail.meta.customer}</Typography></Stack>
              {detail.meta.location && (
                <Stack direction="row" spacing={0.5} alignItems="center"><PlaceIcon sx={{ fontSize: 14 }} /><Typography variant="caption">{detail.meta.location}</Typography></Stack>
              )}
              {detail.meta.owner && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <EmployeeAvatar employeeId={detail.meta.owner} size={18} />
                  <Typography variant="caption">{employeeLabel(detail.meta.owner)}</Typography>
                </Stack>
              )}
              <Stack direction="row" spacing={0.5} alignItems="center"><CalendarMonthIcon sx={{ fontSize: 14 }} /><Typography variant="caption">{fmt(detail.meta.startDate)} → {fmt(detail.meta.endDate)}</Typography></Stack>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Chip label={`${s.completed}/${s.total} done`} size="small" variant="outlined" />
            <Chip
              label={s.delayed > 0 ? `${s.delayed} delayed` : "On track"} size="small"
              color={s.delayed > 0 ? "error" : "success"} variant={s.delayed > 0 ? "filled" : "outlined"}
            />
            {/* Warranty — shown once the project is complete (or already
                recorded). Green when captured, amber-outline when still to fill. */}
            {(projectComplete || warranty) && (
              <Tooltip title={canEditProjectSettings ? (warranty ? "View / edit warranty" : "Add warranty details") : VIEW_ONLY_HINT}>
                <span>
                  <Chip
                    icon={<VerifiedOutlinedIcon />}
                    label={warranty ? "Warranty" : "Add warranty"}
                    size="small"
                    color={warranty ? "success" : "warning"}
                    variant={warranty ? "filled" : "outlined"}
                    onClick={canEditProjectSettings ? () => setShowWarranty(true) : undefined}
                    sx={{ fontWeight: 700, cursor: canEditProjectSettings ? "pointer" : "default" }}
                  />
                </span>
              </Tooltip>
            )}
            {/* Both stay visible and go disabled for a read-only User. */}
            <Tooltip title="Project settings">
              <IconButton
                size="small"
                onClick={() => setShowSettings(true)}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={canDeleteProject ? "Delete project" : VIEW_ONLY_HINT}>
              <span>
                <IconButton size="small" disabled={!canDeleteProject} onClick={() => setShowDelete(true)}
                  sx={{ color: canDeleteProject ? "error.main" : undefined }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <CompletionRing pct={s.pct} size={48} />
          </Stack>
        </Stack>

        <Stack direction="row" justifyContent={viewMode === "kanban" ? "space-between" : "flex-end"} alignItems="center" flexWrap="wrap" gap={1} sx={{ my: 1 }}>
          {/* Kanban's status checkboxes ride in this row (not a second one) to
              save vertical space — see kanbanVisible. */}
          {viewMode === "kanban" && <KanbanStatusFilter visible={kanbanVisible} onToggle={toggleKanbanStatus} />}
          <ToggleButtonGroup size="small" exclusive value={viewMode} onChange={(_e, v: ViewMode | null) => v && changeView(v)}>
            <ToggleButton value="phases"><GridViewIcon sx={{ fontSize: 16, mr: 0.75 }} />Phases</ToggleButton>
            <ToggleButton value="timeline"><TimelineIcon sx={{ fontSize: 16, mr: 0.75 }} />Timeline</ToggleButton>
            <ToggleButton value="kanban"><ViewKanbanIcon sx={{ fontSize: 16, mr: 0.75 }} />Kanban</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {/* Content region — fills whatever height remains below the header
          and never grows past it; phases view splits into two
          independently-scrolling panes (nav list / task panel) instead
          of one long page that scrolls both together. */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {viewMode === "phases" ? (
          <Stack direction="row" spacing={3} sx={{ height: "100%" }}>
            <PhaseNavList phases={phaseRows} activeId={activePhaseRow?.id} onSelect={setActivePhaseId} />
            <Box sx={{ flex: 1, minWidth: 0, height: "100%", overflowY: "auto", pr: 0.5 }}>
              {activePhaseRow && (
                <PhaseTaskPanel
                  phase={activePhaseRow} tasks={activeTasks} projectStartDate={detail.meta.startDate} today={today} weekOff={detail.meta.weekOff}
                  canEdit={canEditTask} canManage={canManagePhases} canApprove={canApprove} selfId={actor.id}
                  onUpdateTask={handleStatusChange}
                  onOpenEditor={setEditingTask} onOpenHistory={setHistoryTask}
                  onDeleteTask={handleDeleteTask} onApprove={handleApprove} onReject={handleReject}
                  onAddTask={() => setAddTaskPhaseId(activePhaseRow.id)}
                  onToggleNotRequired={handleTogglePhaseNotRequired}
                  onCommitAssignees={handleCommitAssignees} onCommitOffset={handleCommitOffset}
                  onCommitDates={handleCommitDates}
                  onCommitDescription={handleCommitDescription}
                  onChecklistChange={handleChecklistChange}
                  focusTask={focusTask}
                />
              )}
            </Box>
          </Stack>
        ) : viewMode === "timeline" ? (
          <Box sx={{ height: "100%", overflowY: "auto" }}>
            <TimelineView
              phases={detail.phases} tasks={detail.tasks} projectStartDate={detail.meta.startDate} projectEndDate={detail.meta.endDate} today={today} weekOff={detail.meta.weekOff}
              onOpenPhase={openTask}
            />
          </Box>
        ) : (
          <KanbanView
            tasks={detail.tasks} phases={detail.phases} today={today} weekOff={detail.meta.weekOff}
            canEdit={canEditTask} visibleStatuses={kanbanVisible}
            onStatusChange={handleStatusChange}
            onOpenPhase={openTask}
          />
        )}
      </Box>

      {showDelete && (
        <DeleteProjectDialog
          projectId={projectId} projectName={detail.meta.name}
          onClose={() => setShowDelete(false)} onDeleted={onBack}
        />
      )}
      {showSettings && (
  <ProjectForm
    title="Project settings"
    initial={detail.meta}
    submitLabel={canEditProjectSettings ? "Save changes" : undefined}
    busy={savingSettings}
    readOnly={!canEditProjectSettings}
    onClose={() => setShowSettings(false)}
    onSubmit={canEditProjectSettings ? saveSettings : undefined}
  />
)}
      {showWarranty && (
        <WarrantyDialog initial={warranty} busy={savingWarranty}
          onClose={() => setShowWarranty(false)} onSave={saveWarranty} />
      )}
      {editingTask && (
        <TaskDetailsDialog
          task={editingTask} allTasks={detail.tasks} actor={actor}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveTaskPatch}
        />
      )}
      {historyTask && <TaskHistoryDialog task={detail.tasks.find(t => t.id === historyTask.id) || historyTask} onClose={() => setHistoryTask(null)} />}
      {addTaskPhaseId && (
        <AddTaskDialog projectStartDate={detail.meta.startDate} projectWeekOff={detail.meta.weekOff} onClose={() => setAddTaskPhaseId(null)} onCreate={handleAddTask} />
      )}
    </Box>
  );
}
