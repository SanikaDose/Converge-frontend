"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Popover from "@mui/material/Popover";
import InputAdornment from "@mui/material/InputAdornment";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import Autocomplete from "@mui/material/Autocomplete";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { alpha } from "@mui/material/styles";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Diversity3Icon from "@mui/icons-material/Diversity3";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import { EmployeeAvatar } from "./common";
import { useOrgContext } from "@/context/OrgContext";
import { useAuth } from "@/context/AuthContext";
import { todayISO } from "@/lib/dateUtils";
import { DASHBOARD_COLORS } from "@/lib/theme";
import { useGetScrumQuery, useSaveScrumMutation } from "@/store/api/scrumApi";
import { useGetProjectsQuery } from "@/store/api/projectsApi";
import { useGetTicketsQuery } from "@/store/api/ticketsApi";
import { useGetMiscTasksQuery } from "@/store/api/miscTasksApi";
import type { ScrumEntry, ScrumReference, ScrumReferenceType, WorkMode } from "@/lib/types";

const WORK_MODES: WorkMode[] = ["Office", "Onsite", "Both", "WFH", "Leave"];

/** Colour + icon per work mode, from the vivid mode-independent palette. */
const MODE_META: Record<WorkMode, { color: string; Icon: typeof ApartmentIcon }> = {
  Office: { color: DASHBOARD_COLORS.blue, Icon: ApartmentIcon },
  Onsite: { color: DASHBOARD_COLORS.violet, Icon: BusinessCenterOutlinedIcon },
  Both: { color: DASHBOARD_COLORS.amber, Icon: SwapHorizIcon },
  WFH: { color: DASHBOARD_COLORS.green, Icon: HomeOutlinedIcon },
  Leave: { color: DASHBOARD_COLORS.red, Icon: EventBusyOutlinedIcon },
};

/** Group heading + accent colour per reference type. */
const REF_GROUP: Record<ScrumReferenceType, string> = { na: "General", other: "General", project: "Projects", task: "Tasks", ticket: "Tickets" };
const REF_COLOR: Record<ScrumReferenceType, string> = {
  project: DASHBOARD_COLORS.blue,
  task: DASHBOARD_COLORS.violet,
  ticket: DASHBOARD_COLORS.orange,
  na: DASHBOARD_COLORS.slate,
  other: DASHBOARD_COLORS.slate,
};

/** Generic, entity-less choices shown at the top of the work-item dropdown. */
const GENERAL_OPTIONS: ScrumReference[] = [
  { type: "na", id: "na", label: "Not Applicable" },
  { type: "other", id: "other", label: "Other" },
];

interface Draft { workPerformed: string; workMode: WorkMode; references: ScrumReference[]; }

/** A saved row counts as "updated" if there's text, a work item, or it's a Leave. */
const isUpdated = (e: ScrumEntry) =>
  e.workPerformed.trim().length > 0 || (e.references?.length ?? 0) > 0 || e.workMode === "Leave";

/* ---------- date helpers (scrum date is a plain YYYY-MM-DD, tz-safe) ------ */
const shiftDate = (iso: string, days: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
const dayLabel = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  });
};

/* ------------------------------------------------------------- work mode */

function WorkModeSelect({ value, onChange, disabled }: { value: WorkMode; onChange: (v: WorkMode) => void; disabled?: boolean }) {
  const meta = MODE_META[value];
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as WorkMode)}
      disabled={disabled}
      size="small"
      renderValue={(v) => {
        const m = MODE_META[v as WorkMode];
        const I = m.Icon;
        return (
          <Stack direction="row" alignItems="center" gap={0.75}>
            <I sx={{ fontSize: 17, color: m.color }} />
            <Box component="span" sx={{ color: m.color, fontWeight: 600, fontSize: 13.5 }}>{v}</Box>
          </Stack>
        );
      }}
      sx={{
        minWidth: 140, borderRadius: 2, fontWeight: 600, bgcolor: alpha(meta.color, 0.14),
        transition: "background-color .15s ease",
        "&:hover": { bgcolor: alpha(meta.color, 0.2) },
        "& .MuiOutlinedInput-notchedOutline": { borderColor: alpha(meta.color, 0.45), borderWidth: 1 },
        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha(meta.color, 0.6) },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: meta.color, borderWidth: 1.5 },
        "& .MuiSelect-icon": { color: meta.color },
        "& .MuiSelect-select": { py: 0.9 },
      }}
    >
      {WORK_MODES.map((m) => {
        const M = MODE_META[m];
        const I = M.Icon;
        return (
          <MenuItem key={m} value={m}>
            <I sx={{ fontSize: 17, color: M.color, mr: 1 }} /> {m}
          </MenuItem>
        );
      })}
    </Select>
  );
}

