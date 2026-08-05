"use client";
import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Stack from "./Stack.jsx";
import AddIcon from "@mui/icons-material/Add";
import { OrgSelect } from "./common.jsx";
import { CompletionRing } from "./CompletionRing.jsx";
import { TaskCard } from "./TaskCard.jsx";
import { fmt } from "@/lib/dateUtils";
import { computePlanned } from "@/lib/businessLogic";
import { STATUS_HEX } from "@/lib/theme";

/**
 * Left-hand phase navigation list — one row per phase. Phases are a
 * fixed 12-phase template; there is deliberately no edit/delete/rename
 * control for the phase itself here (only tasks within a phase are
 * editable — see PhaseTaskPanel's "Add task" and each TaskCard).
 */
export function PhaseNavList({ phases, activeId, onSelect }) {
  return (
    <Stack spacing={1} sx={{ width: 260, flexShrink: 0, height: "100%", overflowY: "auto", pr: 0.5 }}>
      {phases.map((p) => (
        <Box
          key={p.id}
          onClick={() => onSelect(p.id)}
          sx={{
            display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer",
            bgcolor: p.id === activeId ? "background.default" : "background.paper",
            border: "1px solid", borderColor: p.id === activeId ? (p.color === "slate" ? "divider" : STATUS_HEX[p.color]) : "divider",
            borderRadius: 2.5, p: 1.25, flexShrink: 0,
          }}
        >
          <CompletionRing pct={p.total ? Math.round((p.completed / p.total) * 100) : 0} size={40} color={p.color} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={0.5}>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "IBM Plex Mono, monospace" }}>
                {p.name.split(" · ")[0]}
              </Typography>
              {p.critical && <Tooltip title="Critical phase — delays here delay the whole project"><Typography variant="caption" sx={{ color: STATUS_HEX.red }}>●</Typography></Tooltip>}
            </Stack>
            <Typography variant="body2" noWrap sx={{ lineHeight: 1.3 }}>{p.name.split(" · ").slice(1).join(" · ")}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "IBM Plex Mono, monospace" }}>
              {p.completed}/{p.total} done{p.delayed > 0 ? ` · ${p.delayed} late` : ""}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

export function AddTaskDialog({ projectStartDate, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [assignedTo, setAssignedTo] = useState(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [duration, setDuration] = useState(1);
  const canSubmit = name.trim() && Number(duration) >= 1;
  const preview = computePlanned(projectStartDate, Number(dayOffset) || 0, Number(duration) || 1);
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
  phase, tasks, projectStartDate, today, canEdit, canManage, canApprove,
  onUpdateTask, onOpenEditor, onOpenHistory, onDeleteTask, onApprove, onReject,
  onAddTask, onReorder,
  onCommitOwner, onCommitOffset, onCommitStartDate, onCommitDuration, onCommitDescription,
}) {
  const [dragId, setDragId] = useState(null);
  const sorted = tasks.slice().sort((a, b) => a.order - b.order);
  const wStart = phase.weekStart, wEnd = phase.weekEnd;

  return (
    <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2.5, bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" }}>
        <Box>
          <Typography variant="h6">{phase.name}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "IBM Plex Mono, monospace" }}>
            {fmt(phase.phaseStart)} → {fmt(phase.phaseEnd)}{wStart ? ` · Week ${wStart}${wEnd !== wStart ? `–${wEnd}` : ""}` : ""}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "IBM Plex Mono, monospace" }}>
            {phase.completed}/{phase.total} complete{phase.delayed > 0 ? ` · ${phase.delayed} delayed` : ""}
          </Typography>
          {canManage && <Button size="small" startIcon={<AddIcon />} onClick={onAddTask}>Add task</Button>}
        </Stack>
      </Box>
      <Stack spacing={2} sx={{ p: 2 }}>
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
              task={t} canEdit={canEdit} canApprove={canApprove} canReorder={canManage} today={today}
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
