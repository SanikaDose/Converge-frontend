"use client";

import React, { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "./Stack.jsx";
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

import { CompletionRing } from "./CompletionRing.jsx";
import { PhaseNavList, EditPhaseDialog, DeletePhaseDialog, AddTaskDialog, PhaseTaskPanel } from "./PhaseManager.jsx";
import { TaskDetailsDialog } from "./TaskDetailsDialog.jsx";
import { TaskHistoryDialog } from "./TaskHistoryDialog.jsx";
import { TimelineView } from "./TimelineView.jsx";
import { ProjectForm } from "./ProjectForm.jsx";
import { EmployeeAvatar } from "./common.jsx";

import { fetchProject, updateProjectApi } from "@/lib/api";
import {
  ensureProjectShape, phaseSummaries, summarize, projectStatusFromPhases, computePlanned,
  approveScheduleChange, rejectScheduleChange, computeAchievement, requestScheduleChange, fieldLabel,
} from "@/lib/businessLogic";
import { genId, roleCan, employeeLabel } from "@/lib/data";
import { fmt, todayISO, diffDays } from "@/lib/dateUtils";

export function ProjectDetail({ projectId, actor, onBack }) {
  const { role } = actor;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhaseId, setActivePhaseId] = useState(null);
  const [viewMode, setViewMode] = useState("phases");
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [historyTask, setHistoryTask] = useState(null);
  const [editingPhase, setEditingPhase] = useState(null);
  const [deletingPhase, setDeletingPhase] = useState(null);
  const [addTaskPhaseId, setAddTaskPhaseId] = useState(null);
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
      setActivePhaseId(prev => {
        if (prev) return prev;
        const phases = phaseSummaries(data.phases, data.tasks, today, data.meta.startDate);
        const idx = phases.findIndex(p => p.completed < p.total);
        return (idx === -1 ? phases[phases.length - 1] : phases[idx])?.id || null;
      });
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
  const persist = async (next) => {
    setDetail(next);
    try { await updateProjectApi(projectId, { meta: next.meta, phases: next.phases, tasks: next.tasks }); }
    catch (e) { console.error(e); }
  };

  const mutateTasks = (fn) => {
    setDetail(prev => {
      const next = { ...prev, tasks: fn(prev.tasks) };
      persist(next);
      return next;
    });
  };

  const handleStatusChange = (taskId, status) => {
    mutateTasks(tasks => tasks.map(t => {
      if (t.id !== taskId) return t;
      const updates = { status };
      if (status === "Not Started") { updates.actualStart = null; updates.actualFinish = null; }
      else {
        if (!t.actualStart) updates.actualStart = today;
        updates.actualFinish = status === "Completed" ? (t.actualFinish || today) : null;
      }
      const merged = { ...t, ...updates };
      merged.achievement = status === "Completed" ? computeAchievement(merged) : null;
      merged.history = [...(t.history || []), { ts: new Date().toISOString(), field: "Status", from: t.status, to: status, editedBy: actor.name || actor.role, reason: "" }];
      return merged;
    }));
  };

  const handleSaveTaskPatch = (taskId, patch) => {
    mutateTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, ...patch } : t));
  };

  const handleApprove = (taskId) => {
    mutateTasks(tasks => tasks.map(t => t.id === taskId ? approveScheduleChange(t, actor) : t));
  };
  const handleReject = (taskId, comment) => {
    mutateTasks(tasks => tasks.map(t => t.id === taskId ? rejectScheduleChange(t, actor, comment) : t));
  };
  const handleDeleteTask = (taskId) => {
    mutateTasks(tasks => tasks.filter(t => t.id !== taskId));
  };

  // Owner and notes are non-scheduling fields — they apply immediately
  // for anyone who can edit the task at all, same as a status change.
  const commitField = (taskId, field, value) => {
    mutateTasks(tasks => tasks.map(t => {
      if (t.id !== taskId || t[field] === value) return t;
      return {
        ...t, [field]: value,
        history: [...(t.history || []), { ts: new Date().toISOString(), field: fieldLabel(field), from: t[field], to: value, editedBy: actor.name || actor.role, reason: "" }],
      };
    }));
  };
  const handleCommitOwner = (taskId, ownerId) => commitField(taskId, "assignedTo", ownerId);
  const handleCommitDescription = (taskId, description) => commitField(taskId, "description", description);

  // Scheduling fields (day offset / planned start / duration) go through
  // the approval branch point: direct apply for roles with
  // editScheduleDirectly, otherwise a Pending Approval change request.
  // Both current roles (Admin/Developer) have direct rights for now, so
  // the reason prompt below is a placeholder for when that's no longer
  // universally true — it isn't reachable in the current permission set.
  const commitSchedule = (taskId, scheduleChanges) => {
    mutateTasks(tasks => tasks.map(t => {
      if (t.id !== taskId) return t;
      const changed = Object.entries(scheduleChanges).some(([field, to]) => t[field] !== to);
      if (!changed) return t;
      if (canEditScheduleDirectly) {
        const history = [...(t.history || [])];
        Object.entries(scheduleChanges).forEach(([field, to]) => {
          if (t[field] !== to) history.push({ ts: new Date().toISOString(), field: fieldLabel(field), from: t[field], to, editedBy: actor.name || actor.role, reason: "" });
        });
        return { ...t, ...scheduleChanges, history };
      }
      const reason = typeof window !== "undefined" ? window.prompt("Reason for this scheduling change (required for approval):", "") : "";
      if (!reason) return t;
      return requestScheduleChange(t, scheduleChanges, actor, reason);
    }));
  };
  const handleCommitOffset = (taskId, rawOffset) => {
    const task = detail.tasks.find(t => t.id === taskId);
    if (!task) return;
    const offset = Math.max(0, Number(rawOffset) || 0);
    if (offset === task.dayOffset) return;
    const { plannedStart, plannedFinish } = computePlanned(detail.meta.startDate, offset, task.duration);
    commitSchedule(taskId, { dayOffset: offset, plannedStart, plannedFinish });
  };
  const handleCommitStartDate = (taskId, nextDate) => {
    const task = detail.tasks.find(t => t.id === taskId);
    if (!task || !nextDate || nextDate === task.plannedStart) return;
    const offset = Math.max(0, diffDays(nextDate, detail.meta.startDate));
    const { plannedStart, plannedFinish } = computePlanned(detail.meta.startDate, offset, task.duration);
    commitSchedule(taskId, { dayOffset: offset, plannedStart, plannedFinish });
  };
  const handleCommitDuration = (taskId, rawDuration) => {
    const task = detail.tasks.find(t => t.id === taskId);
    const duration = Math.max(1, Number(rawDuration) || 1);
    if (!task || duration === task.duration) return;
    const { plannedFinish } = computePlanned(detail.meta.startDate, task.dayOffset, duration);
    commitSchedule(taskId, { duration, plannedFinish });
  };
  const handleAddTask = ({ name, assignedTo, dayOffset, duration }) => {
    if (!addTaskPhaseId || !detail) return;
    const { plannedStart, plannedFinish } = computePlanned(detail.meta.startDate, dayOffset, duration);
    const siblingOrders = detail.tasks.filter(t => t.phaseId === addTaskPhaseId).map(t => t.order);
    const newTask = {
      id: genId("task"), phaseId: addTaskPhaseId, order: siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0,
      name, description: "", assignedTo, priority: "Medium", dependencies: [],
      dayOffset, duration, plannedStart, plannedFinish, actualStart: null, actualFinish: null,
      status: "Not Started", pendingChange: null, achievement: null,
      history: [{ ts: new Date().toISOString(), field: "Task Created", from: null, to: name, editedBy: actor.name || actor.role, reason: "" }],
    };
    mutateTasks(tasks => [...tasks, newTask]);
    setAddTaskPhaseId(null);
  };
  const handleReorder = (dragId, dropId) => {
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

  const handleEditPhase = ({ name, critical }) => {
    setDetail(prev => {
      const next = { ...prev, phases: prev.phases.map(p => p.id === editingPhase.id ? { ...p, name, critical } : p) };
      persist(next);
      return next;
    });
    setEditingPhase(null);
  };
  const handleDeletePhase = () => {
    const phaseId = deletingPhase.id;
    setDetail(prev => {
      const remainingPhases = prev.phases.filter(p => p.id !== phaseId);
      const next = { ...prev, phases: remainingPhases, tasks: prev.tasks.filter(t => t.phaseId !== phaseId) };
      persist(next);
      if (activePhaseId === phaseId) setActivePhaseId(remainingPhases[0]?.id || null);
      return next;
    });
    setDeletingPhase(null);
  };

  const saveSettings = async (meta) => {
    if (!canEditProjectSettings) return;
    setSavingSettings(true);
    const startChanged = meta.startDate !== detail.meta.startDate;
    const tasks = startChanged
      ? detail.tasks.map(t => ({ ...t, ...computePlanned(meta.startDate, t.dayOffset, t.duration) }))
      : detail.tasks;
    const next = { meta: { ...detail.meta, ...meta }, phases: detail.phases, tasks };
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
  const bucket = projectStatusFromPhases(phaseRows);
  const bucketColor = bucket === "Delayed" ? "error" : bucket === "In Progress" ? "warning" : "success";

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={onBack} size="small" sx={{ mb: 1.5, color: "text.secondary" }}>Portfolio</Button>

      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}
        sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 1.75 }}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={detail.meta.type || "Product"} size="small" variant="outlined" />
            <Chip label={bucket} size="small" color={bucketColor} />
          </Stack>
          <Typography variant="h5" fontWeight={600} sx={{ mt: 0.5 }}>{detail.meta.name}</Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 0.75 }} color="text.secondary" flexWrap="wrap">
            <Stack direction="row" spacing={0.5} alignItems="center"><BusinessIcon sx={{ fontSize: 14 }} /><Typography variant="caption">{detail.meta.customer}</Typography></Stack>
            {detail.meta.owner && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <EmployeeAvatar employeeId={detail.meta.owner} size={18} />
                <Typography variant="caption">{employeeLabel(detail.meta.owner)}</Typography>
              </Stack>
            )}
            <Stack direction="row" spacing={0.5} alignItems="center"><CalendarMonthIcon sx={{ fontSize: 14 }} /><Typography variant="caption" sx={{ fontFamily: "IBM Plex Mono, monospace" }}>{fmt(detail.meta.startDate)} → {fmt(detail.meta.endDate)}</Typography></Stack>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {canEditProjectSettings && (
            <Tooltip title="Project settings"><IconButton size="small" onClick={() => setShowSettings(true)}><SettingsIcon fontSize="small" /></IconButton></Tooltip>
          )}
          <CompletionRing pct={s.pct} size={52} />
        </Stack>
      </Stack>

      <Stack direction="row" spacing={3} sx={{ my: 1.75 }} flexWrap="wrap">
        <Stat label="Tasks completed" value={`${s.completed} / ${s.total}`} />
        <Stat label="Delayed" value={s.delayed} color={s.delayed > 0 ? "error.main" : "success.main"} />
        <Stat label="Target end date" value={fmt(detail.meta.endDate)} mono />
        <Stat label="Planned finish" value={fmt(s.plannedEnd)} mono />
      </Stack>

      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
        <ToggleButtonGroup size="small" exclusive value={viewMode} onChange={(e, v) => v && setViewMode(v)}>
          <ToggleButton value="phases"><GridViewIcon sx={{ fontSize: 16, mr: 0.75 }} />Phases</ToggleButton>
          <ToggleButton value="timeline"><TimelineIcon sx={{ fontSize: 16, mr: 0.75 }} />Timeline</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {viewMode === "phases" ? (
        <Stack direction="row" spacing={2} alignItems="flex-start">
          {/* Sticky + independently scrollable: stays put while the task
              panel's own content scrolls the page, instead of scrolling
              away together as one long column. */}
          <Box sx={{
            position: "sticky", top: 96, alignSelf: "flex-start", flexShrink: 0,
            maxHeight: "calc(100vh - 112px)", overflowY: "auto", pr: 0.5,
          }}>
            <PhaseNavList
              phases={phaseRows} activeId={activePhaseRow?.id} onSelect={setActivePhaseId}
              canManage={canManagePhases} onEditPhase={setEditingPhase} onDeletePhase={setDeletingPhase}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {activePhaseRow && (
              <PhaseTaskPanel
                phase={activePhaseRow} tasks={activeTasks} projectStartDate={detail.meta.startDate} today={today}
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
        <TimelineView phases={detail.phases} tasks={detail.tasks} projectStartDate={detail.meta.startDate} projectEndDate={detail.meta.endDate} today={today} />
      )}

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
      {editingPhase && <EditPhaseDialog phase={editingPhase} onClose={() => setEditingPhase(null)} onSave={handleEditPhase} />}
      {deletingPhase && (
        <DeletePhaseDialog phase={deletingPhase} taskCount={detail.tasks.filter(t => t.phaseId === deletingPhase.id).length}
          onClose={() => setDeletingPhase(null)} onConfirm={handleDeletePhase} />
      )}
      {addTaskPhaseId && (
        <AddTaskDialog projectStartDate={detail.meta.startDate} onClose={() => setAddTaskPhaseId(null)} onCreate={handleAddTask} />
      )}
    </Box>
  );
}

function Stat({ label, value, color, mono }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: 10.5, lineHeight: 1.6 }}>{label}</Typography>
      <Typography sx={{
        fontFamily: mono ? "IBM Plex Mono, monospace" : '"Space Grotesk", sans-serif',
        fontSize: 16.5, fontWeight: 600, color: color || "text.primary",
      }}>
        {value}
      </Typography>
    </Box>
  );
}
