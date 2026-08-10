"use client";
import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import { alpha, useTheme } from "@mui/material/styles";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Stack from "./Stack";
import AddIcon from "@mui/icons-material/Add";
import { OrgSelect } from "./common";
import { CompletionRing } from "./CompletionRing";
import { TaskCard } from "./TaskCard";
import { fmt } from "@/lib/dateUtils";
import { computePlanned } from "@/lib/businessLogic";
import { useStatusHex } from "@/lib/theme";
import type { ChecklistItem, PhaseSummary, Task, TaskStatus, WeekDay } from "@/lib/types";

/**
 * Left-hand phase navigation list — one row per phase. Phases are a
 * fixed 12-phase template; there is deliberately no edit/delete/rename
 * control for the phase itself here (only tasks within a phase are
 * editable — see PhaseTaskPanel's "Add task" and each TaskCard).
 */
export function PhaseNavList({ phases, activeId, onSelect }: {
  phases: PhaseSummary[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const STATUS_HEX = useStatusHex();
  const theme = useTheme();
  return (
    <Box sx={{
      width: 280, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column",
      bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 3,
      boxShadow: "0 1px 3px rgba(16,24,40,0.06)", overflow: "hidden",
    }}>
      <Box sx={{
        px: 2.25, minHeight: 80, flexShrink: 0, borderBottom: "1px solid", borderColor: "divider",
        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.05 : 0.09),
        display: "flex", flexDirection: "column", justifyContent: "center",
      }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.2 }}>Phases</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, mt: 0.1, display: "block" }}>{phases.length} total</Typography>
      </Box>
      <Stack spacing={1.25} sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 1.25 }}>
        {phases.map((p) => {
          const active = p.id === activeId;
          return (
            <Box
              key={p.id}
              onClick={() => onSelect(p.id)}
              sx={{
                display: "flex", alignItems: "center", gap: 1.75, cursor: "pointer",
                bgcolor: active ? alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.07 : 0.14) : "background.paper",
                border: active ? "2px solid" : "1px solid",
                borderColor: active ? "primary.main" : "divider",
                borderRadius: 2.5, p: active ? 1.375 : 1.5, flexShrink: 0,
                boxShadow: active ? `0 4px 10px ${alpha(theme.palette.primary.main, 0.2)}` : "0 1px 2px rgba(16,24,40,0.04)",
                transition: "border-color .15s ease, box-shadow .15s ease, background-color .15s ease",
              }}
            >
              <CompletionRing pct={p.total ? Math.round((p.completed / p.total) * 100) : 0} size={50} color={p.color} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {p.name.split(" · ")[0]}
                  </Typography>
                  {p.critical && <Tooltip title="Critical phase — delays here delay the whole project"><Typography variant="caption" sx={{ color: STATUS_HEX.red, lineHeight: 1 }}>●</Typography></Tooltip>}
                </Stack>
                <Typography variant="body2" noWrap sx={{ lineHeight: 1.35, mt: 0.2, fontWeight: 600 }}>{p.name.split(" · ").slice(1).join(" · ")}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.2, display: "block" }}>
                  {p.completed}/{p.total} done{p.delayed > 0 ? ` · ${p.delayed} late` : ""}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

export interface NewTaskPayload {
  name: string;
  assignedTo: string | null;
  dayOffset: number;
  duration: number;
}

export function AddTaskDialog({ projectStartDate, projectWeekOff, onClose, onCreate }: {
  projectStartDate: string;
  projectWeekOff: WeekDay[];
  onClose: () => void;
  onCreate: (payload: NewTaskPayload) => void;
}) {
  const [name, setName] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dayOffset, setDayOffset] = useState<string | number>(0);
  const [duration, setDuration] = useState<string | number>(1);
  const canSubmit = name.trim() && Number(duration) >= 1;
  const preview = computePlanned(projectStartDate, Number(dayOffset) || 0, Number(duration) || 1, projectWeekOff);
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add task</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <TextField label="Task name" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus />
        <OrgSelect label="Assigned to" value={assignedTo} onChange={setAssignedTo} />
        <Stack direction="row" spacing={2}>
          <TextField label="Day from project start" type="number" fullWidth slotProps={{ htmlInput: { min: 0 } }}
            value={dayOffset} onChange={(e) => setDayOffset(e.target.value)} />
          <TextField label="Duration (working days)" type="number" fullWidth slotProps={{ htmlInput: { min: 1 } }}
            value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Plans to {fmt(preview.plannedStart)} → {fmt(preview.plannedFinish)} (business days, weekends skipped)
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canSubmit} startIcon={<AddIcon />}
          onClick={() => onCreate({ name: name.trim(), assignedTo, dayOffset: Number(dayOffset), duration: Number(duration) })}>
          Add task
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Task list for the active phase. Supports native HTML5 drag & drop
 * reordering (no extra dependency) when `canReorder` is true — dragging
 * a card over another swaps their `order` values via `onReorder`.
 */
