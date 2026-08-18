"use client";

import React, { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Skeleton from "@mui/material/Skeleton";
import Collapse from "@mui/material/Collapse";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import Stack from "./Stack";
import { useAppContext } from "@/context/AppContext";
import { VIEW_ONLY_HINT } from "@/lib/data";
import { DASHBOARD_COLORS } from "@/lib/theme";
import {
  useGetProjectTemplateQuery,
  useAddTemplateTaskMutation,
  useUpdateTemplateTaskMutation,
  useDeleteTemplateTaskMutation,
} from "@/store/api/projectTemplatesApi";
import type { PhaseDiscipline, PhaseTemplateItem, TaskTemplateItem } from "@/lib/types";

function errText(err: unknown, fallback: string): string {
  const msg = (err as { data?: { message?: string | string[] } })?.data?.message;
  if (Array.isArray(msg)) return msg[0] ?? fallback;
  return msg || fallback;
}

/** Accent colour per discipline (common phases stay neutral). */
const DISCIPLINE_COLOR: Record<PhaseDiscipline, string> = {
  Software: DASHBOARD_COLORS.blue,
  Vision: DASHBOARD_COLORS.violet,
  Automation: DASHBOARD_COLORS.orange,
};
const accentFor = (d: PhaseDiscipline | null) => (d ? DISCIPLINE_COLOR[d] : DASHBOARD_COLORS.slate);

/** "01 · Project Initialization" → { num: "01", title: "Project Initialization" } */
function splitPhaseName(name: string) {
  const [num, ...rest] = name.split(" · ");
  return rest.length ? { num, title: rest.join(" · ") } : { num: "", title: name };
}

/** One editable task row — commits a field on blur only if it changed. */
function TaskRow({ task, canEdit, accent, onSave, onDelete }: {
  task: TaskTemplateItem;
  canEdit: boolean;
  accent: string;
  onSave: (patch: { name?: string; dayOffset?: number; duration?: number }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(task.name);
  const [dayOffset, setDayOffset] = useState(String(task.dayOffset));
  const [duration, setDuration] = useState(String(task.duration));

  useEffect(() => { setName(task.name); }, [task.name]);
  useEffect(() => { setDayOffset(String(task.dayOffset)); }, [task.dayOffset]);
  useEffect(() => { setDuration(String(task.duration)); }, [task.duration]);

  const numSx = { width: 84, "& input": { textAlign: "center" as const } };
  return (
    <Stack direction="row" gap={1} alignItems="center" sx={{
      py: 0.75, px: 1, borderRadius: 1.5,
      "&:hover": { bgcolor: "action.hover" },
      transition: "background-color .12s ease",
    }}>
      <Box sx={{ width: 4, alignSelf: "stretch", borderRadius: 2, bgcolor: alpha(accent, 0.5), flexShrink: 0, my: 0.25 }} />
      <TextField
        size="small" value={name} disabled={!canEdit} fullWidth variant="standard"
        onChange={(e) => setName(e.target.value)}
        onBlur={() => { const v = name.trim(); if (v && v !== task.name) onSave({ name: v }); else setName(task.name); }}
        slotProps={{ input: { disableUnderline: !canEdit }, htmlInput: { style: { fontSize: 13, fontWeight: 500 } } }}
      />
      <TextField
        size="small" type="number" value={dayOffset} disabled={!canEdit} sx={numSx}
        slotProps={{ htmlInput: { min: 0, style: { fontSize: 13 } } }}
        onChange={(e) => setDayOffset(e.target.value)}
        onBlur={() => { const n = Number(dayOffset); if (Number.isFinite(n) && n >= 0 && n !== task.dayOffset) onSave({ dayOffset: n }); else setDayOffset(String(task.dayOffset)); }}
      />
      <TextField
        size="small" type="number" value={duration} disabled={!canEdit} sx={numSx}
        slotProps={{ htmlInput: { min: 1, style: { fontSize: 13 } } }}
        onChange={(e) => setDuration(e.target.value)}
        onBlur={() => { const n = Number(duration); if (Number.isFinite(n) && n >= 1 && n !== task.duration) onSave({ duration: n }); else setDuration(String(task.duration)); }}
      />
      <Tooltip title={canEdit ? "Delete task" : VIEW_ONLY_HINT}>
        <span>
          <IconButton size="small" disabled={!canEdit} onClick={onDelete}
            sx={{ color: "text.disabled", "&:hover": { color: DASHBOARD_COLORS.red } }}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

/** Inline "add task" form under each phase. */
function AddTaskRow({ canEdit, onAdd }: { canEdit: boolean; onAdd: (t: { name: string; dayOffset: number; duration: number }) => void }) {
  const [name, setName] = useState("");
  const [dayOffset, setDayOffset] = useState("0");
  const [duration, setDuration] = useState("1");
  const valid = name.trim() && Number(dayOffset) >= 0 && Number(duration) >= 1;
  const submit = () => { if (!valid) return; onAdd({ name: name.trim(), dayOffset: Number(dayOffset), duration: Number(duration) }); setName(""); setDayOffset("0"); setDuration("1"); };
  if (!canEdit) return null;
  const numSx = { width: 84, "& input": { textAlign: "center" as const } };
  return (
    <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1, pt: 1.25, px: 1, borderTop: "1px dashed", borderColor: "divider" }}>
      <AddIcon sx={{ fontSize: 16, color: "text.disabled", ml: "-2px" }} />
      <TextField size="small" placeholder="Add a task…" value={name} fullWidth variant="standard"
        onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        slotProps={{ htmlInput: { style: { fontSize: 13 } } }} />
      <TextField size="small" type="number" value={dayOffset} sx={numSx}
        slotProps={{ htmlInput: { min: 0, style: { fontSize: 13 } } }} onChange={(e) => setDayOffset(e.target.value)} />
      <TextField size="small" type="number" value={duration} sx={numSx}
        slotProps={{ htmlInput: { min: 1, style: { fontSize: 13 } } }} onChange={(e) => setDuration(e.target.value)} />
      <Button size="small" variant="text" disabled={!valid} onClick={submit} sx={{ flexShrink: 0, minWidth: 56 }}>Add</Button>
    </Stack>
  );
}

/** A collapsible phase card. */
function PhaseCard({ phase, canEdit, expanded, onToggle, onAdd, onSave, onDelete }: {
  phase: PhaseTemplateItem;
  canEdit: boolean;
  expanded: boolean;
  onToggle: () => void;
  onAdd: (t: { name: string; dayOffset: number; duration: number }) => void;
  onSave: (taskId: string, patch: { name?: string; dayOffset?: number; duration?: number }) => void;
  onDelete: (taskId: string) => void;
}) {
  const accent = accentFor(phase.discipline);
  const { num, title } = splitPhaseName(phase.name);
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", borderLeft: "3px solid", borderLeftColor: accent }}>
      <Stack direction="row" alignItems="center" gap={1.5} onClick={onToggle}
        sx={{ px: 2, py: 1.5, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}>
        <Box sx={{
          width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          bgcolor: alpha(accent, 0.14), color: accent, fontWeight: 800, fontSize: 12,
        }}>{num}</Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.2 }} noWrap>{title}</Typography>
          <Typography variant="caption" color="text.secondary">{phase.tasks.length} task{phase.tasks.length === 1 ? "" : "s"}</Typography>
        </Box>
        {phase.discipline
          ? <Chip label={phase.discipline} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: alpha(accent, 0.14), color: accent }} />
          : <Chip label="Common" size="small" variant="outlined" sx={{ height: 20, fontSize: 10.5, color: "text.secondary" }} />}
        {phase.critical && <Tooltip title="Critical phase"><Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: DASHBOARD_COLORS.red, flexShrink: 0 }} /></Tooltip>}
        <ExpandMoreIcon sx={{ color: "text.secondary", transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
      </Stack>
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ px: 2, pb: 1.75, pt: 0.5 }}>
          <Stack direction="row" gap={1} sx={{ px: 1, pb: 0.5, color: "text.secondary" }}>
            <Box sx={{ width: 4, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ flex: 1, fontWeight: 700, textTransform: "uppercase", fontSize: 10, letterSpacing: 0.4 }}>Task</Typography>
            <Typography variant="caption" sx={{ width: 84, textAlign: "center", fontWeight: 700, textTransform: "uppercase", fontSize: 10, letterSpacing: 0.4 }}>Day</Typography>
            <Typography variant="caption" sx={{ width: 84, textAlign: "center", fontWeight: 700, textTransform: "uppercase", fontSize: 10, letterSpacing: 0.4 }}>Days</Typography>
            <Box sx={{ width: 34, flexShrink: 0 }} />
          </Stack>
          {phase.tasks.map((task) => (
            <TaskRow key={task.id} task={task} canEdit={canEdit} accent={accent}
              onSave={(patch) => onSave(task.id, patch)} onDelete={() => onDelete(task.id)} />
          ))}
          <AddTaskRow canEdit={canEdit} onAdd={onAdd} />
        </Box>
      </Collapse>
    </Paper>
  );
}

