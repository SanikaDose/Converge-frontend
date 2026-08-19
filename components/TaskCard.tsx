"use client";
import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Stack from "./Stack";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Checkbox from "@mui/material/Checkbox";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import ChecklistIcon from "@mui/icons-material/Checklist";
import { STATUS_OPTIONS, STATUS_COLOR, PRIORITY_COLOR, genId, VIEW_ONLY_HINT } from "@/lib/data";
import { StatusChip, AchievementBadge, LateBadge, PendingApprovalChip, EmployeeAvatar, EmployeeAvatarStack } from "./common";
import { OrgMultiSelect } from "./common";
import { isOverdue, overdueWorkingDays, lateWorkingDays } from "@/lib/businessLogic";
import { fmt, businessDaysBetween } from "@/lib/dateUtils";
import { useStatusHex } from "@/lib/theme";
import { ScheduleReasonDialog, type PendingScheduleEdit } from "./ScheduleReasonDialog";
import type { ChecklistItem, Task, TaskStatus, WeekDay } from "@/lib/types";

const fieldLabelSx = {
  fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary", display: "block", mb: 0.75,
} as const;
const fieldInputSx = { fontSize: 13 };

/**
 * Shared shading for the expanded card's sub-sections. `background.default`
 * sits *behind* the card's `background.paper`, so on both themes it reads as
 * a recessed panel rather than another floating surface.
 */
const sectionPaperSx = {
  bgcolor: "background.default",
  borderColor: "divider",
  borderRadius: 1.5,
  p: 1.75,
} as const;

/** "10 Aug 2026, 14:32" — checklist stamps need the time, unlike fmt()'s date-only output. */
function fmtStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/**
 * One task's row, as a Material UI Accordion — collapsed shows just
 * enough to scan the list (status/overdue dot, name, priority/achievement/
 * pending-approval badges, planned start, assignee avatar, status chip);
 * expanding it reveals the full editable detail (notes, status, owner,
 * day-offset/planned-start/duration commit-on-blur fields, planned
 * finish, actual dates, history, edit/delete, approval actions). Only
 * one task is expanded at a time — controlled by the parent
 * (`expanded`/`onToggleExpand`) rather than local state, so
 * PhaseTaskPanel can enforce that.
 */