export function PhaseTaskPanel({
  phase, tasks, today, weekOff, canEdit, canManage, canApprove,
  onUpdateTask, onOpenEditor, onOpenHistory, onDeleteTask, onApprove, onReject,
  onAddTask, onReorder,
  onCommitOwner, onCommitOffset, onCommitStartDate, onCommitDuration, onCommitDescription,
  onChecklistChange,
}: {
  phase: PhaseSummary;
  tasks: Task[];
  projectStartDate: string;
  today: string;
  weekOff: WeekDay[];
  canEdit: boolean;
  canManage: boolean;
  canApprove: boolean;
  onUpdateTask: (taskId: string, status: TaskStatus) => void;
  onOpenEditor: (task: Task) => void;
  onOpenHistory: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onApprove: (taskId: string) => void;
  onReject: (taskId: string, comment: string) => void;
  onAddTask: () => void;
  onReorder: (dragId: string, dropId: string) => void;
  onCommitOwner: (taskId: string, ownerId: string | null) => void;
  onCommitOffset: (taskId: string, offset: string | number) => void;
  onCommitStartDate: (taskId: string, date: string) => void;
  onCommitDuration: (taskId: string, duration: string | number) => void;
  onCommitDescription: (taskId: string, description: string) => void;
  onChecklistChange: (taskId: string, checklist: ChecklistItem[]) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  // Only one task accordion open at a time — expanding a new one closes
  // whichever was previously open.
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const sorted = tasks.slice().sort((a, b) => a.order - b.order);
  const wStart = phase.weekStart, wEnd = phase.weekEnd;

  const STATUS_HEX = useStatusHex();
  const theme = useTheme();
  const phaseNumber = phase.name.split(" · ")[0];
  const phaseTitle = phase.name.split(" · ").slice(1).join(" · ");

  return (
    <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 3, overflow: "hidden", boxShadow: "0 1px 3px rgba(16,24,40,0.06)" }}>
      <Box sx={{
        display: "flex", justifyContent: "space-between", alignItems: "center", px: 2.75, minHeight: 80,
        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.08 : 0.12),
        borderBottom: "2px solid", borderColor: alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.25 : 0.35),
      }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, lineHeight: 1.2, color: "primary.light", display: "block" }}>
            PHASE {phaseNumber}
          </Typography>
          <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2, mt: 0.1 }}>{phaseTitle}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, display: "block", mt: 0.1 }}>
            {fmt(phase.phaseStart)} → {fmt(phase.phaseEnd)}{wStart ? ` · Week ${wStart}${wEnd !== wStart ? `–${wEnd}` : ""}` : ""}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flexShrink: 0 }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>
              {phase.completed}/{phase.total} <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>complete</Typography>
            </Typography>
            {phase.delayed > 0 && (
              <Typography variant="caption" sx={{ display: "block", color: STATUS_HEX.red, fontWeight: 700 }}>
                {phase.delayed} delayed
              </Typography>
            )}
          </Box>
          {canManage && <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={onAddTask}>Add task</Button>}
        </Stack>
      </Box>
      <Stack spacing={1.5} sx={{ p: 2.5 }}>
        {sorted.map((t) => (
          <Box
            key={t.id}
            draggable={canManage}
            onDragStart={() => setDragId(t.id)}
            onDragOver={(e) => canManage && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (canManage && dragId && dragId !== t.id) onReorder(dragId, t.id);
              setDragId(null);
            }}
            sx={{ opacity: dragId === t.id ? 0.5 : 1 }}
          >
            <TaskCard
              task={t} canEdit={canEdit} canApprove={canApprove} canReorder={canManage} today={today} weekOff={weekOff}
              expanded={expandedTaskId === t.id}
              onToggleExpand={() => setExpandedTaskId(prev => prev === t.id ? null : t.id)}
              onStatusChange={(status) => onUpdateTask(t.id, status)}
              onOpenEditor={() => onOpenEditor(t)}
              onOpenHistory={() => onOpenHistory(t)}
              onDelete={() => onDeleteTask(t.id)}
              onApprove={() => onApprove(t.id)}
              onReject={(comment) => onReject(t.id, comment)}
              onCommitOwner={(ownerId) => onCommitOwner(t.id, ownerId)}
              onCommitOffset={(offset) => onCommitOffset(t.id, offset)}
              onCommitStartDate={(date) => onCommitStartDate(t.id, date)}
              onCommitDuration={(duration) => onCommitDuration(t.id, duration)}
              onCommitDescription={(desc) => onCommitDescription(t.id, desc)}
              onChecklistChange={(checklist) => onChecklistChange(t.id, checklist)}
            />
          </Box>
        ))}
        {sorted.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>No tasks in this phase.</Typography>
        )}
      </Stack>
    </Box>
  );
}
