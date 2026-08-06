"use client";

import React, { useCallback, useEffect, useState } from "react";
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
import GridViewIcon from "@mui/icons-material/GridView";
import TimelineIcon from "@mui/icons-material/Timeline";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

import { CompletionRing } from "./CompletionRing";
import { PhaseNavList, AddTaskDialog, PhaseTaskPanel, type NewTaskPayload } from "./PhaseManager";
import { TaskDetailsDialog, type TaskDetailsPatch } from "./TaskDetailsDialog";
import { TaskHistoryDialog } from "./TaskHistoryDialog";
import { TimelineView } from "./TimelineView";
import { ProjectForm, type ProjectFormPayload } from "./ProjectForm";
import { EmployeeAvatar } from "./common";

import { fetchProject, updateProjectApi } from "@/lib/api";
import {
  ensureProjectShape, phaseSummaries, summarize, computePlanned,
  approveScheduleChange, rejectScheduleChange, computeAchievement, requestScheduleChange, fieldLabel,
} from "@/lib/businessLogic";
import { genId, roleCan, employeeLabel } from "@/lib/data";
import { fmt, todayISO, diffDays } from "@/lib/dateUtils";
import type { Actor, HistoryEntry, ProjectDetailData, Task, TaskStatus } from "@/lib/types";

type ViewMode = "phases" | "timeline";

