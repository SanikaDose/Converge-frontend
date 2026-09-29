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
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import InputAdornment from "@mui/material/InputAdornment";
import Divider from "@mui/material/Divider";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import SearchIcon from "@mui/icons-material/Search";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";
import { useRouter } from "next/navigation";
import Stack from "./Stack";
import { ProjectForm, type ProjectFormPayload } from "./ProjectForm";
import { useAppContext } from "@/context/AppContext";
import { VIEW_ONLY_HINT, PHASE_DISCIPLINE_OPTIONS, roleCan } from "@/lib/data";
import { useCreateProjectMutation } from "@/store/api/projectsApi";
import { DASHBOARD_COLORS } from "@/lib/theme";
import {
  useGetProjectTemplatesQuery,
  useGetTemplatePhasesQuery,
  useCreateProjectTemplateMutation,
  useUpdateProjectTemplateMutation,
  useDeleteProjectTemplateMutation,
  useAddTemplatePhaseMutation,
  useUpdateTemplatePhaseMutation,
  useDeleteTemplatePhaseMutation,
  useAddTemplateTaskMutation,
  useReorderTemplateTasksMutation,
  useUpdateTemplateTaskMutation,
  useDeleteTemplateTaskMutation,
} from "@/store/api/projectTemplatesApi";
import type { PhaseDiscipline, PhaseTemplateItem, ProjectTemplateSummary, TaskTemplateItem } from "@/lib/types";

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
function TaskRow({ task, canEdit, accent, onSave, onDelete, drag }: {
  task: TaskTemplateItem;
  canEdit: boolean;
  accent: string;
  onSave: (patch: { name?: string; description?: string; dayOffset?: number; duration?: number; criticalPoints?: string[] }) => void;
  onDelete: () => void;
  drag?: {
    dragging: boolean;
    dropEdge: "top" | "bottom" | null;
    onDragStart: () => void;
    onDragEnter: () => void;
    onDragEnd: () => void;
    onDrop: () => void;
  };
}) {
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description ?? "");
  const [dayOffset, setDayOffset] = useState(String(task.dayOffset));
  const [duration, setDuration] = useState(String(task.duration));
  // Critical points — plain text lines that seed each generated task's checklist.
  const [points, setPoints] = useState<string[]>(task.criticalPoints ?? []);
  const [newPoint, setNewPoint] = useState("");

  useEffect(() => { setName(task.name); }, [task.name]);
  useEffect(() => { setDescription(task.description ?? ""); }, [task.description]);
  useEffect(() => { setDayOffset(String(task.dayOffset)); }, [task.dayOffset]);
  useEffect(() => { setDuration(String(task.duration)); }, [task.duration]);
  useEffect(() => { setPoints(task.criticalPoints ?? []); }, [task.criticalPoints]);

  const addPoint = () => {
    const v = newPoint.trim();
    if (!v) return;
    const next = [...(task.criticalPoints ?? []), v];
    setPoints(next); onSave({ criticalPoints: next }); setNewPoint("");
  };
  const removePoint = (i: number) => {
    const next = points.filter((_, idx) => idx !== i);
    setPoints(next); onSave({ criticalPoints: next });
  };
  const commitPoint = (i: number) => {
    const orig = task.criticalPoints ?? [];
    const v = (points[i] ?? "").trim();
    if (v === (orig[i] ?? "")) { setPoints(orig); return; }
    const next = v ? points.map((p, idx) => idx === i ? v : p) : points.filter((_, idx) => idx !== i);
    setPoints(next); onSave({ criticalPoints: next });
  };

  const numSx = { width: 84, "& input": { textAlign: "center" as const } };
  const dropLine = { content: '""', position: "absolute" as const, left: 8, right: 8, height: 2, borderRadius: 2, bgcolor: accent };
  return (
    <Stack direction="row" gap={1} alignItems="flex-start"
      onDragOver={drag ? (e) => { e.preventDefault(); drag.onDragEnter(); } : undefined}
      onDrop={drag ? (e) => { e.preventDefault(); drag.onDrop(); } : undefined}
      sx={{
        position: "relative",
        py: 0.75, px: 1, borderRadius: 1.5,
        opacity: drag?.dragging ? 0.4 : 1,
        "&:hover": { bgcolor: "action.hover" },
        transition: "background-color .12s ease, opacity .12s ease",
        ...(drag?.dropEdge === "top" ? { "&::before": { ...dropLine, top: -1 } } : {}),
        ...(drag?.dropEdge === "bottom" ? { "&::after": { ...dropLine, bottom: -1 } } : {}),
      }}>
      {canEdit ? (
        <Tooltip title="Drag to reorder">
          <Box
            draggable
            onDragStart={(e) => {
              // Firefox won't start a drag unless dataTransfer carries something.
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", task.id);
              drag?.onDragStart();
            }}
            onDragEnd={drag?.onDragEnd}
            sx={{
              display: "flex", alignItems: "center", alignSelf: "stretch", flexShrink: 0,
              cursor: "grab", color: "text.disabled", "&:active": { cursor: "grabbing" },
              "&:hover": { color: accent }, ml: "-4px", touchAction: "none",
            }}
          >
            <DragIndicatorIcon sx={{ fontSize: 18 }} />
          </Box>
        </Tooltip>
      ) : (
        <Box sx={{ width: 4, alignSelf: "stretch", borderRadius: 2, bgcolor: alpha(accent, 0.5), flexShrink: 0, my: 0.25 }} />
      )}
      <Stack sx={{ flex: 1, minWidth: 0 }} gap={0.25}>
        <TextField
          size="small" value={name} disabled={!canEdit} fullWidth variant="standard"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => { const v = name.trim(); if (v && v !== task.name) onSave({ name: v }); else setName(task.name); }}
          slotProps={{ input: { disableUnderline: !canEdit }, htmlInput: { style: { fontSize: 13, fontWeight: 500 } } }}
        />
        <TextField
          size="small" value={description} disabled={!canEdit} fullWidth multiline variant="standard"
          placeholder={canEdit ? "Add a description…" : ""}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => { const v = description.trim(); if (v !== (task.description ?? "")) onSave({ description: v }); else setDescription(task.description ?? ""); }}
          slotProps={{ input: { disableUnderline: !canEdit }, htmlInput: { style: { fontSize: 12 } } }}
          sx={{ "& textarea": { color: "text.secondary" } }}
        />

        {/* Critical points — seed the generated task's checklist. */}
        {(points.length > 0 || canEdit) && (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ display: "block", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "text.disabled", mb: 0.25 }}>
              Critical points
            </Typography>
            {points.map((p, i) => (
              <Stack key={i} direction="row" alignItems="center" gap={0.5}>
                <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: alpha(accent, 0.7), flexShrink: 0 }} />
                <TextField
                  variant="standard" size="small" value={p} disabled={!canEdit} fullWidth
                  onChange={(e) => setPoints(points.map((x, idx) => idx === i ? e.target.value : x))}
                  onBlur={() => commitPoint(i)}
                  slotProps={{ input: { disableUnderline: true }, htmlInput: { style: { fontSize: 11.5 } } }}
                  sx={{ "& input": { color: "text.secondary" } }}
                />
                {canEdit && (
                  <IconButton size="small" onClick={() => removePoint(i)} sx={{ p: 0.25, color: "text.disabled", "&:hover": { color: DASHBOARD_COLORS.red } }}>
                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                )}
              </Stack>
            ))}
            {canEdit && (
              <Stack direction="row" alignItems="center" gap={0.5}>
                <AddIcon sx={{ fontSize: 13, color: "text.disabled", flexShrink: 0 }} />
                <TextField
                  variant="standard" size="small" placeholder="Add critical point…" value={newPoint} fullWidth
                  onChange={(e) => setNewPoint(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPoint(); } }}
                  onBlur={addPoint}
                  slotProps={{ input: { disableUnderline: true }, htmlInput: { style: { fontSize: 11.5 } } }}
                />
              </Stack>
            )}
          </Box>
        )}
      </Stack>
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
function AddTaskRow({ canEdit, onAdd }: { canEdit: boolean; onAdd: (t: { name: string; description: string; dayOffset: number; duration: number }) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dayOffset, setDayOffset] = useState("0");
  const [duration, setDuration] = useState("1");
  const valid = name.trim() && Number(dayOffset) >= 0 && Number(duration) >= 1;
  const submit = () => { if (!valid) return; onAdd({ name: name.trim(), description: description.trim(), dayOffset: Number(dayOffset), duration: Number(duration) }); setName(""); setDescription(""); setDayOffset("0"); setDuration("1"); };
  if (!canEdit) return null;
  const numSx = { width: 84, "& input": { textAlign: "center" as const } };
  return (
    <Stack direction="row" gap={1} alignItems="flex-start" sx={{ mt: 1, pt: 1.25, px: 1, borderTop: "1px dashed", borderColor: "divider" }}>
      <AddIcon sx={{ fontSize: 16, color: "text.disabled", ml: "-2px", mt: 0.5 }} />
      <Stack sx={{ flex: 1, minWidth: 0 }} gap={0.25}>
        <TextField size="small" placeholder="Add a task…" value={name} fullWidth variant="standard"
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          slotProps={{ htmlInput: { style: { fontSize: 13 } } }} />
        <TextField size="small" placeholder="Description (optional)" value={description} fullWidth multiline variant="standard"
          onChange={(e) => setDescription(e.target.value)}
          slotProps={{ htmlInput: { style: { fontSize: 12 } } }} sx={{ "& textarea": { color: "text.secondary" } }} />
      </Stack>
      <TextField size="small" type="number" value={dayOffset} sx={numSx}
        slotProps={{ htmlInput: { min: 0, style: { fontSize: 13 } } }} onChange={(e) => setDayOffset(e.target.value)} />
      <TextField size="small" type="number" value={duration} sx={numSx}
        slotProps={{ htmlInput: { min: 1, style: { fontSize: 13 } } }} onChange={(e) => setDuration(e.target.value)} />
      <Button size="small" variant="text" disabled={!valid} onClick={submit} sx={{ flexShrink: 0, minWidth: 56 }}>Add</Button>
    </Stack>
  );
}