export function TaskCard({
  task, canEdit, canApprove, today, weekOff, expanded, onToggleExpand,
  onStatusChange, onOpenEditor, onOpenHistory, onDelete, onApprove, onReject,
  onCommitAssignees, onCommitOffset, onCommitDates, onCommitDescription,
  onChecklistChange, phaseBounds,
}: {
  task: Task;
  canEdit: boolean;
  canApprove: boolean;
  today: string;
  weekOff: WeekDay[];
  expanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onOpenEditor: () => void;
  onOpenHistory: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: (comment: string) => void;
  onCommitAssignees: (assignees: string[]) => void;
  // Scheduling commits carry the reason captured by ScheduleReasonDialog.
  onCommitOffset: (offset: string | number, reason: string) => void;
  /** Start and finish move together now — duration is derived from the pair. */
  onCommitDates: (plannedStart: string, plannedFinish: string, reason: string) => void;
  onCommitDescription: (description: string) => void;
  onChecklistChange: (checklist: ChecklistItem[]) => void;
  /** Allowed planned-start window from the phase's other tasks; null when this is the only task. */
  phaseBounds: { min: string; max: string } | null;
}) {
  const STATUS_HEX = useStatusHex();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [assignees, setAssignees] = useState<string[]>(task.assignees ?? []);
  const [dayOffset, setDayOffset] = useState<string | number>(task.dayOffset);
  const [startDateLocal, setStartDateLocal] = useState(task.plannedStart);
  const [finishDateLocal, setFinishDateLocal] = useState(task.plannedFinish);
  const [duration, setDuration] = useState<string | number>(task.duration);
  const [description, setDescription] = useState(task.description || "");
  const [newPoint, setNewPoint] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pendingEdit, setPendingEdit] = useState<PendingScheduleEdit | null>(null);
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);

  useEffect(() => { setAssignees(task.assignees ?? []); }, [task.assignees]);
  useEffect(() => { setDayOffset(task.dayOffset); }, [task.dayOffset]);
  useEffect(() => { setStartDateLocal(task.plannedStart); }, [task.plannedStart]);
  useEffect(() => { setFinishDateLocal(task.plannedFinish); }, [task.plannedFinish]);
  useEffect(() => { setDuration(task.duration); }, [task.duration]);
  useEffect(() => { setDescription(task.description || ""); }, [task.description]);

  const overdue = isOverdue(task, today);
  const color = STATUS_COLOR[task.status] || "slate";
  const overdueDays = overdueWorkingDays(task, today, weekOff);
  const locked = task.status === "Pending Approval";

  // Tasks created before the checklist existed have no array at all.
  const checklist = task.checklist ?? [];
  const checklistDone = checklist.filter(c => c.done).length;
  const canEditChecklist = canEdit && !locked;

  const outsidePhase = !!phaseBounds && (startDateLocal < phaseBounds.min || startDateLocal > phaseBounds.max);

  // Every schedule edit routes through the reason dialog rather than
  // committing on blur, so task history records *why* a date moved, not just
  // that it did. `cancel` restores the field's shown value — otherwise
  // backing out would leave the input displaying a change that never saved.
  /**
   * Asks for a reason the moment a date is picked, rather than waiting for
   * blur — choosing a date *is* the decision, so having to click elsewhere
   * before the app reacted felt like the click had been ignored.
   *
   * Takes the new value as an argument instead of reading `startDateLocal`:
   * this runs from the field's own onChange, where the state setter hasn't
   * flushed yet and the closure still holds the previous date.
   */
  /**
   * Opens the reschedule dialog as soon as either date is picked, seeded with
   * both dates so the other one can be adjusted in the same step.
   *
   * Takes the new values as arguments instead of reading the local state:
   * this runs from a field's own onChange, where the setter hasn't flushed
   * yet and the closure still holds the previous date.
   */
  const openReschedule = (nextStart: string, nextFinish: string) => {
    // Empty means a half-cleared input mid-edit, and an out-of-phase start is
    // already flagged inline — neither is a decision worth interrupting for.
    // Blur reverts those (browsers accept out-of-range dates typed directly).
    if (!nextStart || !nextFinish) return;
    if (nextStart === task.plannedStart && nextFinish === task.plannedFinish) return;
    if (phaseBounds && (nextStart < phaseBounds.min || nextStart > phaseBounds.max)) return;
    setPendingEdit({
      fieldLabel: "Planned start / finish",
      from: `${fmt(task.plannedStart)} → ${fmt(task.plannedFinish)}`,
      to: `${fmt(nextStart)} → ${fmt(nextFinish)}`,
      apply: () => {},
      cancel: () => {
        setPendingEdit(null);
        setStartDateLocal(task.plannedStart);
        setFinishDateLocal(task.plannedFinish);
      },
      dateEdit: {
        start: nextStart,
        finish: nextFinish,
        originalStart: task.plannedStart,
        originalFinish: task.plannedFinish,
        minStart: phaseBounds?.min,
        maxStart: phaseBounds?.max,
        // Inclusive of the start day, mirroring computePlanned's
        // `finish = start + (duration - 1)`.
        durationFor: (s, f) => businessDaysBetween(f, s, weekOff) + 1,
        apply: (s, f, reason) => {
          setPendingEdit(null);
          onCommitDates(s, f, reason);
        },
      },
    });
  };

  const commitOffsetIfChanged = () => {
    const next = Math.max(0, Number(dayOffset) || 0);
    if (next === task.dayOffset) return;
    setPendingEdit({
      fieldLabel: "Day from start",
      from: `Day ${task.dayOffset}`,
      to: `Day ${next}`,
      apply: (reason) => { setPendingEdit(null); onCommitOffset(next, reason); },
      cancel: () => { setPendingEdit(null); setDayOffset(task.dayOffset); },
    });
  };


  // A task can't be called done while its own critical points are open —
  // that's the whole point of tracking them.
  const openPoints = checklist.filter(c => !c.done).length;
  const requestStatusChange = (next: TaskStatus) => {
    if (next === "Completed" && openPoints > 0) {
      setBlockedMsg(`${openPoints} critical point${openPoints === 1 ? "" : "s"} still open — complete ${openPoints === 1 ? "it" : "them"} first.`);
      return;
    }
    onStatusChange(next);
  };

  const addPoint = () => {
    const text = newPoint.trim();
    if (!text || !canEditChecklist) return;
    const now = new Date().toISOString();
    onChecklistChange([...checklist, { id: genId("chk"), text, done: false, createdAt: now, updatedAt: now }]);
    setNewPoint("");
  };
  const togglePoint = (id: string) =>
    onChecklistChange(checklist.map(c => c.id === id
      ? { ...c, done: !c.done, updatedAt: new Date().toISOString() }
      : c));
  const savePointText = (id: string) => {
    const text = editText.trim();
    // Empty isn't a delete — completed points are undeletable, and silently
    // dropping one here would route around that.
    if (!text) return;
    onChecklistChange(checklist.map(c => c.id === id
      ? { ...c, text, updatedAt: new Date().toISOString() }
      : c));
    setEditingId(null);
    setEditText("");
  };
  // Ticked-off points are a record that the work was done, so they stay put.
  // Untick first if a point genuinely needs removing.
  const removePoint = (id: string) => {
    const item = checklist.find(c => c.id === id);
    if (!item || item.done) return;
    onChecklistChange(checklist.filter(c => c.id !== id));
  };

  return (
    <>
      <Accordion
        expanded={expanded} onChange={onToggleExpand} disableGutters
        sx={{
          bgcolor: "background.paper", border: "1px solid", borderColor: "divider",
          borderLeft: "3px solid", borderLeftColor: STATUS_HEX[color], borderRadius: "10px !important",
          boxShadow: "0 1px 2px rgba(16,24,40,0.04)", overflow: "hidden", "&:before": { display: "none" },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon fontSize="small" />}
          sx={{
            px: 2, minHeight: 58,
            "& .MuiAccordionSummary-content": { display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, my: 1 },
          }}
        >
          <Tooltip title={overdue ? `${overdueDays}d overdue` : task.status}>
            <Box sx={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, bgcolor: overdue ? STATUS_HEX.red : STATUS_HEX[color] }} />
          </Tooltip>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography noWrap sx={{ fontWeight: 600, fontSize: 14.5 }}>{task.name}</Typography>
              {task.priority && task.priority !== "Medium" && (
                <Chip label={task.priority} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, color: STATUS_HEX[PRIORITY_COLOR[task.priority]], borderColor: STATUS_HEX[PRIORITY_COLOR[task.priority]] }} variant="outlined" />
              )}
              <AchievementBadge achievement={task.achievement} />
              <LateBadge days={lateWorkingDays(task, weekOff)} />
              {task.status === "Pending Approval" && <PendingApprovalChip />}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }} noWrap>
              Start {fmt(task.plannedStart)}
              {overdue && <Box component="span" sx={{ color: STATUS_HEX.red, fontWeight: 700, ml: 1 }}>{overdueDays}d overdue</Box>}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexShrink: 0, mr: 0.5 }}>
            {task.assignees.length > 0 && <EmployeeAvatarStack employeeIds={task.assignees} size={26} />}
            {canEdit ? (
              <Box onClick={(e) => e.stopPropagation()}>
                <Select
                  size="small"
                  value={task.status}
                  onChange={(e: SelectChangeEvent) => requestStatusChange(e.target.value as TaskStatus)}
                  disabled={locked}
                  MenuProps={{ onClick: (e) => e.stopPropagation() }}
                  sx={{
                    fontSize: 11.5, fontWeight: 700, color: STATUS_HEX[color],
                    bgcolor: `color-mix(in srgb, ${STATUS_HEX[color]} 22%, transparent)`,
                    borderRadius: 999,
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: STATUS_HEX[color] },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: STATUS_HEX[color] },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: STATUS_HEX[color] },
                    "& .MuiSelect-select": { py: 0.4, pl: 1.25, pr: "26px !important" },
                  }}
                >
                  {STATUS_OPTIONS.filter(s => s !== "Pending Approval" || locked).map(s => (
                    <MenuItem key={s} value={s} sx={{ fontSize: 12.5 }}>{s}</MenuItem>
                  ))}
                </Select>
              </Box>
            ) : (
              <StatusChip label={task.status} color={color} />
            )}
          </Stack>
        </AccordionSummary>

        <AccordionDetails sx={{ px: 2, pt: 0, pb: 2.25 }}>
          <TextField
            value={description} onChange={(e) => setDescription(e.target.value)}
            onBlur={() => canEdit && description !== (task.description || "") && onCommitDescription(description)}
            placeholder={canEdit ? "Add notes about this task…" : "No notes added."}
            disabled={!canEdit} multiline minRows={1} maxRows={4} fullWidth
            sx={{ mb: 2, "& .MuiInputBase-input": { fontSize: 13 } }}
          />

          <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mb: 2, fontSize: 11.5, color: "text.secondary" }}>
            <span>Plan {fmt(task.plannedStart)} → {fmt(task.plannedFinish)}</span>
            {task.actualStart && <span style={{ color: STATUS_HEX.amber }}>Started {fmt(task.actualStart)}</span>}
            {task.actualFinish && <span style={{ color: STATUS_HEX.green }}>Finished {fmt(task.actualFinish)}</span>}
          </Stack>

          {/* Scheduling block — shaded so it reads as its own section against
              the card, which previously ran together as one flat surface.
              flex (not fixed widths) so the row fills the card instead of
              hugging the left edge with dead space on the right; the two
              widest fields (Owner, the date range) get the growth. */}
          <Paper variant="outlined" sx={{ ...sectionPaperSx, mb: 1.5 }}>
          <Stack direction="row" spacing={2.5} rowGap={2} alignItems="flex-end" flexWrap="wrap">
            <Box sx={{ flex: "1 1 200px", minWidth: 160 }}>
              <Typography sx={fieldLabelSx}>Owners</Typography>
              <OrgMultiSelect label="" value={assignees}
                onChange={(v) => { setAssignees(v); if (canEdit && !locked) onCommitAssignees(v); }}
                size="small" fullWidth disabled={!canEdit || locked} />
            </Box>

            <Box sx={{ flex: "0 1 110px", minWidth: 96 }}>
              <Typography sx={fieldLabelSx}>Day from start</Typography>
              <TextField type="number" size="small" fullWidth value={dayOffset} disabled={!canEdit || locked}
                slotProps={{ htmlInput: { min: 0, sx: fieldInputSx } }}
                onChange={(e) => setDayOffset(e.target.value)}
                onBlur={() => canEdit && !locked && commitOffsetIfChanged()} />
            </Box>

            <Typography variant="caption" sx={{
              color: "text.secondary", fontWeight: 600, mb: 1, px: 0.85, py: 0.15, borderRadius: 5,
              bgcolor: "action.hover", textTransform: "uppercase", fontSize: 10, letterSpacing: 0.4, flexShrink: 0,
            }}>
              or
            </Typography>

            {/* Start and finish read as one date range under a shared label,
                with the phase window called out once beneath both. */}
            <Box sx={{ flex: "1 1 320px", minWidth: 280 }}>
              <Typography sx={fieldLabelSx}>Planned start / finish</Typography>
              <Stack direction="row" gap={1} alignItems="flex-start">
                <TextField
                  type="date" size="small" fullWidth value={startDateLocal} disabled={!canEdit || locked}
                  error={outsidePhase}
                  // min/max grey out everything outside the phase in the native
                  // picker; the error state covers dates typed straight in, which
                  // browsers accept regardless of min/max.
                  slotProps={{ htmlInput: { sx: fieldInputSx, min: phaseBounds?.min, max: phaseBounds?.max } }}
                  sx={{ flex: 1 }}
                  onChange={(e) => {
                    setStartDateLocal(e.target.value);
                    if (canEdit && !locked) openReschedule(e.target.value, finishDateLocal);
                  }}
                  // onChange already handled anything committable; blur is now
                  // only the guard that puts an out-of-phase date back.
                  onBlur={() => { if (outsidePhase) setStartDateLocal(task.plannedStart); }} />
                <TextField
                  type="date" size="small" fullWidth value={finishDateLocal} disabled={!canEdit || locked}
                  error={!!finishDateLocal && finishDateLocal < startDateLocal}
                  // Not clamped to the phase window like the start is: pushing a
                  // task's finish past the phase end is how a phase legitimately
                  // grows, whereas its start is pinned by what precedes it.
                  slotProps={{ htmlInput: { sx: fieldInputSx, min: startDateLocal } }}
                  sx={{ flex: 1 }}
                  onChange={(e) => {
                    setFinishDateLocal(e.target.value);
                    if (canEdit && !locked) openReschedule(startDateLocal, e.target.value);
                  }}
                  onBlur={() => { if (finishDateLocal < startDateLocal) setFinishDateLocal(task.plannedFinish); }} />
              </Stack>
              {phaseBounds && (
                <Typography sx={{
                  fontSize: 10.5, mt: 0.5, lineHeight: 1.3,
                  color: outsidePhase ? "error.main" : "text.secondary",
                  fontWeight: outsidePhase ? 600 : 400,
                }}>
                  {outsidePhase ? "Outside phase " : "Phase: "}
                  {fmt(phaseBounds.min)} – {fmt(phaseBounds.max)}
                </Typography>
              )}
            </Box>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

            <Box sx={{ flex: "0 1 120px", minWidth: 108 }}>
              <Typography sx={fieldLabelSx}>Duration (days)</Typography>
              {/* Read-only: duration is now a result of the two dates, not an
                  input. Editing it as well would give three fields that each
                  redefine the other two, with no clear winner. */}
              <Tooltip title="Working days between the planned start and finish — set those to change it.">
                <TextField
                  size="small" fullWidth value={task.duration} disabled
                  slotProps={{ htmlInput: { sx: fieldInputSx } }}
                  sx={{ "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: "unset", color: "text.primary", fontWeight: 600 } }} />
              </Tooltip>
            </Box>
          </Stack>
          </Paper>

          {/* Header band → divided rows → add field, each edge-to-edge inside
              the panel rather than inset, so the section reads as one list. */}
          <Paper variant="outlined" sx={{ bgcolor: "background.default", borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
            <Stack direction="row" alignItems="center" gap={1.25} sx={{ px: 2, py: 1.5 }}>
              <ChecklistIcon sx={{ fontSize: 19, color: "text.secondary" }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                Critical points
              </Typography>
              {checklist.length > 0 && (
                <Chip
                  label={`${checklistDone}/${checklist.length}`}
                  size="small"
                  sx={{
                    height: 21, fontSize: 11, fontWeight: 700,
                    color: checklistDone === checklist.length ? STATUS_HEX.green : "text.secondary",
                    bgcolor: checklistDone === checklist.length
                      ? `color-mix(in srgb, ${STATUS_HEX.green} 18%, transparent)`
                      : "action.selected",
                  }}
                />
              )}
            </Stack>

            {checklist.map(item => {
              const isEditing = editingId === item.id;
              return (
                <Stack key={item.id} direction="row" alignItems="center" gap={1}
                  sx={{
                    px: 2, py: 1, borderTop: "1px solid", borderColor: "divider",
                    bgcolor: isEditing ? "action.hover" : "transparent",
                  }}>
                  <Checkbox
                    size="small" checked={item.done} disabled={!canEditChecklist || isEditing}
                    onChange={() => togglePoint(item.id)}
                    sx={{ p: 0.5, ml: -0.5 }}
                  />

                  {isEditing ? (
                    <TextField
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); savePointText(item.id); }
                        if (e.key === "Escape") { e.preventDefault(); setEditingId(null); setEditText(""); }
                      }}
                      autoFocus size="small" fullWidth
                      sx={{ bgcolor: "background.paper", "& .MuiInputBase-input": { fontSize: 14, py: 0.6 } }}
                    />
                  ) : (
                    <>
                      <Typography sx={{
                        flex: 1, minWidth: 0, fontSize: 14, wordBreak: "break-word", lineHeight: 1.4,
                        color: item.done ? "text.disabled" : "text.primary",
                        textDecoration: item.done ? "line-through" : "none",
                      }}>
                        {item.text}
                      </Typography>
                      {item.updatedAt && (
                        <Typography sx={{ fontSize: 12.5, color: "text.disabled", flexShrink: 0, whiteSpace: "nowrap" }}>
                          {item.done ? "Completed" : "Updated"} {fmtStamp(item.updatedAt)}
                        </Typography>
                      )}
                    </>
                  )}

                  {canEditChecklist && (
                    <Stack direction="row" gap={0.25} sx={{ flexShrink: 0 }}>
                      {isEditing ? (
                        <>
                          <Tooltip title="Save">
                            <span>
                              <IconButton size="small" disabled={!editText.trim()} onClick={() => savePointText(item.id)}
                                sx={{ color: STATUS_HEX.green }}>
                                <CheckIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Cancel">
                            <IconButton size="small" onClick={() => { setEditingId(null); setEditText(""); }}
                              sx={{ color: "text.secondary" }}>
                              <CloseIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Tooltip title="Edit point">
                            <IconButton size="small" onClick={() => { setEditingId(item.id); setEditText(item.text); }}
                              sx={{ color: "text.secondary" }}>
                              <EditIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={item.done
                            ? "Completed points are kept as a record — untick it first to delete"
                            : "Delete point"}>
                            {/* span: a disabled button can't fire the events Tooltip listens for. */}
                            <span>
                              <IconButton size="small" disabled={item.done} onClick={() => removePoint(item.id)}
                                sx={{ color: "text.secondary" }}>
                                <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  )}
                </Stack>
              );
            })}

            {canEditChecklist ? (
              <Box sx={{ px: 1.5, py: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                <TextField
                  value={newPoint}
                  onChange={(e) => setNewPoint(e.target.value)}
                  // Enter commits the point. The form-less card means there's no
                  // implicit submit to worry about, but preventDefault keeps it
                  // from bubbling into the accordion's own key handling.
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPoint(); } }}
                  placeholder="Add a critical point, then press Enter"
                  size="small" fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <AddCircleOutlineIcon sx={{ fontSize: 20, color: "primary.main" }} />
                        </InputAdornment>
                      ),
                      endAdornment: newPoint.trim() ? (
                        <InputAdornment position="end">
                          <Button size="small" onClick={addPoint} sx={{ fontSize: 12, minWidth: 0 }}>Add</Button>
                        </InputAdornment>
                      ) : null,
                    },
                  }}
                  sx={{ bgcolor: "background.paper", "& .MuiInputBase-input": { fontSize: 14 } }}
                />
              </Box>
            ) : checklist.length === 0 && (
              <Typography variant="caption" color="text.disabled" sx={{ display: "block", px: 2, pb: 1.75 }}>
                No critical points added.
              </Typography>
            )}
          </Paper>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2.5, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
            <Tooltip title="View history">
              <span>
                <Button size="small" startIcon={<HistoryIcon sx={{ fontSize: 15 }} />} onClick={onOpenHistory} disabled={!task.history?.length} sx={{ fontSize: 12 }}>
                  {task.history?.length ? `${task.history.length} change${task.history.length > 1 ? "s" : ""}` : "No changes"}
                </Button>
              </span>
            </Tooltip>
            <Box sx={{ flex: 1 }} />
            {/* Visible-but-disabled for a read-only User, same as every
                other write control — see VIEW_ONLY_HINT. */}
            <Tooltip title={canEdit ? "Edit name, description, priority & dependencies" : VIEW_ONLY_HINT}>
              <span>
                <IconButton size="small" disabled={!canEdit} onClick={onOpenEditor}><EditIcon fontSize="small" /></IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canEdit ? "Delete task" : VIEW_ONLY_HINT}>
              <span>
                <IconButton size="small" disabled={!canEdit} color={canEdit ? "error" : undefined}
                  onClick={() => setConfirmDelete(true)}><DeleteOutlineIcon fontSize="small" /></IconButton>
              </span>
            </Tooltip>
          </Stack>

          {task.status === "Pending Approval" && task.pendingChange && (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 1.5, bgcolor: "rgba(157,127,224,0.08)", border: `1px dashed ${STATUS_HEX.violet}` }}>
              <Typography variant="caption" sx={{ color: STATUS_HEX.violet, fontWeight: 700 }}>
                Requested by {task.pendingChange.requestedByName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {task.pendingChange.reason || "No reason given."}
              </Typography>
              {canApprove && (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" color="success" variant="outlined" startIcon={<CheckIcon />} onClick={onApprove}>Approve</Button>
                  <Button size="small" color="error" variant="outlined" startIcon={<CloseIcon />} onClick={() => setRejectOpen(true)}>Reject</Button>
                </Stack>
              )}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {pendingEdit && <ScheduleReasonDialog edit={pendingEdit} />}

      <Snackbar
        open={!!blockedMsg} autoHideDuration={5000} onClose={() => setBlockedMsg(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="warning" variant="filled" onClose={() => setBlockedMsg(null)} sx={{ fontWeight: 600 }}>
          {blockedMsg}
        </Alert>
      </Snackbar>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete &quot;{task.name}&quot;?</DialogTitle>
        <DialogContent><Typography color="text.secondary">This removes the task and its history permanently.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => { setConfirmDelete(false); onDelete(); }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject change request</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth multiline minRows={2} label="Comment (optional)" sx={{ mt: 1 }}
            value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => { setRejectOpen(false); onReject(rejectComment); setRejectComment(""); }}>
            Reject & restore
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
