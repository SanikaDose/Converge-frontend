"use client";
import React, { useState, useEffect, useRef } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import { OrgSelect } from "./common";
import { TEMPLATE, WEEKDAY_SHORT, WEEKDAY_LABELS, MAX_WEEK_OFF_DAYS } from "@/lib/data";
import { suggestedEndDate, guessEmployeeIdFromFreeText } from "@/lib/businessLogic";
import { todayISO, DEFAULT_WEEK_OFF } from "@/lib/dateUtils";
import { useOrgContext } from "@/context/OrgContext";
import type { ProjectMeta, ProjectType, WeekDay } from "@/lib/types";

const TASK_COUNT = TEMPLATE.reduce((a, p) => a + p.tasks.length, 0);
const ALL_WEEKDAYS: WeekDay[] = [0, 1, 2, 3, 4, 5, 6];

export interface ProjectFormPayload {
  name: string;
  type: ProjectType;
  customer: string;
  owner: string | null;
  startDate: string;
  endDate: string;
  weekOff: WeekDay[];
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
  const { employeeById, employees } = useOrgContext();
  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState<ProjectType>(initial?.type || "Product");
  const [customer, setCustomer] = useState(initial?.customer || "");
  const [owner, setOwner] = useState<string | null>(
    initial?.owner && employeeById[initial.owner] ? initial.owner : null,
  );
  const [startDate, setStartDate] = useState(initial?.startDate || todayISO());
  const [weekOff, setWeekOff] = useState<WeekDay[]>(initial?.weekOff?.length ? initial.weekOff : DEFAULT_WEEK_OFF);
  const [endDate, setEndDate] = useState(initial?.endDate || suggestedEndDate(initial?.startDate || todayISO(), weekOff));
  const [endTouched, setEndTouched] = useState(!!initial?.endDate);

  // Projects created before the org directory existed stored `owner` as
  // a free-text name (e.g. "Bharat") instead of a real employee id. The
  // org directory now loads asynchronously from the backend, so this
  // can't resolve at mount time the way it used to — wait for `employees`
  // to arrive, then map the legacy free text to a real id where possible
  // (once only, so it doesn't clobber the user's own later selection).
  const legacyOwnerResolved = useRef(false);
  useEffect(() => {
    if (legacyOwnerResolved.current || !initial?.owner || employeeById[initial.owner] || employees.length === 0) return;
    legacyOwnerResolved.current = true;
    const guessed = guessEmployeeIdFromFreeText(initial.owner, employees);
    if (guessed) setOwner(guessed);
  }, [initial?.owner, employeeById, employees]);

  useEffect(() => {
    if (!endTouched) setEndDate(suggestedEndDate(startDate, weekOff));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endTouched, weekOff]);

  const canSubmit = name.trim() && customer.trim() && startDate && endDate;

  const toggleWeekOffDay = (day: WeekDay) => {
    setWeekOff(prev => {
      if (prev.includes(day)) return prev.filter(d => d !== day);
      if (prev.length >= MAX_WEEK_OFF_DAYS) return prev;
      return [...prev, day];
    });
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
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

        <Stack spacing={0.75}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: 10.5 }}>
            Week off (max {MAX_WEEK_OFF_DAYS})
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75}>
            {ALL_WEEKDAYS.map(day => {
              const selected = weekOff.includes(day);
              return (
                <Tooltip key={day} title={WEEKDAY_LABELS[day]}>
                  <ToggleButton
                    value={day} selected={selected} size="small"
                    disabled={!selected && weekOff.length >= MAX_WEEK_OFF_DAYS}
                    onChange={() => toggleWeekOffDay(day)}
                    sx={{ width: 52, px: 0 }}
                  >
                    {WEEKDAY_SHORT[day]}
                  </ToggleButton>
                </Tooltip>
              );
            })}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Non-working days for this project's schedule — task dates skip these instead of the default Saturday/Sunday.
          </Typography>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          {!initial
            ? `Creates the full 12-phase, ${TASK_COUNT}-task plan automatically (business-day scheduled). Phases and tasks can be edited afterwards.`
            : "Changing the start date or week off will re-calculate every task's planned dates using its current day-offset and duration."}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canSubmit || busy} startIcon={busy ? <CircularProgress size={16} /> : <AddIcon />}
          onClick={() => onSubmit({ name: name.trim(), type, customer: customer.trim(), owner, startDate, endDate, weekOff })}>
          {busy ? "Saving…" : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
