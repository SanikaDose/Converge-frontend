"use client";
import React, { useEffect, useState, type HTMLAttributes } from "react";
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
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { STATUS_OPTIONS, STATUS_COLOR, PRIORITY_COLOR } from "@/lib/data";
import { StatusChip, AchievementBadge, PendingApprovalChip, EmployeeAvatar } from "./common";
import { OrgSelect } from "./common";
import { isOverdue, overdueWorkingDays } from "@/lib/businessLogic";
import { fmt } from "@/lib/dateUtils";
import { useStatusHex } from "@/lib/theme";
import type { Task, TaskStatus, WeekDay } from "@/lib/types";

const monoLabel = {
  fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary", display: "block", mb: 0.75,
} as const;
const fieldInputSx = { fontSize: 13 };

/**
 * One task's card, quick-edit style: owner/day-offset/planned-start/
 * duration are editable directly on the card (commit on blur) rather
 * than behind a separate editor — matching the rest of the app's dense,
 * always-visible-fields layout. A pencil icon opens a small modal for
 * the fields that don't belong inline (name/description/priority/
 * dependencies); there is no side drawer.
 */
export function TaskCard({
  task, canEdit, canApprove, canReorder, today, weekOff,
  onStatusChange, onOpenEditor, onOpenHistory, onDelete, onApprove, onReject,
  onCommitOwner, onCommitOffset, onCommitStartDate, onCommitDuration, onCommitDescription,
  dragHandleProps,
}: {
  task: Task;
  canEdit: boolean;
  canApprove: boolean;
  canReorder: boolean;
  today: string;
  weekOff: WeekDay[];
  onStatusChange: (status: TaskStatus) => void;
  onOpenEditor: () => void;
  onOpenHistory: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: (comment: string) => void;
  onCommitOwner: (ownerId: string | null) => void;
  onCommitOffset: (offset: string | number) => void;
  onCommitStartDate: (date: string) => void;
  onCommitDuration: (duration: string | number) => void;
  onCommitDescription: (description: string) => void;
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
}) {
  const STATUS_HEX = useStatusHex();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [owner, setOwner] = useState(task.assignedTo);
  const [dayOffset, setDayOffset] = useState<string | number>(task.dayOffset);
  const [startDateLocal, setStartDateLocal] = useState(task.plannedStart);
  const [duration, setDuration] = useState<string | number>(task.duration);
  const [description, setDescription] = useState(task.description || "");

  useEffect(() => { setOwner(task.assignedTo); }, [task.assignedTo]);
  useEffect(() => { setDayOffset(task.dayOffset); }, [task.dayOffset]);
  useEffect(() => { setStartDateLocal(task.plannedStart); }, [task.plannedStart]);
  useEffect(() => { setDuration(task.duration); }, [task.duration]);
  useEffect(() => { setDescription(task.description || ""); }, [task.description]);

  const overdue = isOverdue(task, today);
  const color = STATUS_COLOR[task.status] || "slate";
  const overdueDays = overdueWorkingDays(task, today, weekOff);
  const locked = task.status === "Pending Approval";

  return (
    <Box sx={{
      bgcolor: "background.paper", border: "1px solid", borderColor: "divider",
      borderLeft: "3px solid", borderLeftColor: STATUS_HEX[color], borderRadius: 2, p: 2.5,
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
          {canReorder && (
            <Box {...dragHandleProps} sx={{ cursor: "grab", color: "text.secondary", mt: 0.3 }}>
              <DragIndicatorIcon fontSize="small" />
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="body1" sx={{ fontWeight: 600, fontSize: 15.5 }}>{task.name}</Typography>
              {task.priority && task.priority !== "Medium" && (
                <Chip label={task.priority} size="small" sx={{ height: 19, fontSize: 10.5, fontWeight: 700, color: STATUS_HEX[PRIORITY_COLOR[task.priority]], borderColor: STATUS_HEX[PRIORITY_COLOR[task.priority]] }} variant="outlined" />
              )}
              <AchievementBadge achievement={task.achievement} />
              {task.status === "Pending Approval" && <PendingApprovalChip />}
            </Stack>
            <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mt: 0.6, fontSize: 11.5, color: "text.secondary" }}>
              <span>Plan {fmt(task.plannedStart)} → {fmt(task.plannedFinish)}</span>
              {task.actualStart && <span style={{ color: STATUS_HEX.amber }}>Started {fmt(task.actualStart)}</span>}
              {task.actualFinish && <span style={{ color: STATUS_HEX.green }}>Finished {fmt(task.actualFinish)}</span>}
              {overdue && <span style={{ color: STATUS_HEX.red, fontWeight: 700 }}>{overdueDays}d overdue</span>}
            </Stack>
          </Box>
        </Stack>

        {canEdit ? (
          <Select size="small" value={task.status} onChange={(e: SelectChangeEvent) => onStatusChange(e.target.value as TaskStatus)}
            disabled={locked} sx={{ width: 148, flexShrink: 0, fontSize: 12.5 }}>
            {STATUS_OPTIONS.filter(s => s !== "Pending Approval" || locked).map(s => <MenuItem key={s} value={s} sx={{ fontSize: 12.5 }}>{s}</MenuItem>)}
          </Select>
        ) : <StatusChip label={task.status} color={color} />}
      </Stack>

      <TextField
        value={description} onChange={(e) => setDescription(e.target.value)}
        onBlur={() => canEdit && description !== (task.description || "") && onCommitDescription(description)}
        placeholder={canEdit ? "Add notes about this task…" : "No notes added."}
        disabled={!canEdit} multiline minRows={1} maxRows={4} fullWidth
        sx={{ mt: 1.5, "& .MuiInputBase-input": { fontSize: 13 } }}
      />

      <Stack direction="row" spacing={2.5} alignItems="flex-end" flexWrap="wrap" sx={{ mt: 1.75, pt: 1.75, borderTop: "1px solid", borderColor: "divider" }}>
        <Box sx={{ width: 190 }}>
          <Typography sx={monoLabel}>Owner</Typography>
          <OrgSelect label="" value={owner} onChange={(v) => { setOwner(v); canEdit && !locked && onCommitOwner(v); }}
            size="small" fullWidth disabled={!canEdit || locked} />
        </Box>

        <Box sx={{ width: 96 }}>
          <Typography sx={monoLabel}>Day from start</Typography>
          <TextField type="number" size="small" fullWidth value={dayOffset} disabled={!canEdit || locked}
            slotProps={{ htmlInput: { min: 0, sx: fieldInputSx } }}
            onChange={(e) => setDayOffset(e.target.value)}
            onBlur={() => canEdit && !locked && onCommitOffset(dayOffset)} />
        </Box>

        <Typography variant="caption" sx={{
          color: "text.secondary", fontWeight: 600, mb: 1, px: 0.85, py: 0.15, borderRadius: 5,
          bgcolor: "action.hover", textTransform: "uppercase", fontSize: 10, letterSpacing: 0.4,
        }}>
          or
        </Typography>

        <Box sx={{ width: 150 }}>
          <Typography sx={monoLabel}>Planned start date</Typography>
          <TextField type="date" size="small" fullWidth value={startDateLocal} disabled={!canEdit || locked}
            slotProps={{ htmlInput: { sx: fieldInputSx } }}
            onChange={(e) => setStartDateLocal(e.target.value)}
            onBlur={() => canEdit && !locked && onCommitStartDate(startDateLocal)} />
        </Box>

        <Box sx={{ width: 96 }}>
          <Typography sx={monoLabel}>Duration (days)</Typography>
          <TextField type="number" size="small" fullWidth value={duration} disabled={!canEdit || locked}
            slotProps={{ htmlInput: { min: 1, sx: fieldInputSx } }}
            onChange={(e) => setDuration(e.target.value)}
            onBlur={() => canEdit && !locked && onCommitDuration(duration)} />
        </Box>

        <Tooltip title="View history">
          <span>
            <Button size="small" startIcon={<HistoryIcon sx={{ fontSize: 15 }} />} onClick={onOpenHistory} disabled={!task.history?.length} sx={{ ml: "auto", fontSize: 12 }}>
              {task.history?.length ? `${task.history.length} change${task.history.length > 1 ? "s" : ""}` : "No changes"}
            </Button>
          </span>
        </Tooltip>
        {canEdit && (
          <Tooltip title="Edit name, description, priority & dependencies">
            <IconButton size="small" onClick={onOpenEditor}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
        )}
        {canEdit && (
          <Tooltip title="Delete task">
            <IconButton size="small" color="error" onClick={() => setConfirmDelete(true)}><DeleteOutlineIcon fontSize="small" /></IconButton>
          </Tooltip>
        )}
      </Stack>

      {task.status === "Pending Approval" && task.pendingChange && (
        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: "rgba(157,127,224,0.08)", border: `1px dashed ${STATUS_HEX.violet}` }}>
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
    </Box>
  );
}
