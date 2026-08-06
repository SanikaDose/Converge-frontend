"use client";
import React, { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import { PRIORITY_OPTIONS } from "@/lib/data";
import { fieldLabel } from "@/lib/businessLogic";
import type { Actor, HistoryEntry, Priority, Task } from "@/lib/types";

export type TaskDetailsPatch = Partial<Pick<Task, "name" | "priority" | "dependencies">> & { history: HistoryEntry[] };

/**
 * Extended task editor — a centered modal (consistent with every other
 * editor in this app: ProjectForm, TicketForm, EditPhaseDialog are all
 * Dialogs) covering the fields that don't live inline on the task card:
 * name, priority, dependencies. Owner, description, and scheduling are
 * edited directly on the card itself, so they're not duplicated here.
 */
export function TaskDetailsDialog({ task, allTasks, actor, onClose, onSave }: {
  task: Task;
  allTasks: Task[];
  actor: Actor;
  onClose: () => void;
  onSave: (taskId: string, patch: TaskDetailsPatch) => void;
}) {
  const [name, setName] = useState(task.name);
  const [priority, setPriority] = useState<Priority>(task.priority || "Medium");
  const [dependencies, setDependencies] = useState<string[]>(task.dependencies || []);
  const [error, setError] = useState("");

  const otherTasks = useMemo(() => allTasks.filter(t => t.id !== task.id), [allTasks, task.id]);

  function handleSave() {
    if (!name.trim()) { setError("Task name is required."); return; }
    if (dependencies.some(depId => {
      const dep = otherTasks.find(t => t.id === depId);
      return dep && (dep.dependencies || []).includes(task.id);
    })) { setError("Circular dependency: one of these tasks already depends on this task."); return; }

    const ts = new Date().toISOString();
    const history: HistoryEntry[] = [...(task.history || [])];
    const changes: Partial<Pick<Task, "name" | "priority" | "dependencies">> = {};
    if (name.trim() !== task.name) changes.name = name.trim();
    if (priority !== task.priority) changes.priority = priority;
    if (JSON.stringify(dependencies) !== JSON.stringify(task.dependencies || [])) changes.dependencies = dependencies;

    (Object.entries(changes) as [keyof typeof changes, unknown][]).forEach(([field, to]) => {
      history.push({ ts, field: fieldLabel(field), from: task[field], to, editedBy: actor.name || actor.role, reason: "" });
    });

    onSave(task.id, { ...changes, history });
    onClose();
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit task details</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}>
        <TextField label="Task name" value={name} onChange={(e) => setName(e.target.value)}
          error={!!error && !name.trim()} required fullWidth autoFocus />

        <FormControl fullWidth>
          <InputLabel>Priority</InputLabel>
          <Select label="Priority" value={priority} onChange={(e: SelectChangeEvent) => setPriority(e.target.value as Priority)}>
            {PRIORITY_OPTIONS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Dependencies</InputLabel>
          <Select<string[]>
            multiple label="Dependencies" value={dependencies}
            onChange={(e) => setDependencies(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {selected.map((id) => {
                  const t = otherTasks.find(t => t.id === id);
                  return <Chip key={id} label={t ? t.name : id} size="small" />;
                })}
              </Box>
            )}
          >
            {otherTasks.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </Select>
        </FormControl>

        {error && <Box sx={{ color: "error.main", fontSize: 13 }}>{error}</Box>}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>Save changes</Button>
      </DialogActions>
    </Dialog>
  );
}
