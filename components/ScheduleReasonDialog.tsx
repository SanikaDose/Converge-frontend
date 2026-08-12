"use client";

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "./Stack";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import { fmt } from "@/lib/dateUtils";

/**
 * The start/finish pair, editable inside the dialog.
 *
 * Both dates live here rather than on the card because the reason prompt
 * fires the instant a date is picked: with the modal open the card's own
 * inputs are unreachable, so moving a task's whole window would otherwise
 * have meant two separate edits and two separate reasons. Here it's one
 * change with one justification.
 */
export interface ScheduleDateEdit {
  start: string;
  finish: string;
  originalStart: string;
  originalFinish: string;
  /** Phase window the start date is clamped to; null when unconstrained. */
  minStart?: string;
  maxStart?: string;
  /** Working days the pair implies — shown live as the user adjusts either date. */
  durationFor: (start: string, finish: string) => number;
  apply: (start: string, finish: string, reason: string) => void;
}

export interface PendingScheduleEdit {
  /** Human label for the field being changed, e.g. "Planned start date". */
  fieldLabel: string;
  from: string;
  to: string;
  /** Applied once a reason is supplied. */
  apply: (reason: string) => void;
  /** Restores the field's displayed value when the user backs out. */
  cancel: () => void;
  /** Present for date changes — renders start and finish as editable inputs. */
  dateEdit?: ScheduleDateEdit;
}

/**
 * Reason prompt for schedule changes. Every edit to a task's dates has to
 * say why, so the task history explains not just what moved but the
 * justification — the whole point of auditing a reschedule.
 *
 * Replaces an earlier `window.prompt`, which was unstyled, unskippable by
 * keyboard convention, and only appeared on the approval-workflow branch.
 */
export function ScheduleReasonDialog({ edit }: { edit: PendingScheduleEdit }) {
  const [reason, setReason] = useState("");
  const [start, setStart] = useState(edit.dateEdit?.start ?? "");
  const [finish, setFinish] = useState(edit.dateEdit?.finish ?? "");
  const trimmed = reason.trim();

  const dateEdit = edit.dateEdit;
  // A finish before its own start isn't a schedule, it's a typo — block the
  // save rather than silently producing a negative duration.
  const invalidRange = !!dateEdit && (!start || !finish || finish < start);
  const unchanged = !!dateEdit && start === dateEdit.originalStart && finish === dateEdit.originalFinish;
  const duration = dateEdit && !invalidRange ? dateEdit.durationFor(start, finish) : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    if (dateEdit) {
      if (invalidRange || unchanged) return;
      dateEdit.apply(start, finish, trimmed);
      return;
    }
    edit.apply(trimmed);
  };

  return (
    <Dialog open onClose={edit.cancel} maxWidth="xs" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <EventRepeatIcon fontSize="small" color="primary" />
            {dateEdit ? "Reschedule task" : "Reason for schedule change"}
          </Stack>
        </DialogTitle>
        <DialogContent>
          {dateEdit ? (
            <Box sx={{
              bgcolor: "background.default", border: "1px solid", borderColor: "divider",
              borderRadius: 1.5, px: 1.5, py: 1.5, mb: 2,
            }}>
              <Stack direction="row" gap={1.5}>
                <TextField
                  type="date" label="Planned start" size="small" fullWidth value={start}
                  onChange={(e) => setStart(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: dateEdit.minStart, max: dateEdit.maxStart } }}
                />
                <TextField
                  type="date" label="Planned finish" size="small" fullWidth value={finish}
                  error={invalidRange}
                  onChange={(e) => setFinish(e.target.value)}
                  // Can't finish before it starts; the picker greys the rest out.
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: start } }}
                />
              </Stack>
              <Typography sx={{ fontSize: 11.5, color: invalidRange ? "error.main" : "text.secondary", mt: 1.25 }}>
                {invalidRange
                  ? "Finish must be on or after the start date."
                  : `${duration} working day${duration === 1 ? "" : "s"} · was ${fmt(dateEdit.originalStart)} → ${fmt(dateEdit.originalFinish)}`}
              </Typography>
            </Box>
          ) : (
            <Box sx={{
              bgcolor: "background.default", border: "1px solid", borderColor: "divider",
              borderRadius: 1.5, px: 1.5, py: 1.25, mb: 2,
            }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary", mb: 0.5 }}>
                {edit.fieldLabel}
              </Typography>
              <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                <Typography sx={{ fontSize: 13, color: "text.secondary", textDecoration: "line-through" }}>{edit.from}</Typography>
                <ArrowRightAltIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{edit.to}</Typography>
              </Stack>
            </Box>
          )}

          <TextField
            autoFocus fullWidth multiline minRows={3} required
            label="Why is this being rescheduled?"
            placeholder="e.g. Customer pushed the site survey by two days."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Saved to this task&apos;s change history.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={edit.cancel}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={!trimmed || invalidRange || unchanged}>Save change</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