export function ProjectDetail({ projectId, actor, onBack }: { projectId: string; actor: Actor; onBack: () => void }) {
  const { role } = actor;
  const [detail, setDetail] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("phases");
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [addTaskPhaseId, setAddTaskPhaseId] = useState<string | null>(null);
  const today = todayISO();

  const canEditProjectSettings = roleCan(role, "editProjectSettings");
  const canManagePhases = roleCan(role, "managePhases");
  const canEditTask = roleCan(role, "editTask");
  const canEditScheduleDirectly = roleCan(role, "editScheduleDirectly");
  const canApprove = roleCan(role, "approveChanges");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await fetchProject(projectId);
      const data = ensureProjectShape(raw);
      setDetail(data);
      if (data) {
        setActivePhaseId(prev => {
          if (prev) return prev;
          const phases = phaseSummaries(data.phases, data.tasks, today, data.meta.startDate);
          const idx = phases.findIndex(p => p.completed < p.total);
          return (idx === -1 ? phases[phases.length - 1] : phases[idx])?.id || null;
        });
      }
    } catch {
      setDetail(null);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  // Full project detail (meta + phases + tasks) is PATCHed to the mock
  // API as one document; the API recomputes the dashboard's lightweight
  // index row (bucket/delayed/etc) from this on every GET /api/projects,
  // so there's no separate index to keep in sync here.
  const persist = async (next: ProjectDetailData) => {
    setDetail(next);
    try { await updateProjectApi(projectId, { meta: next.meta, phases: next.phases, tasks: next.tasks }); }
    catch (e) { console.error(e); }
  };

  const mutateTasks = (fn: (tasks: Task[]) => Task[]) => {
    setDetail(prev => {
      if (!prev) return prev;
      const next = { ...prev, tasks: fn(prev.tasks) };
      persist(next);
      return next;
    });
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    mutateTasks(tasks => tasks.map(t => {
      if (t.id !== taskId) return t;
      const updates: Partial<Task> = { status };
      if (status === "Not Started") { updates.actualStart = null; updates.actualFinish = null; }
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
  const handleCommitOwner = (taskId: string, ownerId: string | null) => commitField(taskId, "assignedTo", ownerId);
  const handleCommitDescription = (taskId: string, description: string) => commitField(taskId, "description", description);

  // Scheduling fields (day offset / planned start / duration) go through
  // the approval branch point: direct apply for roles with
  // editScheduleDirectly, otherwise a Pending Approval change request.
  // Both current roles (Admin/Developer) have direct rights for now, so
  // the reason prompt below is a placeholder for when that's no longer
  // universally true — it isn't reachable in the current permission set.
  const commitSchedule = (taskId: string, scheduleChanges: Partial<Task>) => {
    mutateTasks(tasks => tasks.map(t => {
      if (t.id !== taskId) return t;
      const taskRecord = t as unknown as Record<string, unknown>;
      const changed = Object.entries(scheduleChanges).some(([field, to]) => taskRecord[field] !== to);
      if (!changed) return t;
      if (canEditScheduleDirectly) {
        const history: HistoryEntry[] = [...(t.history || [])];
        Object.entries(scheduleChanges).forEach(([field, to]) => {
          if (taskRecord[field] !== to) history.push({ ts: new Date().toISOString(), field: fieldLabel(field), from: taskRecord[field], to, editedBy: actor.name || actor.role, reason: "" });
        });
        return { ...t, ...scheduleChanges, history };
      }
      const reason = typeof window !== "undefined" ? window.prompt("Reason for this scheduling change (required for approval):", "") : "";
      if (!reason) return t;
      return requestScheduleChange(t, scheduleChanges, actor, reason);
    }));
  };
  const handleCommitOffset = (taskId: string, rawOffset: string | number) => {
    const task = detail?.tasks.find(t => t.id === taskId);
    if (!task || !detail) return;
    const offset = Math.max(0, Number(rawOffset) || 0);
    if (offset === task.dayOffset) return;
    const { plannedStart, plannedFinish } = computePlanned(detail.meta.startDate, offset, task.duration, detail.meta.weekOff);
    commitSchedule(taskId, { dayOffset: offset, plannedStart, plannedFinish });
  };
  const handleCommitStartDate = (taskId: string, nextDate: string) => {
    const task = detail?.tasks.find(t => t.id === taskId);
    if (!task || !detail || !nextDate || nextDate === task.plannedStart) return;
    const offset = Math.max(0, diffDays(nextDate, detail.meta.startDate));
    const { plannedStart, plannedFinish } = computePlanned(detail.meta.startDate, offset, task.duration, detail.meta.weekOff);
    commitSchedule(taskId, { dayOffset: offset, plannedStart, plannedFinish });
  };
  const handleCommitDuration = (taskId: string, rawDuration: string | number) => {
    const task = detail?.tasks.find(t => t.id === taskId);
    const duration = Math.max(1, Number(rawDuration) || 1);
    if (!task || !detail || duration === task.duration) return;
    const { plannedFinish } = computePlanned(detail.meta.startDate, task.dayOffset, duration, detail.meta.weekOff);
    commitSchedule(taskId, { duration, plannedFinish });
  };
  const handleAddTask = ({ name, assignedTo, dayOffset, duration }: NewTaskPayload) => {
    if (!addTaskPhaseId || !detail) return;
    const { plannedStart, plannedFinish } = computePlanned(detail.meta.startDate, dayOffset, duration, detail.meta.weekOff);
    const siblingOrders = detail.tasks.filter(t => t.phaseId === addTaskPhaseId).map(t => t.order);
    const newTask: Task = {
      id: genId("task"), phaseId: addTaskPhaseId, order: siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0,
      name, description: "", assignedTo, priority: "Medium", dependencies: [],
      dayOffset, duration, plannedStart, plannedFinish, actualStart: null, actualFinish: null,
      status: "Not Started", pendingChange: null, achievement: null,
      history: [{ ts: new Date().toISOString(), field: "Task Created", from: null, to: name, editedBy: actor.name || actor.role, reason: "" }],
    };
    mutateTasks(tasks => [...tasks, newTask]);
    setAddTaskPhaseId(null);
  };
  const handleReorder = (dragId: string, dropId: string) => {
    mutateTasks(tasks => {
      const phaseId = tasks.find(t => t.id === dragId)?.phaseId;
      const inPhase = tasks.filter(t => t.phaseId === phaseId).sort((a, b) => a.order - b.order);
      const others = tasks.filter(t => t.phaseId !== phaseId);
      const fromIdx = inPhase.findIndex(t => t.id === dragId);
      const toIdx = inPhase.findIndex(t => t.id === dropId);
      const reordered = inPhase.slice();
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      reordered.forEach((t, i) => { t.order = i; });
      return [...others, ...reordered];
    });
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

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;
  if (!detail) return <Typography color="text.secondary">Project not found.</Typography>;

  const s = summarize(detail.tasks, today);
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
            {canEditProjectSettings && (
              <Tooltip title="Project settings"><IconButton size="small" onClick={() => setShowSettings(true)}><SettingsIcon fontSize="small" /></IconButton></Tooltip>
            )}
            <CompletionRing pct={s.pct} size={48} />
          </Stack>
        </Stack>

        <Stack direction="row" justifyContent="flex-end" sx={{ my: 1 }}>
          <ToggleButtonGroup size="small" exclusive value={viewMode} onChange={(_e, v: ViewMode | null) => v && setViewMode(v)}>
            <ToggleButton value="phases"><GridViewIcon sx={{ fontSize: 16, mr: 0.75 }} />Phases</ToggleButton>
            <ToggleButton value="timeline"><TimelineIcon sx={{ fontSize: 16, mr: 0.75 }} />Timeline</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {/* Content region — fills whatever height remains below the header
          and never grows past it; phases view splits into two
          independently-scrolling panes (nav list / task panel) instead
          of one long page that scrolls both together. */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {viewMode === "phases" ? (
          <Stack direction="row" spacing={2} sx={{ height: "100%" }}>
            <PhaseNavList phases={phaseRows} activeId={activePhaseRow?.id} onSelect={setActivePhaseId} />
            <Box sx={{ flex: 1, minWidth: 0, height: "100%", overflowY: "auto", pr: 0.5 }}>
              {activePhaseRow && (
                <PhaseTaskPanel
                  phase={activePhaseRow} tasks={activeTasks} projectStartDate={detail.meta.startDate} today={today} weekOff={detail.meta.weekOff}
                  canEdit={canEditTask} canManage={canManagePhases} canApprove={canApprove}
                  onUpdateTask={handleStatusChange}
                  onOpenEditor={setEditingTask} onOpenHistory={setHistoryTask}
                  onDeleteTask={handleDeleteTask} onApprove={handleApprove} onReject={handleReject}
                  onAddTask={() => setAddTaskPhaseId(activePhaseRow.id)}
                  onReorder={handleReorder}
                  onCommitOwner={handleCommitOwner} onCommitOffset={handleCommitOffset}
                  onCommitStartDate={handleCommitStartDate} onCommitDuration={handleCommitDuration}
                  onCommitDescription={handleCommitDescription}
                />
              )}
            </Box>
          </Stack>
        ) : (
          <Box sx={{ height: "100%", overflowY: "auto" }}>
            <TimelineView
              phases={detail.phases} tasks={detail.tasks} projectStartDate={detail.meta.startDate} projectEndDate={detail.meta.endDate} today={today} weekOff={detail.meta.weekOff}
              onOpenPhase={(phaseId) => { setActivePhaseId(phaseId); setViewMode("phases"); }}
            />
          </Box>
        )}
      </Box>

      {showSettings && (
        <ProjectForm title="Project settings" initial={detail.meta} submitLabel="Save changes" busy={savingSettings}
          onClose={() => setShowSettings(false)} onSubmit={saveSettings} />
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