/**
 * Admin screen for the master project template. Editing here changes the
 * DEFAULTS for newly created projects only — existing projects keep their own
 * tasks (a snapshot taken at creation). Phases are fixed; only tasks are
 * editable. Mutations are also enforced admin-only on the server.
 */
export function TemplateManager() {
  const { role } = useAppContext();
  const isAdmin = role === "Admin";
  const { data: phases = [], isLoading } = useGetProjectTemplateQuery();
  const [addTask] = useAddTemplateTaskMutation();
  const [updateTask] = useUpdateTemplateTaskMutation();
  const [deleteTask] = useDeleteTemplateTaskMutation();
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const totalTasks = useMemo(() => phases.reduce((a, p) => a + p.tasks.length, 0), [phases]);
  const allOpen = phases.length > 0 && expanded.size === phases.length;

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setExpanded(allOpen ? new Set() : new Set(phases.map(p => p.id)));

  const run = async (p: Promise<unknown>) => {
    try { await p; } catch (e) { setError(errText(e, "Could not save the change.")); }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto" }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Project template</Typography>
          <Typography variant="body2" color="text.secondary">The default phases and tasks new projects are built from.</Typography>
        </Box>
        {!isLoading && (
          <Stack direction="row" gap={1} alignItems="center">
            <Chip label={`${phases.length} phases`} size="small" sx={{ fontWeight: 700 }} />
            <Chip label={`${totalTasks} tasks`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
            {phases.length > 0 && (
              <Button size="small" variant="text" startIcon={allOpen ? <UnfoldLessIcon /> : <UnfoldMoreIcon />} onClick={toggleAll}>
                {allOpen ? "Collapse all" : "Expand all"}
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      <Alert severity="info" sx={{ mt: 2, mb: 2.5 }}>
        Editing here sets the defaults for <strong>new</strong> projects only — existing projects keep the tasks
        they were created with. Phases are fixed; you can add, edit and remove their tasks.
        {!isAdmin && " You have view-only access — ask an admin to make changes."}
      </Alert>

      {isLoading ? (
        <Stack gap={1.5}>
          {[0, 1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={62} />)}
        </Stack>
      ) : (
        <Stack gap={1.5}>
          {phases.map((phase) => (
            <PhaseCard
              key={phase.id} phase={phase} canEdit={isAdmin}
              expanded={expanded.has(phase.id)} onToggle={() => toggle(phase.id)}
              onAdd={(t) => run(addTask({ phaseId: phase.id, ...t }).unwrap())}
              onSave={(taskId, patch) => run(updateTask({ taskId, ...patch }).unwrap())}
              onDelete={(taskId) => run(deleteTask({ taskId }).unwrap())}
            />
          ))}
        </Stack>
      )}

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="error" variant="filled" onClose={() => setError("")}>{error}</Alert>
      </Snackbar>
    </Box>
  );
}