/* -------------------------------------------------------------------- page */

export function ScrumPage() {
  const { employees: allEmployees, teams } = useOrgContext();
  const { user } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState<string>(todayISO());

  // The board only lists people who are on scrum and still active — sales team
  // and a few others are excluded, and someone who left the org drops off.
  const employees = useMemo(
    () => allEmployees.filter((e) => e.status !== "inactive" && e.scrumEnabled !== false),
    [allEmployees],
  );

  // Editing rules: only today is editable (previous days are read-only), and a
  // regular user may edit only their own row — an admin/lead edits anyone's.
  const isEditableDay = date === todayISO();
  const canEditAll = user?.appRole === "Admin" || user?.appRole === "Lead";
  const canEditRow = (empId: string) => isEditableDay && (canEditAll || user?.id === empId);
  const { data: entriesData, isFetching } = useGetScrumQuery(date);
  const [saveScrum, { isLoading: saving }] = useSaveScrumMutation();

  // Generic work-item options — every project, misc task and ticket, NOT scoped
  // to what's assigned to anyone (a person may work on something not theirs).
  const { data: projectsData } = useGetProjectsQuery();
  const { data: ticketsData } = useGetTicketsQuery();
  const { data: miscTasksData } = useGetMiscTasksQuery();
  const workItemOptions = useMemo<ScrumReference[]>(() => {
    const opts: ScrumReference[] = [...GENERAL_OPTIONS];
    for (const p of projectsData ?? []) opts.push({ type: "project", id: p.id, label: p.name });
    for (const t of miscTasksData ?? []) opts.push({ type: "task", id: t.id, label: t.title });
    for (const tk of ticketsData ?? []) opts.push({ type: "ticket", id: tk.id, label: `TKT-${tk.seq} · ${tk.title}` });
    return opts;
  }, [projectsData, miscTasksData, ticketsData]);

  const entries: ScrumEntry[] = useMemo(() => entriesData ?? [], [entriesData]);
  const entriesByEmp = useMemo(
    () => Object.fromEntries(entries.map((e) => [e.employeeId, e])),
    [entries],
  );

  // The previous day, shown read-only beside today so both are on one screen
  // (classic "Yesterday / Today" standup view).
  const prevDate = shiftDate(date, -1);
  const { data: prevData } = useGetScrumQuery(prevDate);
  const prevByEmp = useMemo(
    () => Object.fromEntries((prevData ?? []).map((e) => [e.employeeId, e])),
    [prevData],
  );

  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("All");
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);

  // A ref mirror of `draft` so auto-save reads the latest values synchronously
  // (state updates are async, and a dropdown change saves immediately).
  const draftRef = useRef<Record<string, Draft>>({});
  // Debounce timers per employee, for save-on-type.
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Guards re-seeding: only re-seed when the day or the roster changes, NOT when
  // an auto-save refetch updates the entries (which would clobber a live edit).
  const seededKey = useRef<string | null>(null);

  // Seed the editable draft from the day's saved entries (defaults for the rest).
  useEffect(() => {
    const key = `${date}|${employees.length}`;
    if (seededKey.current === key) return; // already seeded this day + roster
    if (isFetching) return;                // wait until this date's entries arrive
    const next: Record<string, Draft> = {};
    for (const emp of employees) {
      const e = entriesByEmp[emp.id];
      next[emp.id] = e
        ? { workPerformed: e.workPerformed, workMode: e.workMode, references: e.references ?? [] }
        : { workPerformed: "", workMode: "Office", references: [] };
    }
    draftRef.current = next;
    setDraft(next);
    seededKey.current = key;
  }, [date, employees, entriesByEmp, isFetching]);

  // Update a field in both the ref (for immediate reads) and state (for render).
  const setField = (empId: string, patch: Partial<Draft>) => {
    const cur = draftRef.current[empId] ?? { workPerformed: "", workMode: "Office" as WorkMode, references: [] as ScrumReference[] };
    const next = { ...draftRef.current, [empId]: { ...cur, ...patch } };
    draftRef.current = next;
    setDraft(next);
  };

  // Persist a single row (the whole day's grid isn't sent — just this employee).
  const persistRow = useCallback(async (empId: string) => {
    const row = draftRef.current[empId];
    if (!row) return;
    try {
      await saveScrum({
        date,
        entries: [{ employeeId: empId, workPerformed: row.workPerformed, workMode: row.workMode, references: row.references }],
      }).unwrap();
    } catch (e) { console.error(e); }
  }, [date, saveScrum]);

  // Save-on-type: debounce so a save fires shortly after the user pauses.
  const scheduleSave = useCallback((empId: string) => {
    if (saveTimers.current[empId]) clearTimeout(saveTimers.current[empId]);
    saveTimers.current[empId] = setTimeout(() => {
      delete saveTimers.current[empId];
      persistRow(empId);
    }, 700);
  }, [persistRow]);

  // Save immediately (dropdown change, or the field losing focus).
  const flushSave = useCallback((empId: string) => {
    if (saveTimers.current[empId]) { clearTimeout(saveTimers.current[empId]); delete saveTimers.current[empId]; }
    persistRow(empId);
  }, [persistRow]);

  // Flush any pending debounced saves on unmount.
  useEffect(() => {
    const timers = saveTimers.current;
    return () => { Object.values(timers).forEach(clearTimeout); };
  }, []);

  // Ordered, filtered view (search by name, filter by team). Numbering follows
  // this list. Save always covers everyone, regardless of the filter.
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...employees]
      .filter((e) => (teamFilter === "All" || e.teamId === teamFilter))
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, search, teamFilter]);

  const total = employees.length;
  const updatedCount = useMemo(() => entries.filter(isUpdated).length, [entries]);
  const allUpdated = total > 0 && updatedCount >= total;
  const isToday = date === todayISO();

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", height: { xs: "calc(100vh - 96px)", md: "calc(100vh - 116px)" } }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2} sx={{ mb: 2.5 }}>
        <Box>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Daily Scrum</Typography>
            <CalendarMonthIcon sx={{ color: DASHBOARD_COLORS.blue, fontSize: 22 }} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            What did you work on today? Mention your projects, tasks and/or tickets.
          </Typography>
        </Box>

        <Stack alignItems="flex-end" gap={1}>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            {!isToday && (
              <Button size="small" onClick={() => setDate(todayISO())}
                sx={{ textTransform: "none", fontWeight: 600, color: DASHBOARD_COLORS.blue, borderRadius: 2 }}>
                Today
              </Button>
            )}
            {/* Date navigation — one segmented pill: ‹  date  › */}
            <Stack direction="row" alignItems="center" sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", overflow: "hidden" }}>
              <IconButton size="small" onClick={() => setDate((d) => shiftDate(d, -1))} sx={{ borderRadius: 0 }}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <Button onClick={(e) => setDateAnchor(e.currentTarget)} startIcon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} endIcon={<KeyboardArrowDownIcon />}
                sx={{ color: "text.primary", textTransform: "none", fontWeight: 600, px: 1.5, borderRadius: 0, borderLeft: "1px solid", borderRight: "1px solid", borderColor: "divider", minWidth: 168 }}>
                {dayLabel(date)}
              </Button>
              <IconButton size="small" onClick={() => setDate((d) => shiftDate(d, 1))} sx={{ borderRadius: 0 }}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {/* No save button — every edit auto-saves; this shows the live status. */}
          <Stack direction="row" alignItems="center" gap={1}>
            {isEditableDay ? (
              <Stack direction="row" alignItems="center" gap={0.5} sx={{ color: "text.secondary" }}>
                {saving
                  ? <CircularProgress size={12} color="inherit" />
                  : <CheckCircleIcon sx={{ fontSize: 14, color: DASHBOARD_COLORS.green }} />}
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {saving ? "Saving…" : "Saved automatically"}
                </Typography>
              </Stack>
            ) : (
              <Stack direction="row" alignItems="center" gap={0.5} sx={{ color: "text.secondary" }}>
                <LockOutlinedIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Read-only (previous day)</Typography>
              </Stack>
            )}
            <Chip
              icon={allUpdated ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : undefined}
              label={allUpdated ? `All ${updatedCount}/${total} updated` : `${updatedCount}/${total} updated`}
              size="small"
              sx={{
                fontWeight: 600, borderRadius: "8px",
                color: allUpdated ? DASHBOARD_COLORS.green : "text.secondary",
                bgcolor: allUpdated ? alpha(DASHBOARD_COLORS.green, 0.13) : "action.hover",
                border: "1px solid",
                borderColor: allUpdated ? alpha(DASHBOARD_COLORS.green, 0.3) : "divider",
                "& .MuiChip-icon": { color: DASHBOARD_COLORS.green },
              }}
            />
          </Stack>
        </Stack>
      </Stack>

      <Popover open={!!dateAnchor} anchorEl={dateAnchor} onClose={() => setDateAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <Box sx={{ p: 2 }}>
          <TextField type="date" value={date} onChange={(e) => { if (e.target.value) setDate(e.target.value); }}
            size="small" autoFocus slotProps={{ inputLabel: { shrink: true } }} />
        </Box>
      </Popover>

      {/* Guidance + search/filter */}
      <Stack direction="row" gap={1.5} sx={{ mb: 2.5 }} flexWrap="wrap" alignItems="stretch">
        <Stack direction="row" alignItems="center" gap={1.25} sx={{
          flex: 1, minWidth: 280, px: 2, py: 1.25, borderRadius: 2,
          bgcolor: alpha(DASHBOARD_COLORS.blue, 0.08), border: "1px solid", borderColor: alpha(DASHBOARD_COLORS.blue, 0.18),
        }}>
          <Diversity3Icon sx={{ color: DASHBOARD_COLORS.blue, fontSize: 22 }} />
          <Typography variant="body2" color="text.secondary">
            Be clear and concise. Mention the project name, task or ticket and what you worked on. This helps the team stay aligned.
          </Typography>
        </Stack>

        <TextField placeholder="Search by employee name…" value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 240, bgcolor: "background.paper", "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "text.disabled" }} /></InputAdornment> } }} />

        <Select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} size="small" displayEmpty
          sx={{ minWidth: 170, bgcolor: "background.paper", borderRadius: 2 }}>
          <MenuItem value="All">All Teams</MenuItem>
          {teams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
        </Select>
      </Stack>

      {/* Table */}
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2.5, bgcolor: "background.paper", overflow: "auto", flex: 1, minHeight: 0 }}>
        {/* Fixed layout: column widths are honoured regardless of cell content,
            so a row with many Project/Task/Ticket chips can't widen the column
            or shift the rest of the table. */}
        <Table stickyHeader sx={{ minWidth: 1300, tableLayout: "fixed" }}>
          <TableHead>
            <TableRow sx={{ "& th": { bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider", py: 1.5, fontWeight: 700, fontSize: 12.5, color: "text.secondary", letterSpacing: 0.2 } }}>
              <TableCell sx={{ width: 60 }}>No.</TableCell>
              <TableCell sx={{ width: 200 }}>Employee</TableCell>
              <TableCell sx={{ width: 240 }}>Yesterday · {dayLabel(prevDate)}</TableCell>
              <TableCell sx={{ width: 360 }}>Project / Task / Ticket</TableCell>
              <TableCell>Today&apos;s Work</TableCell>
              <TableCell sx={{ width: 170 }}>Work Mode</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((emp, i) => {
              const d = draft[emp.id] ?? { workPerformed: "", workMode: "Office" as WorkMode, references: [] as ScrumReference[] };
              const saved = entriesByEmp[emp.id];
              const prev = prevByEmp[emp.id];
              const done = !!saved && isUpdated(saved);
              const isLeave = d.workMode === "Leave";
              const editable = canEditRow(emp.id);
              return (
                <TableRow key={emp.id} sx={{
                  transition: "background-color .12s ease",
                  "&:hover": { bgcolor: "action.hover" },
                  ...(isLeave ? { bgcolor: alpha(DASHBOARD_COLORS.red, 0.045) } : {}),
                  "& td": { borderBottom: "1px solid", borderColor: "divider", verticalAlign: "top", py: 2 },
                }}>
                  <TableCell>
                    <Box sx={{
                      width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center",
                      fontSize: 12.5, fontWeight: 700,
                      bgcolor: done ? alpha(DASHBOARD_COLORS.green, 0.15) : "transparent",
                      border: done ? "1px solid transparent" : "1px solid",
                      borderColor: done ? "transparent" : "divider",
                      color: done ? DASHBOARD_COLORS.green : "text.secondary",
                    }}>{i + 1}</Box>
                  </TableCell>
                  <TableCell>
                    {/* Click the person to jump to their Kanban board, with them
                        preselected in the assignee filter (/kanban?user=<id>). */}
                    <Tooltip title="Open this person's tasks in Kanban" disableInteractive>
                      <Stack direction="row" alignItems="center" gap={1.25}
                        onClick={() => router.push(`/kanban?user=${emp.id}`)}
                        sx={{ cursor: "pointer", width: "fit-content", "&:hover .scrum-emp-name": { color: "primary.main", textDecoration: "underline" } }}>
                        <EmployeeAvatar employeeId={emp.id} size={34} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography className="scrum-emp-name" variant="body2" sx={{ fontWeight: 700 }} noWrap>{emp.name}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>{emp.role}</Typography>
                        </Box>
                      </Stack>
                    </Tooltip>
                  </TableCell>
                  {/* Yesterday — read-only, so you see the last update next to today's. */}
                  <TableCell>
                    {prev && (prev.workPerformed.trim() || prev.workMode === "Leave" || (prev.references?.length ?? 0) > 0) ? (
                      <Stack gap={0.75}>
                        {prev.workPerformed.trim() ? (
                          <Typography variant="body2" sx={{ fontSize: 13, whiteSpace: "pre-wrap", color: "text.secondary" }}>{prev.workPerformed}</Typography>
                        ) : (
                          <Typography variant="caption" sx={{ fontStyle: "italic", color: "text.disabled" }}>
                            {prev.workMode === "Leave" ? "On leave" : "No description"}
                          </Typography>
                        )}
                        <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
                          {(() => { const m = MODE_META[prev.workMode]; const I = m.Icon; return (
                            <Chip size="small" icon={<I sx={{ fontSize: 14 }} />} label={prev.workMode}
                              sx={{ height: 20, borderRadius: "6px", fontSize: 11, fontWeight: 600, color: m.color, bgcolor: alpha(m.color, 0.12), "& .MuiChip-icon": { color: m.color, ml: "4px" } }} />
                          ); })()}
                          {(prev.references ?? []).map((r) => (
                            <Chip key={`${r.type}:${r.id}`} size="small" label={r.label}
                              sx={{ height: 20, maxWidth: 150, borderRadius: "6px", fontSize: 11, fontWeight: 600, color: REF_COLOR[r.type], bgcolor: alpha(REF_COLOR[r.type], 0.12) }} />
                          ))}
                        </Stack>
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.disabled">No update</Typography>
                    )}
                  </TableCell>
                  {/* Project / Task / Ticket (multi-select) — sits before today's
                      work so you pick what you worked on, then describe it. */}
                  <TableCell>
                    <Autocomplete
                      multiple size="small" disableCloseOnSelect
                      disabled={isLeave || !editable}
                      options={workItemOptions}
                      value={d.references}
                      groupBy={(o) => REF_GROUP[o.type]}
                      getOptionLabel={(o) => o.label}
                      isOptionEqualToValue={(a, b) => a.type === b.type && a.id === b.id}
                      onChange={(_, val) => {
                        // "Not Applicable" is exclusive: picking it clears the
                        // rest, and picking anything else clears it.
                        const lastAdded = val[val.length - 1];
                        let next = val;
                        if (lastAdded?.type === "na") next = [lastAdded];
                        else if (val.some((v) => v.type === "na")) next = val.filter((v) => v.type !== "na");
                        setField(emp.id, { references: next });
                        flushSave(emp.id);
                      }}
                      renderValue={(value, getItemProps) => {
                        // Show at most a few chips + a "+N" counter so the field
                        // stays a stable, small height no matter how many are
                        // selected (was overflowing into the row below). Manage
                        // the full set from the dropdown checkboxes.
                        const MAX_CHIPS = 3;
                        const shown = value.slice(0, MAX_CHIPS);
                        const extra = value.length - shown.length;
                        return (
                          <>
                            {shown.map((opt, index) => {
                              const c = REF_COLOR[opt.type];
                              const { key, ...itemProps } = getItemProps({ index });
                              return (
                                <Chip key={`${opt.type}:${opt.id}`} {...itemProps} label={opt.label} size="small"
                                  sx={{
                                    maxWidth: 170, height: 22, borderRadius: "7px", fontWeight: 600,
                                    color: c, bgcolor: alpha(c, 0.13),
                                    "& .MuiChip-deleteIcon": { color: alpha(c, 0.7), "&:hover": { color: c } },
                                  }} />
                              );
                            })}
                            {extra > 0 && (
                              <Chip label={`+${extra}`} size="small"
                                sx={{ height: 22, borderRadius: "7px", fontWeight: 700, color: "text.secondary", bgcolor: "action.selected" }} />
                            )}
                          </>
                        );
                      }}
                      renderInput={(params) => (
                        <TextField {...params} placeholder={d.references.length ? "" : "Select…"} />
                      )}
                      sx={{
                        minWidth: 200,
                        // Cap the chip area at a fixed height and scroll inside it,
                        // so selecting many items never grows the row (the field
                        // stays the same size; extra chips scroll).
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2, bgcolor: (isLeave || !editable) ? "action.hover" : "background.default",
                          maxHeight: 76, overflowY: "auto", alignContent: "flex-start", py: 0.5,
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={d.workPerformed}
                      onChange={(e) => { setField(emp.id, { workPerformed: e.target.value }); scheduleSave(emp.id); }}
                      onBlur={() => flushSave(emp.id)}
                      placeholder={isLeave ? "On leave — no update needed." : "Describe what you worked on today — project, task or ticket…"}
                      disabled={isLeave || !editable}
                      fullWidth multiline minRows={2} maxRows={6}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2, fontSize: 14,
                          bgcolor: (isLeave || !editable) ? "action.hover" : "background.default",
                          transition: "background-color .15s ease, border-color .15s ease",
                          "&:hover:not(.Mui-disabled)": { bgcolor: "background.paper" },
                          "&.Mui-focused": { bgcolor: "background.paper" },
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <WorkModeSelect value={d.workMode} disabled={!editable} onChange={(v) => { setField(emp.id, { workMode: v }); flushSave(emp.id); }} />
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
                    <Diversity3Icon sx={{ fontSize: 40, opacity: 0.4 }} />
                    <Typography sx={{ mt: 1 }}>
                      {isFetching ? "Loading…" : (total === 0 ? "No employees found." : "No employees match your search.")}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
