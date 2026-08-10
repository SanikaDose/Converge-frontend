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

export interface PendingScheduleEdit {
  /** Human label for the field being changed, e.g. "Planned start date". */
  fieldLabel: string;
  from: string;
  to: string;
  /** Applied once a reason is supplied. */
  apply: (reason: string) => void;
  /** Restores the field's displayed value when the user backs out. */
  cancel: () => void;
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
  const trimmed = reason.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    edit.apply(trimmed);
  };

  return (
    <Dialog open onClose={edit.cancel} maxWidth="xs" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <EventRepeatIcon fontSize="small" color="primary" />
            Reason for schedule change
          </Stack>
        </DialogTitle>
        <DialogContent>
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
          <Button type="submit" variant="contained" disabled={!trimmed}>Save change</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
