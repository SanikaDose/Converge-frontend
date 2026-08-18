"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { OrgSelect } from "./common";
import { TemplatePreviewDialog } from "./TemplatePreviewDialog";
import { TEMPLATE, WEEKDAY_SHORT, WEEKDAY_LABELS, MAX_WEEK_OFF_DAYS, PHASE_DISCIPLINE_OPTIONS } from "@/lib/data";
import { suggestedEndDate, guessEmployeeIdFromFreeText } from "@/lib/businessLogic";
import { todayISO, DEFAULT_WEEK_OFF, addWorkingDays } from "@/lib/dateUtils";
import { useOrgContext } from "@/context/OrgContext";
import { useGetProjectTemplateQuery } from "@/store/api/projectTemplatesApi";
import type { PhaseDiscipline, ProjectMeta, ProjectType, WeekDay } from "@/lib/types";

/** A phase reduced to what the count preview needs, from either source. */
interface PhaseCount { discipline: PhaseDiscipline | null; taskCount: number }

/** Phases + tasks the chosen disciplines generate — mirrors the backend filter.
 * An empty selection means the full plan (every phase). */
function planCounts(phases: PhaseCount[], disciplines: PhaseDiscipline[]) {
  const included = disciplines.length === 0 ? phases : phases.filter(p => !p.discipline || disciplines.includes(p.discipline));
  return { phases: included.length, tasks: included.reduce((a, p) => a + p.taskCount, 0) };
}

// Displayed Monday → Sunday rather than the Date#getUTCDay() order (Sun=0
// first) that WEEKDAY_SHORT/WEEKDAY_LABELS are keyed by — this is purely a
// display-order change, the underlying WeekDay values are unchanged.
const ALL_WEEKDAYS: WeekDay[] = [1, 2, 3, 4, 5, 6, 0];

export interface ProjectFormPayload {
  name: string;
  type: ProjectType;
  disciplines: PhaseDiscipline[];
  customer: string;
  location: string;
  owner: string | null;
  startDate: string;
  endDate: string;
  weekOff: WeekDay[];
}

/**
 * Prefill for a NEW project form — distinct from `initial` (which puts the
 * form in edit mode). Used by the "New product" button to seed the
 * Elansol/Pune/Product defaults without triggering any edit-mode behaviour.
 */
export interface ProjectFormDefaults {
  type?: ProjectType;
  customer?: string;
  location?: string;
}

