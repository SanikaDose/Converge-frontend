"use client";
import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Timeline from "@mui/lab/Timeline";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineDot from "@mui/lab/TimelineDot";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineOppositeContent from "@mui/lab/TimelineOppositeContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import HistoryIcon from "@mui/icons-material/History";
import { fmtDateTime } from "@/lib/dateUtils";
import type { Task } from "@/lib/types";

/**
 * Append-only audit trail viewer. Every entry the app ever writes to a
 * task's `history` array is rendered here, newest first — the array is
 * never mutated or trimmed by this component (or anywhere else), so
 * history can never be overwritten, only added to.
 */
export function TaskHistoryDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const entries = (task.history || []).slice().reverse();
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontFamily: '"Space Grotesk", sans-serif' }}>
        <HistoryIcon fontSize="small" /> Change history — {task.name}
      </DialogTitle>
      <DialogContent dividers>
        {entries.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No changes recorded yet.</Typography>
        ) : (
          <Timeline sx={{ p: 0, m: 0, "& .MuiTimelineItem-root:before": { flex: 0, padding: 0 } }}>
            {entries.map((h, i) => (
              <TimelineItem key={i}>
                <TimelineOppositeContent sx={{ flex: 0.28, color: "text.secondary", fontSize: 11.5, fontFamily: "IBM Plex Mono, monospace" }}>
                  {fmtDateTime(h.ts)}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color="primary" variant="outlined" />
                  {i < entries.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent sx={{ pb: 3 }}>
                  <Typography variant="subtitle2">{h.field}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {String(h.from ?? "—")} → <Box component="span" sx={{ color: "text.primary" }}>{String(h.to ?? "—")}</Box>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    Edited by {h.editedBy || "—"}{h.approvedBy ? ` · confirmed by ${h.approvedBy}` : ""}
                  </Typography>
                  {h.reason && (
                    <Typography variant="caption" sx={{ display: "block", fontStyle: "italic", color: "text.secondary" }}>
                      Reason: {h.reason}
                    </Typography>
                  )}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