/** A collapsible phase card. */
function PhaseCard({ phase, canEdit, expanded, onToggle, onAdd, onSave, onDelete, onReorder, onEditPhase, onDeletePhase }: {
  phase: PhaseTemplateItem;
  canEdit: boolean;
  expanded: boolean;
  onToggle: () => void;
  onAdd: (t: { name: string; description: string; dayOffset: number; duration: number }) => void;
  onSave: (taskId: string, patch: { name?: string; description?: string; dayOffset?: number; duration?: number; criticalPoints?: string[] }) => void;
  onDelete: (taskId: string) => void;
  onReorder: (taskIds: string[]) => void;
  onEditPhase: () => void;
  onDeletePhase: () => void;
}) {
  const accent = accentFor(phase.discipline);
  const { num, title } = splitPhaseName(phase.name);

  // Drag-to-reorder state, scoped to this phase's task list.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const commitReorder = (targetIndex: number) => {
    const from = dragIndex;
    setDragIndex(null);
    setOverIndex(null);
    if (from === null || from === targetIndex) return;
    const ids = phase.tasks.map((t) => t.id);
    const moved = ids[from];
    // Drop after the target when moving down, before it when moving up — the
    // insertion point the drop-line already showed the user.
    const rest = ids.filter((id) => id !== moved);
    const insertAt = rest.indexOf(ids[targetIndex]) + (from < targetIndex ? 1 : 0);
    rest.splice(insertAt, 0, moved);
    onReorder(rest);
  };
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
        {canEdit && (
          <>
            <Tooltip title="Edit phase">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEditPhase(); }} sx={{ color: "text.disabled", "&:hover": { color: accent } }}>
                <EditOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete phase">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDeletePhase(); }} sx={{ color: "text.disabled", "&:hover": { color: DASHBOARD_COLORS.red } }}>
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
        <ExpandMoreIcon sx={{ color: "text.secondary", transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
      </Stack>
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ px: 2, pb: 1.75, pt: 0.5 }}>
          <Stack direction="row" gap={1} sx={{ px: 1, pb: 0.5, color: "text.secondary" }}>
            <Box sx={{ width: canEdit ? 18 : 4, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ flex: 1, fontWeight: 700, textTransform: "uppercase", fontSize: 10, letterSpacing: 0.4 }}>Task</Typography>
            <Typography variant="caption" sx={{ width: 84, textAlign: "center", fontWeight: 700, textTransform: "uppercase", fontSize: 10, letterSpacing: 0.4 }}>Start Day</Typography>
            <Typography variant="caption" sx={{ width: 84, textAlign: "center", fontWeight: 700, textTransform: "uppercase", fontSize: 10, letterSpacing: 0.4 }}>Required Days</Typography>
            <Box sx={{ width: 34, flexShrink: 0 }} />
          </Stack>
          {phase.tasks.map((task, index) => (
            <TaskRow key={task.id} task={task} canEdit={canEdit} accent={accent}
              onSave={(patch) => onSave(task.id, patch)} onDelete={() => onDelete(task.id)}
              drag={canEdit && phase.tasks.length > 1 ? {
                dragging: dragIndex === index,
                dropEdge: overIndex === index && dragIndex !== null && dragIndex !== index
                  ? (dragIndex < index ? "bottom" : "top")
                  : null,
                onDragStart: () => setDragIndex(index),
                onDragEnter: () => setOverIndex(index),
                onDragEnd: () => { setDragIndex(null); setOverIndex(null); },
                onDrop: () => commitReorder(index),
              } : undefined} />
          ))}
          <AddTaskRow canEdit={canEdit} onAdd={onAdd} />
        </Box>
      </Collapse>
    </Paper>
  );
}