/** Shared dialog for both "New project" and "Project settings" (edit). */
export function ProjectForm({ title, initial, defaults, onClose, onSubmit, busy, submitLabel }: {
  title: string;
  initial?: ProjectMeta | null;
  defaults?: ProjectFormDefaults;
  onClose: () => void;
  onSubmit: (payload: ProjectFormPayload) => void;
  busy: boolean;
  submitLabel: string;
}) {
  const { employeeById, employees } = useOrgContext();
  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState<ProjectType>(initial?.type || defaults?.type || "Product");
  // Disciplines drive which phases are generated — only meaningful when
  // creating (an existing project's phases already exist). Defaults to all
  // selected, i.e. the full plan.
  const [disciplines, setDisciplines] = useState<PhaseDiscipline[]>([...PHASE_DISCIPLINE_OPTIONS]);
  const [customer, setCustomer] = useState(initial?.customer || defaults?.customer || "");
  const [location, setLocation] = useState(initial?.location || defaults?.location || "");
  const [owner, setOwner] = useState<string | null>(
    initial?.owner && employeeById[initial.owner] ? initial.owner : null,
  );
  const [startDate, setStartDate] = useState(initial?.startDate || todayISO());
  const [weekOff, setWeekOff] = useState<WeekDay[]>(initial?.weekOff?.length ? initial.weekOff : DEFAULT_WEEK_OFF);
  const [endDate, setEndDate] = useState(initial?.endDate || suggestedEndDate(initial?.startDate || todayISO(), weekOff));
  const [endTouched, setEndTouched] = useState(!!initial?.endDate);
  const [showPreview, setShowPreview] = useState(false);

  // The live master template (admins may have edited it). Only needed when
  // creating — Project Settings doesn't show the count/discipline preview.
  // Falls back to the in-code TEMPLATE until the request resolves so the
  // preview never flashes empty.
  const { data: templatePhases } = useGetProjectTemplateQuery(undefined, { skip: !!initial });
  const phaseCounts = useMemo<PhaseCount[]>(() => (
    templatePhases?.length
      ? templatePhases.map(p => ({ discipline: p.discipline, taskCount: p.tasks.length }))
      : TEMPLATE.map(p => ({ discipline: p.discipline ?? null, taskCount: p.tasks.length }))
  ), [templatePhases]);
  // Latest planned finish across the template, for the default end date.
  const templateMaxSpan = useMemo<number | null>(() => {
    if (!templatePhases?.length) return null;
    let m = 0;
    templatePhases.forEach(p => p.tasks.forEach(t => { m = Math.max(m, t.dayOffset + t.duration); }));
    return m;
  }, [templatePhases]);
  const suggestEnd = (start: string, wo: WeekDay[]) =>
    templateMaxSpan != null ? addWorkingDays(start, templateMaxSpan, wo) : suggestedEndDate(start, wo);

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
    if (!endTouched) setEndDate(suggestEnd(startDate, weekOff));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endTouched, weekOff, templateMaxSpan]);

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
        {/* Product/Solution toggle only when editing an existing project —
            on creation the type comes from which button was clicked (New
            Product vs New Project), so the toggle would just be redundant. */}
        {initial && (
          <ToggleButtonGroup exclusive value={type} onChange={(_e, v: ProjectType | null) => v && setType(v)} size="small">
            <ToggleButton value="Product">Product</ToggleButton>
            <ToggleButton value="Solution">Solution</ToggleButton>
          </ToggleButtonGroup>
        )}

        {/* Discipline multi-picker — creation only. Filters which phases get
            built: e.g. selecting only Software excludes the Vision and
            Automation phases. Pick several to include several. An existing
            project's phases already exist, so it's hidden on edit. */}
        {!initial && (
          <TextField
            select label="Disciplines" fullWidth value={disciplines}
            onChange={(e) => {
              const v = e.target.value as unknown as string[] | string;
              setDisciplines((typeof v === "string" ? v.split(",") : v) as PhaseDiscipline[]);
            }}
            slotProps={{
              select: {
                multiple: true,
                renderValue: (sel) => {
                  const arr = sel as PhaseDiscipline[];
                  return arr.length === 0 || arr.length === PHASE_DISCIPLINE_OPTIONS.length
                    ? "All disciplines" : arr.join(", ");
                },
              },
            }}
            helperText="Which teams' phases to include. Select several, or leave all selected for the full plan."
          >
            {PHASE_DISCIPLINE_OPTIONS.map(d => (
              <MenuItem key={d} value={d}>
                <Checkbox size="small" checked={disciplines.includes(d)} />
                <ListItemText primary={d} />
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField label="Project name" fullWidth value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. TE Connectivity — Robotic Connector Inspection Cell" />

        <TextField label="Customer" fullWidth value={customer} onChange={(e) => setCustomer(e.target.value)}
          placeholder="e.g. TE Connectivity" />

        <TextField label="Location" fullWidth value={location} onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Pune, India" />

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

        </Stack>

        <Typography variant="caption" color="text.secondary">
          {!initial
            ? `Creates a ${planCounts(phaseCounts, disciplines).phases}-phase, ${planCounts(phaseCounts, disciplines).tasks}-task plan automatically (business-day scheduled)${disciplines.length && disciplines.length < PHASE_DISCIPLINE_OPTIONS.length ? ` — only the common and ${disciplines.join(" / ")} phases` : ""}. Phases and tasks can be edited afterwards.`
            : "Changing the start date or week off will re-calculate every task's planned dates using its current day-offset and duration."}
        </Typography>

        {!initial && (
          <Button
            variant="text" size="small" startIcon={<VisibilityOutlinedIcon fontSize="small" />}
            onClick={() => setShowPreview(true)} sx={{ alignSelf: "flex-start", mt: -0.5 }}
          >
            Preview phases &amp; tasks
          </Button>
        )}
      </DialogContent>

      {showPreview && (
        <TemplatePreviewDialog open onClose={() => setShowPreview(false)} phases={templatePhases} disciplines={disciplines} />
      )}
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canSubmit || busy} startIcon={busy ? <CircularProgress size={16} /> : <AddIcon />}
          onClick={() => onSubmit({ name: name.trim(), type, disciplines, customer: customer.trim(), location: location.trim(), owner, startDate, endDate, weekOff })}>
          {busy ? "Saving…" : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
