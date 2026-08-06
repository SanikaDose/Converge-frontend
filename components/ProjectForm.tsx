"use client";
import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import { OrgSelect } from "./common";
import { TEMPLATE, EMPLOYEE_BY_ID } from "@/lib/data";
import { suggestedEndDate, guessEmployeeIdFromFreeText } from "@/lib/businessLogic";
import { todayISO } from "@/lib/dateUtils";
import type { ProjectMeta, ProjectType } from "@/lib/types";

const TASK_COUNT = TEMPLATE.reduce((a, p) => a + p.tasks.length, 0);

export interface ProjectFormPayload {
  name: string;
  type: ProjectType;
  customer: string;
  owner: string | null;
  startDate: string;
  endDate: string;
}

// Projects created before the org directory existed stored `owner` as a
// free-text name (e.g. "Bharat"). Map that to a real employee id where
// possible so editing an old project doesn't show a blank dropdown.
function normalizeOwner(owner: string | null | undefined): string | null {
  if (!owner) return null;
  if (EMPLOYEE_BY_ID[owner]) return owner;
  return guessEmployeeIdFromFreeText(owner);
}

/** Shared dialog for both "New project" and "Project settings" (edit). */
export function ProjectForm({ title, initial, onClose, onSubmit, busy, submitLabel }: {
  title: string;
  initial?: ProjectMeta | null;
  onClose: () => void;
  onSubmit: (payload: ProjectFormPayload) => void;
  busy: boolean;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState<ProjectType>(initial?.type || "Product");
  const [customer, setCustomer] = useState(initial?.customer || "");
  const [owner, setOwner] = useState(normalizeOwner(initial?.owner));
  const [startDate, setStartDate] = useState(initial?.startDate || todayISO());
  const [endDate, setEndDate] = useState(initial?.endDate || suggestedEndDate(initial?.startDate || todayISO()));
  const [endTouched, setEndTouched] = useState(!!initial?.endDate);

  useEffect(() => {
    if (!endTouched) setEndDate(suggestedEndDate(startDate));
  }, [startDate, endTouched]);

  const canSubmit = name.trim() && customer.trim() && startDate && endDate;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: '"Space Grotesk", sans-serif' }}>{title}</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}>
        <ToggleButtonGroup exclusive value={type} onChange={(_e, v: ProjectType | null) => v && setType(v)} size="small">
          <ToggleButton value="Product">Product</ToggleButton>
          <ToggleButton value="Solution">Solution</ToggleButton>
        </ToggleButtonGroup>

        <TextField label="Project name" fullWidth value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. TE Connectivity — Robotic Connector Inspection Cell" />

        <TextField label="Customer" fullWidth value={customer} onChange={(e) => setCustomer(e.target.value)}
          placeholder="e.g. TE Connectivity" />

        <OrgSelect label="Project lead / owner" value={owner} onChange={setOwner} />

        <Stack direction="row" spacing={2}>
          <TextField label="Project start" type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }}
            value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <TextField label="Project end" type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }}
            value={endDate} onChange={(e) => { setEndDate(e.target.value); setEndTouched(true); }} />
        </Stack>

        <Typography variant="caption" color="text.secondary">
          {!initial
            ? `Creates the full 12-phase, ${TASK_COUNT}-task plan automatically (business-day scheduled). Phases and tasks can be edited afterwards.`
            : "Changing the start date will re-calculate every task's planned dates using its current day-offset and duration."}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canSubmit || busy} startIcon={busy ? <CircularProgress size={16} /> : <AddIcon />}
          onClick={() => onSubmit({ name: name.trim(), type, customer: customer.trim(), owner, startDate, endDate })}>
          {busy ? "Saving…" : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