/** Create-template dialog: name, description, and blank vs duplicate. */
function NewTemplateDialog({ open, templates, busy, defaultMode = "duplicate", onClose, onCreate }: {
  open: boolean;
  templates: ProjectTemplateSummary[];
  busy: boolean;
  defaultMode?: "blank" | "duplicate";
  onClose: () => void;
  onCreate: (payload: { name: string; description: string; sourceTemplateId?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"blank" | "duplicate">("duplicate");
  const [sourceId, setSourceId] = useState<string>("");
  useEffect(() => {
    if (!open) return;
    setName(""); setDescription(""); setMode(templates.length ? defaultMode : "blank");
    setSourceId(templates.find(t => t.isDefault)?.id ?? templates[0]?.id ?? "");
  }, [open, templates, defaultMode]);
  const canCreate = !!name.trim() && (mode === "blank" || !!sourceId);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>New template</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField label="Template name" fullWidth value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Vision-only Retrofit" autoFocus />
        <TextField label="Description (optional)" fullWidth multiline minRows={2} value={description} onChange={e => setDescription(e.target.value)} />
        <TextField select label="Start from" fullWidth value={mode} onChange={e => setMode(e.target.value as "blank" | "duplicate")}>
          <MenuItem value="duplicate" disabled={!templates.length}>Duplicate an existing template</MenuItem>
          <MenuItem value="blank">Start blank (no phases)</MenuItem>
        </TextField>
        {mode === "duplicate" && (
          <TextField select label="Copy from" fullWidth value={sourceId} onChange={e => setSourceId(e.target.value)}>
            {templates.map(t => <MenuItem key={t.id} value={t.id}>{t.name} ({t.phaseCount} phases · {t.taskCount} tasks)</MenuItem>)}
          </TextField>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canCreate || busy}
          onClick={() => onCreate({ name: name.trim(), description: description.trim(), sourceTemplateId: mode === "duplicate" ? sourceId : undefined })}>
          {busy ? "Creating…" : "Create template"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Rename / edit-description dialog for a template. */
function RenameTemplateDialog({ open, template, busy, onClose, onSave }: {
  open: boolean;
  template: ProjectTemplateSummary | undefined;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; description: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => { if (open && template) { setName(template.name); setDescription(template.description); } }, [open, template]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit template</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField label="Template name" fullWidth value={name} onChange={e => setName(e.target.value)} autoFocus />
        <TextField label="Description (optional)" fullWidth multiline minRows={2} value={description} onChange={e => setDescription(e.target.value)} />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!name.trim() || busy} onClick={() => onSave({ name: name.trim(), description: description.trim() })}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Add / edit-phase dialog: name, discipline, critical. */
function PhaseDialog({ open, initial, busy, onClose, onSubmit }: {
  open: boolean;
  initial: PhaseTemplateItem | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; critical: boolean; discipline: PhaseDiscipline | null }) => void;
}) {
  const [name, setName] = useState("");
  const [critical, setCritical] = useState(false);
  const [discipline, setDiscipline] = useState<string>("");
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setCritical(initial?.critical ?? false);
    setDiscipline(initial?.discipline ?? "");
  }, [open, initial]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{initial ? "Edit phase" : "Add phase"}</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField label="Phase name" fullWidth value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 03 · Infrastructure" autoFocus />
        <TextField select label="Discipline" fullWidth value={discipline} onChange={e => setDiscipline(e.target.value)}
          helperText="Common phases are always generated; a discipline scopes the phase to that team.">
          <MenuItem value="">Common (always generated)</MenuItem>
          {PHASE_DISCIPLINE_OPTIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </TextField>
        <FormControlLabel control={<Checkbox checked={critical} onChange={e => setCritical(e.target.checked)} />} label="Critical phase" />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!name.trim() || busy}
          onClick={() => onSubmit({ name: name.trim(), critical, discipline: (discipline || null) as PhaseDiscipline | null })}>
          {busy ? "Saving…" : (initial ? "Save phase" : "Add phase")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Simple confirm dialog (used for deleting a template or a phase). */
function ConfirmDialog({ state, busy, onClose }: {
  state: { title: string; message: string; confirmLabel: string; onConfirm: () => void } | null;
  busy: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!state} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{state?.title}</DialogTitle>
      <DialogContent dividers><Typography variant="body2">{state?.message}</Typography></DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" disabled={busy} onClick={() => state?.onConfirm()}>
          {busy ? "Deleting…" : (state?.confirmLabel ?? "Delete")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Deterministic accent colour for a template's icon tile. */
const TILE_COLORS = [
  DASHBOARD_COLORS.blue, DASHBOARD_COLORS.violet, DASHBOARD_COLORS.orange,
  DASHBOARD_COLORS.green, DASHBOARD_COLORS.red, DASHBOARD_COLORS.slate,
];
function tileColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TILE_COLORS[h % TILE_COLORS.length];
}

/** One template in the left sidebar list. */
function TemplateListItem({ t, active, onClick }: { t: ProjectTemplateSummary; active: boolean; onClick: () => void }) {
  const color = tileColor(t.id);
  return (
    <Box role="button" onClick={onClick} sx={{
      display: "flex", gap: 1.25, alignItems: "center", p: 1, borderRadius: 2, cursor: "pointer",
      border: "1px solid", borderColor: active ? color : "transparent",
      bgcolor: active ? alpha(color, 0.10) : "transparent",
      transition: "background-color .12s ease, border-color .12s ease",
      "&:hover": { bgcolor: active ? alpha(color, 0.14) : "action.hover" },
    }}>
      <Box sx={{ width: 38, height: 38, borderRadius: 2, flexShrink: 0, display: "grid", placeItems: "center", bgcolor: alpha(color, 0.16), color }}>
        <DescriptionOutlinedIcon sx={{ fontSize: 20 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" alignItems="center" gap={0.5}>
          <Typography sx={{ fontWeight: 700, fontSize: 13.5 }} noWrap>{t.name}</Typography>
          {t.isDefault && <Chip label="Default" size="small" sx={{ height: 15, fontSize: 8.5, fontWeight: 700, "& .MuiChip-label": { px: 0.6 } }} />}
        </Stack>
        <Typography variant="caption" color="text.secondary" noWrap>{t.phaseCount} phases · {t.taskCount} tasks</Typography>
      </Box>
    </Box>
  );
}

/**
 * Admin screen for the named project templates — a two-pane layout: a sidebar
 * listing the available templates, and a detail pane with the selected
 * template's header, actions, and its phases/tasks. Editing changes the
 * DEFAULTS for newly created projects only — existing projects keep their own
 * snapshot. Mutations are enforced admin-only on the server.
 */
export function TemplateManager() {
  const router = useRouter();
  const { role } = useAppContext();
  const isAdmin = role === "Admin";
  const canCreateProject = roleCan(role, "createProject");

  const { data: templates = [], isLoading: listLoading } = useGetProjectTemplatesQuery();
  const [activeId, setActiveId] = useState<string>("");
  useEffect(() => {
    if (!templates.length) return;
    if (!activeId || !templates.some(t => t.id === activeId)) {
      setActiveId((templates.find(t => t.isDefault) ?? templates[0]).id);
    }
  }, [templates, activeId]);
  const { data: phases = [], isFetching: phasesLoading } = useGetTemplatePhasesQuery(activeId, { skip: !activeId });

  const [createTemplate, { isLoading: creating }] = useCreateProjectTemplateMutation();
  const [updateTemplate, { isLoading: renaming }] = useUpdateProjectTemplateMutation();
  const [deleteTemplate, { isLoading: deletingTemplate }] = useDeleteProjectTemplateMutation();
  const [addPhase, { isLoading: addingPhase }] = useAddTemplatePhaseMutation();
  const [updatePhase, { isLoading: savingPhase }] = useUpdateTemplatePhaseMutation();
  const [deletePhase, { isLoading: deletingPhase }] = useDeleteTemplatePhaseMutation();
  const [addTask] = useAddTemplateTaskMutation();
  const [updateTask] = useUpdateTemplateTaskMutation();
  const [deleteTask] = useDeleteTemplateTaskMutation();
  const [reorderTasks] = useReorderTemplateTasksMutation();
  const [createProject, { isLoading: creatingProject }] = useCreateProjectMutation();

  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newOpen, setNewOpen] = useState(false);
  const [newMode, setNewMode] = useState<"blank" | "duplicate">("duplicate");
  const [renameOpen, setRenameOpen] = useState(false);
  const [phaseDialog, setPhaseDialog] = useState<{ open: boolean; initial: PhaseTemplateItem | null }>({ open: false, initial: null });
  const [confirm, setConfirm] = useState<{ title: string; message: string; confirmLabel: string; onConfirm: () => void } | null>(null);
  const [useOpen, setUseOpen] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [phaseSearch, setPhaseSearch] = useState("");
  const [tab, setTab] = useState<"phases" | "overview">("phases");

  const activeTemplate = templates.find(t => t.id === activeId);
  const totalTasks = useMemo(() => phases.reduce((a, p) => a + p.tasks.length, 0), [phases]);
  const allOpen = phases.length > 0 && expanded.size === phases.length;
  const filteredTemplates = useMemo(
    () => templates.filter(t => t.name.toLowerCase().includes(templateSearch.trim().toLowerCase())),
    [templates, templateSearch],
  );
  const visiblePhases = useMemo(
    () => phases.filter(p => p.name.toLowerCase().includes(phaseSearch.trim().toLowerCase())),
    [phases, phaseSearch],
  );
  const headerColor = activeTemplate ? tileColor(activeTemplate.id) : DASHBOARD_COLORS.blue;

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setExpanded(allOpen ? new Set() : new Set(phases.map(p => p.id)));

  const run = async (p: Promise<unknown>) => {
    try { await p; } catch (e) { setError(errText(e, "Could not save the change.")); }
  };

  const openNew = (mode: "blank" | "duplicate") => { setNewMode(mode); setNewOpen(true); };

  const onCreateTemplate = async (payload: { name: string; description: string; sourceTemplateId?: string }) => {
    try {
      const list = await createTemplate(payload).unwrap();
      setNewOpen(false);
      const created = list.find(t => !templates.some(o => o.id === t.id)) ?? list.find(t => t.name === payload.name);
      if (created) setActiveId(created.id);
    } catch (e) { setError(errText(e, "Could not create the template.")); }
  };

  const onSubmitPhase = async (payload: { name: string; critical: boolean; discipline: PhaseDiscipline | null }) => {
    const editing = phaseDialog.initial;
    try {
      if (editing) await updatePhase({ phaseId: editing.id, ...payload }).unwrap();
      else await addPhase({ templateId: activeId, ...payload }).unwrap();
      setPhaseDialog({ open: false, initial: null });
    } catch (e) { setError(errText(e, "Could not save the phase.")); }
  };

  const onUseTemplate = async (payload: ProjectFormPayload) => {
    setCreateErr("");
    try {
      const project = await createProject(payload).unwrap();
      setUseOpen(false);
      router.push(`/projects/${project.id}`);
    } catch (e) { setCreateErr(errText(e, "Could not create the project.")); }
  };

  const phaseCards = (list: PhaseTemplateItem[]) => list.map((phase) => (
    <PhaseCard
      key={phase.id} phase={phase} canEdit={isAdmin}
      expanded={expanded.has(phase.id)} onToggle={() => toggle(phase.id)}
      onAdd={(t) => run(addTask({ phaseId: phase.id, ...t }).unwrap())}
      onSave={(taskId, patch) => run(updateTask({ taskId, ...patch }).unwrap())}
      onDelete={(taskId) => run(deleteTask({ taskId }).unwrap())}
      onReorder={(taskIds) => run(reorderTasks({ phaseId: phase.id, taskIds }).unwrap())}
      onEditPhase={() => setPhaseDialog({ open: true, initial: phase })}
      onDeletePhase={() => setConfirm({
        title: "Delete phase",
        message: `Delete the phase "${phase.name}" and its ${phase.tasks.length} task${phase.tasks.length === 1 ? "" : "s"}? New projects from this template won't include it.`,
        confirmLabel: "Delete phase",
        onConfirm: async () => { await run(deletePhase({ phaseId: phase.id }).unwrap()); setConfirm(null); },
      })}
    />
  ));

  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2.5, alignItems: "flex-start" }}>
      {/* ───────── Left sidebar: available templates ───────── */}
      <Paper variant="outlined" sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0, borderRadius: 3, p: 1.5, alignSelf: "stretch" }}>
        {isAdmin && (
          <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={() => openNew("duplicate")} sx={{ borderRadius: 2, mb: 1.5 }}>
            New Template
          </Button>
        )}
        <Typography variant="overline" sx={{ px: 0.5, color: "text.secondary", fontWeight: 700 }}>Templates</Typography>
        <TextField
          size="small" fullWidth placeholder="Search templates…" value={templateSearch}
          onChange={(e) => setTemplateSearch(e.target.value)} sx={{ my: 1 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
        />
        {listLoading ? (
          <Stack gap={1}>{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} variant="rounded" height={54} />)}</Stack>
        ) : (
          <Stack gap={0.5} sx={{ maxHeight: { md: "calc(100vh - 340px)" }, overflowY: "auto", pr: 0.5 }}>
            {filteredTemplates.map(t => (
              <TemplateListItem key={t.id} t={t} active={t.id === activeId} onClick={() => setActiveId(t.id)} />
            ))}
            {filteredTemplates.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ px: 1, py: 1 }}>No templates match.</Typography>
            )}
          </Stack>
        )}
        {isAdmin && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="overline" sx={{ px: 0.5, color: "text.secondary", fontWeight: 700 }}>Quick actions</Typography>
            <Button fullWidth variant="text" startIcon={<AddIcon />} onClick={() => openNew("blank")} sx={{ justifyContent: "flex-start", mt: 0.5 }}>
              Create from scratch
            </Button>
          </>
        )}
      </Paper>

      {/* ───────── Main: selected template ───────── */}
      <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
        {!activeTemplate ? (
          listLoading
            ? <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} />
            : (
              <Paper variant="outlined" sx={{ borderRadius: 3, p: 5, textAlign: "center" }}>
                <Typography color="text.secondary">Select a template to view its phases and tasks.</Typography>
              </Paper>
            )
        ) : (
          <>
            {/* Header card */}
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5, mb: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} gap={2} sx={{ alignItems: { sm: "flex-start" } }}>
                <Box sx={{ width: 56, height: 56, borderRadius: 2.5, flexShrink: 0, display: "grid", placeItems: "center", bgcolor: alpha(headerColor, 0.14), color: headerColor }}>
                  <DescriptionOutlinedIcon sx={{ fontSize: 30 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{activeTemplate.name}</Typography>
                    {activeTemplate.isDefault && <Chip label="Default" size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, height: 20 }} />}
                  </Stack>
                  {activeTemplate.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{activeTemplate.description}</Typography>
                  )}
                  <Stack direction="row" gap={2} sx={{ mt: 1.25, color: "text.secondary" }} flexWrap="wrap">
                    <Chip size="small" label={`${phases.length} Phases`} sx={{ fontWeight: 700 }} />
                    <Chip size="small" variant="outlined" label={`${totalTasks} Tasks`} sx={{ fontWeight: 700 }} />
                  </Stack>
                </Box>
                <Stack direction="row" gap={1} sx={{ flexShrink: 0 }} flexWrap="wrap">
                  {isAdmin && (
                    <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setRenameOpen(true)}>Edit Template</Button>
                  )}
                  {canCreateProject && (
                    <Button variant="contained" startIcon={<RocketLaunchOutlinedIcon />} onClick={() => setUseOpen(true)}>Use Template</Button>
                  )}
                  {isAdmin && (
                    <Tooltip title={activeTemplate.isDefault ? "The default template can't be deleted" : "Delete template"}>
                      <span>
                        <IconButton disabled={activeTemplate.isDefault || templates.length <= 1}
                          onClick={() => setConfirm({
                            title: "Delete template",
                            message: `Delete "${activeTemplate.name}" and all its phases and tasks? Existing projects are not affected.`,
                            confirmLabel: "Delete template",
                            onConfirm: async () => { await run(deleteTemplate({ templateId: activeTemplate.id }).unwrap()); setConfirm(null); },
                          })}
                          sx={{ color: "text.secondary", "&:hover": { color: DASHBOARD_COLORS.red } }}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              </Stack>
            </Paper>

            {!isAdmin && (
              <Alert severity="info" sx={{ mb: 2 }}>View-only access — ask an admin to make changes.</Alert>
            )}

            {/* Tabs + toolbar */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}
              sx={{ borderBottom: "1px solid", borderColor: "divider", mb: 2 }}>
              <Tabs value={tab} onChange={(_e, v) => setTab(v)}
                sx={{ minHeight: 0, "& .MuiTab-root": { minHeight: 0, py: 1.25, textTransform: "none", fontWeight: 700 } }}>
                <Tab value="phases" label={`Phases (${phases.length})`} />
                <Tab value="overview" label="Overview" />
              </Tabs>
              {tab === "phases" && phases.length > 0 && (
                <Stack direction="row" gap={1} alignItems="center">
                  <Button size="small" variant="text" startIcon={allOpen ? <UnfoldLessIcon /> : <UnfoldMoreIcon />} onClick={toggleAll}>
                    {allOpen ? "Collapse all" : "Expand all"}
                  </Button>
                  <TextField size="small" placeholder="Search phases…" value={phaseSearch} onChange={(e) => setPhaseSearch(e.target.value)}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
                    sx={{ width: 200 }} />
                </Stack>
              )}
            </Stack>

            {tab === "phases" ? (
              phasesLoading ? (
                <Stack gap={1.5}>{[0, 1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={62} />)}</Stack>
              ) : (
                <Stack gap={1.5}>
                  {phaseCards(visiblePhases)}
                  {isAdmin && activeId && phaseSearch.trim() === "" && (
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setPhaseDialog({ open: true, initial: null })} sx={{ alignSelf: "flex-start" }}>
                      Add phase
                    </Button>
                  )}
                  {phases.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                      This template has no phases yet.{isAdmin ? " Add one to get started." : ""}
                    </Typography>
                  )}
                  {phases.length > 0 && visiblePhases.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>No phases match “{phaseSearch}”.</Typography>
                  )}
                </Stack>
              )
            ) : (
              <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
                <Stack gap={2}>
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>Description</Typography>
                    <Typography variant="body2">{activeTemplate.description || "No description."}</Typography>
                  </Box>
                  <Divider />
                  <Stack direction="row" gap={5} flexWrap="wrap">
                    <Box><Typography variant="h5" sx={{ fontWeight: 800 }}>{phases.length}</Typography><Typography variant="caption" color="text.secondary">Phases</Typography></Box>
                    <Box><Typography variant="h5" sx={{ fontWeight: 800 }}>{totalTasks}</Typography><Typography variant="caption" color="text.secondary">Tasks</Typography></Box>
                  </Stack>
                  <Divider />
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>Phases</Typography>
                    <Stack gap={0.75} sx={{ mt: 0.5 }}>
                      {phases.map(p => (
                        <Stack key={p.id} direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>{p.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, pl: 1 }}>
                            {p.tasks.length} task{p.tasks.length === 1 ? "" : "s"} · {p.discipline ?? "Common"}
                          </Typography>
                        </Stack>
                      ))}
                      {phases.length === 0 && <Typography variant="body2" color="text.secondary">No phases yet.</Typography>}
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            )}
          </>
        )}
      </Box>

      {/* Dialogs */}
      <NewTemplateDialog open={newOpen} templates={templates} busy={creating} defaultMode={newMode} onClose={() => setNewOpen(false)} onCreate={onCreateTemplate} />
      <RenameTemplateDialog open={renameOpen} template={activeTemplate} busy={renaming}
        onClose={() => setRenameOpen(false)}
        onSave={async (payload) => { await run(updateTemplate({ templateId: activeId, ...payload }).unwrap()); setRenameOpen(false); }} />
      <PhaseDialog open={phaseDialog.open} initial={phaseDialog.initial} busy={addingPhase || savingPhase}
        onClose={() => setPhaseDialog({ open: false, initial: null })} onSubmit={onSubmitPhase} />
      <ConfirmDialog state={confirm} busy={deletingTemplate || deletingPhase} onClose={() => setConfirm(null)} />
      {useOpen && activeTemplate && (
        <ProjectForm
          title={`New project — ${activeTemplate.name}`} initial={undefined} submitLabel="Create project"
          busy={creatingProject} error={createErr}
          defaults={{ type: "Solution", templateId: activeTemplate.id }}
          onClose={() => { setUseOpen(false); setCreateErr(""); }} onSubmit={onUseTemplate}
        />
      )}

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="error" variant="filled" onClose={() => setError("")}>{error}</Alert>
      </Snackbar>
    </Box>
  );
}
