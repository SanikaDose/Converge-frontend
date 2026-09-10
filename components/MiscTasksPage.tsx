"use client";

import React, { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Drawer from "@mui/material/Drawer";
import Checkbox from "@mui/material/Checkbox";
import Menu from "@mui/material/Menu";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import FilterListIcon from "@mui/icons-material/FilterListOutlined";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOffOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/Edit";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import MailOutlineIcon from "@mui/icons-material/EmailOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import { OrgMultiSelect, EmployeeAvatar } from "./common";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useOrgContext } from "@/context/OrgContext";
import { genId } from "@/lib/data";
import { fmt } from "@/lib/dateUtils";
import { DASHBOARD_COLORS } from "@/lib/theme";
import { useGetProjectsQuery } from "@/store/api/projectsApi";
import {
  useGetMiscTasksQuery,
  useCreateMiscTaskMutation,
  useUpdateMiscTaskMutation,
  useUpdateMiscTaskStatusMutation,
  useDeleteMiscTaskMutation,
} from "@/store/api/miscTasksApi";
import type { ChecklistItem, MiscTask, MiscTaskInput, MiscTaskStatus, Priority } from "@/lib/types";

const OTHER = "__other__";
const STATUSES: MiscTaskStatus[] = ["To Do", "In Progress", "On Hold", "Completed"];
const PRIORITIES: Priority[] = ["Low", "Medium", "High"];

/** Chip colour per status/priority, from the vivid mode-independent palette. */
const STATUS_COLOR: Record<MiscTaskStatus, string> = {
  "To Do": DASHBOARD_COLORS.slate,
  "In Progress": DASHBOARD_COLORS.blue,
  "On Hold": DASHBOARD_COLORS.amber,
  "Completed": DASHBOARD_COLORS.green,
};
const PRIORITY_COLOR: Record<Priority, string> = {
  Low: DASHBOARD_COLORS.blue,
  Medium: DASHBOARD_COLORS.amber,
  High: DASHBOARD_COLORS.red,
  Critical: DASHBOARD_COLORS.red,
};

// A varied but stable icon+colour per task (derived from its id), matching the
// colourful category tiles in the reference. Purely decorative.
const ICON_SET = [
  { Icon: ScienceOutlinedIcon, color: DASHBOARD_COLORS.violet },
  { Icon: Inventory2OutlinedIcon, color: DASHBOARD_COLORS.blue },
  { Icon: MailOutlineIcon, color: DASHBOARD_COLORS.green },
  { Icon: SettingsOutlinedIcon, color: DASHBOARD_COLORS.amber },
  { Icon: LinkOutlinedIcon, color: DASHBOARD_COLORS.red },
];
function iconFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ICON_SET[h % ICON_SET.length];
}

function PillChip({ label, color }: { label: string; color: string }) {
  return (
    <Chip label={label} size="small" sx={{
      height: 24, borderRadius: "7px", fontSize: 12, fontWeight: 600,
      color, bgcolor: alpha(color, 0.13),
      "& .MuiChip-label": { px: 1.25 },
    }} />
  );
}

/** Label sitting above a field (with a red asterisk when required), matching
 * the reference form rather than MUI's floating labels. */
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", mb: 0.75 }}>
      {children}{required && <Box component="span" sx={{ color: "error.main", ml: 0.25 }}>*</Box>}
    </Typography>
  );
}

/* ------------------------------------------------------------------ drawer */

/** Draft allows empty priority/status so their fields show a placeholder and
 * must be chosen (matching the reference), before we cast to MiscTaskInput. */
interface DraftForm {
  title: string;
  description: string;
  assignees: string[];
  priority: Priority | "";
  startDate: string | null;
  endDate: string | null;
  checklist: ChecklistItem[];
}
const EMPTY_DRAFT: DraftForm = {
  title: "", description: "", assignees: [],
  priority: "", startDate: null, endDate: null, checklist: [],
};

function TaskDrawer({ open, initial, projects, busy, onClose, onSave }: {
  open: boolean;
  /** The task being edited, or null to add a new one. */
  initial: MiscTask | null;
  projects: { id: string; name: string }[];
  busy: boolean;
  onClose: () => void;
  onSave: (payload: MiscTaskInput) => void;
}) {
  const [form, setForm] = useState<DraftForm>(EMPTY_DRAFT);
  // Related-to as a single string: "" = not chosen, OTHER = explicit "Other",
  // else a project id. Kept separate so "not chosen" and "Other" don't both
  // collapse to projectId === null.
  const [related, setRelated] = useState<string>("");

  // Reset the form whenever the drawer opens (for add or for a specific edit).
  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        title: initial.title, description: initial.description,
        assignees: initial.assignees ?? [],
        priority: initial.priority,
        startDate: initial.startDate, endDate: initial.endDate,
        checklist: initial.checklist ?? [],
      });
      // An existing task always had a choice: a project id, or Other (null).
      setRelated(initial.projectId ?? OTHER);
    } else {
      setForm(EMPTY_DRAFT);
      setRelated("");
    }
  }, [open, initial]);

  const set = <K extends keyof DraftForm>(key: K, value: DraftForm[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  // End date can't precede start date (both optional). Status isn't set here —
  // a new task is always "To Do" and moved later via the card's status control.
  const datesValid = !(form.startDate && form.endDate) || form.endDate >= form.startDate;
  const canSave = form.title.trim().length > 0 && related !== "" && form.priority !== "" && datesValid;

  const addPoint = () =>
    set("checklist", [...form.checklist, { id: genId("mt"), text: "", done: false, createdAt: new Date().toISOString() }]);
  const togglePoint = (id: string) =>
    set("checklist", form.checklist.map(c => c.id === id ? { ...c, done: !c.done, updatedAt: new Date().toISOString() } : c));
  const removePoint = (id: string) => set("checklist", form.checklist.filter(c => c.id !== id));
  const editPoint = (id: string, text: string) =>
    set("checklist", form.checklist.map(c => c.id === id ? { ...c, text } : c));

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 440 }, maxWidth: "100%" } } }}>
      <Stack sx={{ height: "100%" }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{initial ? "Edit Task" : "Add New Task"}</Typography>
          <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
        </Stack>

        {/* Body */}
        <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2.5 }}>
          <Stack gap={2.5}>
            <Box>
              <FieldLabel required>Title</FieldLabel>
              <TextField value={form.title} onChange={e => set("title", e.target.value)}
                placeholder="Enter task title" fullWidth />
            </Box>

            <Box>
              <FieldLabel>Description</FieldLabel>
              <TextField value={form.description} onChange={e => set("description", e.target.value)}
                placeholder="Describe the task, objective, scope, etc…" fullWidth multiline minRows={3} />
            </Box>

            <Box>
              <FieldLabel required>Related to Project</FieldLabel>
              <TextField select value={related} onChange={e => setRelated(e.target.value)} fullWidth
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: (v) => {
                      const val = v as string;
                      if (!val) return <Box component="span" sx={{ color: "text.secondary" }}>Select project</Box>;
                      if (val === OTHER) return "Other (Not related to any project)";
                      return projects.find(p => p.id === val)?.name ?? "Select project";
                    },
                  },
                }}>
                {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                <MenuItem value={OTHER}>Other (Not related to any project)</MenuItem>
              </TextField>
            </Box>

            <Box>
              <FieldLabel required>Assignee</FieldLabel>
              <OrgMultiSelect label="" value={form.assignees} onChange={v => set("assignees", v)} size="medium" placeholder="Select assignee" />
            </Box>

            <Box>
              <FieldLabel required>Priority</FieldLabel>
              <TextField select value={form.priority} onChange={e => set("priority", e.target.value as Priority)} fullWidth
                slotProps={{ select: { displayEmpty: true, renderValue: (v) => (v as string) || <Box component="span" sx={{ color: "text.secondary" }}>Select priority</Box> } }}>
                {PRIORITIES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            </Box>

            <Stack direction="row" gap={2}>
              <Box sx={{ flex: 1 }}>
                <FieldLabel>Start Date</FieldLabel>
                <TextField type="date" value={form.startDate ?? ""} onChange={e => set("startDate", e.target.value || null)} fullWidth
                  slotProps={{ htmlInput: { max: form.endDate ?? undefined } }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <FieldLabel>End Date</FieldLabel>
                <TextField type="date" value={form.endDate ?? ""} onChange={e => set("endDate", e.target.value || null)} fullWidth
                  error={!datesValid}
                  helperText={!datesValid ? "End is before start" : undefined}
                  slotProps={{ htmlInput: { min: form.startDate ?? undefined } }} />
              </Box>
            </Stack>

            {/* Checklist */}
            <Box>
              <FieldLabel>Checklist</FieldLabel>
              <Stack gap={0.75}>
                {form.checklist.map(item => (
                  <Stack key={item.id} direction="row" alignItems="center" gap={0.5}
                    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, pl: 0.5, pr: 0.5 }}>
                    <Checkbox size="small" checked={item.done} onChange={() => togglePoint(item.id)} sx={{ py: 0.25 }} />
                    <TextField value={item.text} onChange={e => editPoint(item.id, e.target.value)} variant="standard" fullWidth
                      placeholder="Checklist item"
                      slotProps={{ input: { disableUnderline: true }, htmlInput: { style: { fontSize: 13, textDecoration: item.done ? "line-through" : "none" } } }} />
                    <IconButton size="small" onClick={() => removePoint(item.id)} sx={{ color: "text.disabled" }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
              <Button size="small" variant="text" startIcon={<AddIcon />} onClick={addPoint} sx={{ mt: 1 }}>
                Add checklist item
              </Button>
            </Box>
          </Stack>
        </Box>

        {/* Footer */}
        <Stack direction="row" justifyContent="flex-end" gap={1.5} sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button variant="contained" disabled={!canSave || busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={() => onSave({
              title: form.title.trim(),
              description: form.description.trim(),
              projectId: related === OTHER ? null : related,
              assignees: form.assignees,
              priority: form.priority as Priority,
              // New task starts To Do; an edit keeps whatever status it has now
              // (status is moved from the card, not this form).
              status: initial ? initial.status : "To Do",
              startDate: form.startDate,
              endDate: form.endDate,
              checklist: form.checklist.filter(c => c.text.trim().length > 0),
            })}>
            {busy ? "Saving…" : "Save Task"}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}

/* -------------------------------------------------------------------- card */

function TaskRow({ task, canManage, canChangeStatus, onEdit, onDelete, onStatusChange }: {
  task: MiscTask;
  canManage: boolean;
  /** Whether this viewer may change the status (lead/admin, or an assignee). */
  canChangeStatus: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: MiscTaskStatus) => void;
}) {
  const { employeeById } = useOrgContext();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [statusAnchor, setStatusAnchor] = useState<HTMLElement | null>(null);
  const statusColor = STATUS_COLOR[task.status];
  const priorityColor = PRIORITY_COLOR[task.priority];
  const { Icon, color: iconColor } = iconFor(task.id);

  const assignees = task.assignees?.length ? task.assignees : (task.assignedTo ? [task.assignedTo] : []);
  const primary = assignees[0];
  const primaryName = primary ? (employeeById[primary]?.name ?? "—") : "Unassigned";
  const extra = assignees.length - 1;
  // The person who created/assigned the task.
  const assignerName = task.createdBy ? (employeeById[task.createdBy]?.name ?? null) : null;
  // Date range (start – end), tolerating either bound being missing.
  const dateRange = task.startDate || task.endDate
    ? `${task.startDate ? fmt(task.startDate) : "…"} – ${task.endDate ? fmt(task.endDate) : "…"}`
    : (task.dueDate ? fmt(task.dueDate) : null);

  return (
    <Box onClick={canManage ? onEdit : undefined} sx={{
      bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2.5, p: 2.25,
      cursor: canManage ? "pointer" : "default", transition: "border-color .15s ease, box-shadow .15s ease",
      ...(canManage ? { "&:hover": { borderColor: "primary.main", boxShadow: 1 } } : {}),
    }}>
      <Stack direction="row" gap={2} alignItems="flex-start">
        <Box sx={{
          width: 52, height: 52, borderRadius: 2.5, flexShrink: 0, display: "grid", placeItems: "center",
          bgcolor: alpha(iconColor, 0.14), color: iconColor,
        }}>
          <Icon />
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{task.title}</Typography>
            <Stack direction="row" gap={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
              <PillChip label={task.priority} color={priorityColor} />
              {/* Status is a menu trigger for a lead/admin or the assignee; a
                  plain chip for everyone else. */}
              {canChangeStatus ? (
                <Chip label={task.status} size="small"
                  onClick={(e) => { e.stopPropagation(); setStatusAnchor(e.currentTarget); }}
                  onDelete={(e) => { e.stopPropagation(); setStatusAnchor(e.currentTarget as HTMLElement); }}
                  deleteIcon={<KeyboardArrowDownIcon />}
                  sx={{
                    height: 24, borderRadius: "7px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    color: statusColor, bgcolor: alpha(statusColor, 0.13),
                    "& .MuiChip-label": { px: 1.25 },
                    "& .MuiChip-deleteIcon": { color: statusColor, fontSize: 16, ml: "-2px" },
                  }} />
              ) : (
                <PillChip label={task.status} color={statusColor} />
              )}
              {canManage && (
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}>
                  <MoreHorizIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          </Stack>

          {task.description && (
            <Typography variant="body2" color="text.secondary" sx={{
              mt: 0.5,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
            }}>
              {task.description}
            </Typography>
          )}

          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mt: 1.5 }}>
            {/* Assignee: initials avatar (e.g. "SD") + name, like the reference. */}
            <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
              <EmployeeAvatar employeeId={primary ?? null} size={26} />
              <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                {primaryName}{extra > 0 ? ` +${extra}` : ""}
              </Typography>
            </Stack>
            {dateRange && (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "text.secondary", flexShrink: 0 }}>
                <CalendarMonthIcon sx={{ fontSize: 15 }} />
                <Typography variant="caption" sx={{ fontSize: 12.5 }}>{dateRange}</Typography>
              </Stack>
            )}
          </Stack>

          {assignerName && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
              Assigned by {assignerName}
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Status menu — lead/admin or the assignee can move the task. */}
      <Menu anchorEl={statusAnchor} open={!!statusAnchor} onClose={() => setStatusAnchor(null)} onClick={(e) => e.stopPropagation()}>
        {STATUSES.map(s => (
          <MenuItem key={s} selected={s === task.status}
            onClick={() => { setStatusAnchor(null); if (s !== task.status) onStatusChange(s); }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: STATUS_COLOR[s], mr: 1 }} />
            {s}
          </MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} onClick={(e) => e.stopPropagation()}>
        <MenuItem onClick={() => { setAnchor(null); onEdit(); }}>
          <EditIcon fontSize="small" style={{ marginRight: 8 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => { setAnchor(null); onDelete(); }} sx={{ color: "error.main" }}>
          <DeleteOutlineIcon fontSize="small" style={{ marginRight: 8 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}

/* -------------------------------------------------------------------- page */

export function MiscTasksPage() {
  const { employeeById } = useOrgContext();
  const { user } = useAuth();

  // Admins and leads may create/edit/delete tasks (matches the backend's
  // assertCanManage). Assignees can't manage, but can still change status.
  const canManage = user?.appRole === "Admin" || user?.appRole === "Lead";
  const { data: tasksData } = useGetMiscTasksQuery();
  const { data: projectsData } = useGetProjectsQuery();
  const [createTask, { isLoading: creating }] = useCreateMiscTaskMutation();
  const [updateTask, { isLoading: updating }] = useUpdateMiscTaskMutation();
  const [updateStatus] = useUpdateMiscTaskStatusMutation();
  const [deleteTask] = useDeleteMiscTaskMutation();

  const tasks: MiscTask[] = useMemo(() => tasksData ?? [], [tasksData]);
  const projects = useMemo(() => (projectsData ?? []).map(p => ({ id: p.id, name: p.name })), [projectsData]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MiscTaskStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "All">("All");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("All");
  const [dueFrom, setDueFrom] = useState<string>("");
  const [dueTo, setDueTo] = useState<string>("");
  const [statusAnchor, setStatusAnchor] = useState<HTMLElement | null>(null);
  const [priorityAnchor, setPriorityAnchor] = useState<HTMLElement | null>(null);
  const [assigneeAnchor, setAssigneeAnchor] = useState<HTMLElement | null>(null);
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<MiscTask | null>(null);

  const dateActive = !!(dueFrom || dueTo);
  const anyFilter = statusFilter !== "All" || priorityFilter !== "All" || assigneeFilter !== "All" || dateActive || search.trim() !== "";
  const clearAll = () => {
    setStatusFilter("All"); setPriorityFilter("All"); setAssigneeFilter("All");
    setDueFrom(""); setDueTo(""); setSearch("");
  };

  // Assignee filter options: only people who actually have a task, resolved to
  // names, so the menu stays short and relevant.
  const assigneeOptions = useMemo(() => {
    const ids = new Set<string>();
    tasks.forEach(t => (t.assignees ?? []).forEach(id => ids.add(id)));
    return Array.from(ids)
      .map(id => ({ id, name: employeeById[id]?.name ?? "—" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, employeeById]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter(t => {
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (assigneeFilter !== "All" && !(t.assignees ?? []).includes(assigneeFilter)) return false;
      // End-date range (ISO strings compare lexicographically). Tasks with no
      // end date drop out when a date bound is set.
      if (dueFrom && (!t.endDate || t.endDate < dueFrom)) return false;
      if (dueTo && (!t.endDate || t.endDate > dueTo)) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
    });
  }, [tasks, search, statusFilter, priorityFilter, assigneeFilter, dueFrom, dueTo]);

  const openAdd = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (task: MiscTask) => { setEditing(task); setDrawerOpen(true); };

  // Deep link from the notification bell: /tasks?task=<id> opens that task once
  // the list has loaded. Consumed once (the ref guard) and the URL is cleared
  // so a later manual close doesn't reopen it.
  const deepLinkedRef = React.useRef(false);
  React.useEffect(() => {
    if (deepLinkedRef.current || !tasks.length) return;
    const id = new URLSearchParams(window.location.search).get("task");
    if (!id) return;
    const match = tasks.find(t => t.id === id);
    if (match) {
      deepLinkedRef.current = true;
      openEdit(match);
      window.history.replaceState(null, "", "/tasks");
    }
  }, [tasks]);

  const save = async (payload: MiscTaskInput) => {
    try {
      if (editing) await updateTask({ id: editing.id, patch: payload }).unwrap();
      else await createTask(payload).unwrap();
      setDrawerOpen(false);
    } catch (e) { console.error(e); }
  };

  const remove = async (id: string) => {
    try { await deleteTask(id).unwrap(); } catch (e) { console.error(e); }
  };

  const changeStatus = async (id: string, status: MiscTaskStatus) => {
    try { await updateStatus({ id, status }).unwrap(); } catch (e) { console.error(e); }
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1.5} sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Miscellaneous Tasks</Typography>
          <Typography variant="body2" color="text.secondary">Use Misc. Tasks only for small, standalone development activities with single-team ownership and an expected completion time of 2–3 working days.</Typography>
        </Box>
        {canManage && <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Task</Button>}
      </Stack>

      {/* Search + Filters */}
      <Stack direction="row" gap={1.5} sx={{ mb: 2.5 }} flexWrap="wrap">
        <TextField placeholder="Search tasks by title or description…" value={search} onChange={e => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 240, bgcolor: "background.paper", "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "text.disabled" }} /></InputAdornment> } }} />
        {/* Status filter */}
        <Button variant="outlined" color="inherit" onClick={(e) => setStatusAnchor(e.currentTarget)}
          startIcon={<FilterListIcon />} endIcon={<KeyboardArrowDownIcon />}
          sx={{ borderRadius: 2, borderColor: "divider", color: "text.primary", px: 2, textTransform: "none", fontWeight: 600 }}>
          {statusFilter === "All" ? "Status" : statusFilter}
        </Button>
        <Menu anchorEl={statusAnchor} open={!!statusAnchor} onClose={() => setStatusAnchor(null)}>
          <MenuItem selected={statusFilter === "All"} onClick={() => { setStatusFilter("All"); setStatusAnchor(null); }}>All statuses</MenuItem>
          {STATUSES.map(s => (
            <MenuItem key={s} selected={statusFilter === s} onClick={() => { setStatusFilter(s); setStatusAnchor(null); }}>{s}</MenuItem>
          ))}
        </Menu>

        {/* Priority filter */}
        <Button variant="outlined" color="inherit" onClick={(e) => setPriorityAnchor(e.currentTarget)}
          endIcon={<KeyboardArrowDownIcon />}
          sx={{ borderRadius: 2, borderColor: "divider", color: "text.primary", px: 2, textTransform: "none", fontWeight: 600 }}>
          {priorityFilter === "All" ? "Priority" : priorityFilter}
        </Button>
        <Menu anchorEl={priorityAnchor} open={!!priorityAnchor} onClose={() => setPriorityAnchor(null)}>
          <MenuItem selected={priorityFilter === "All"} onClick={() => { setPriorityFilter("All"); setPriorityAnchor(null); }}>All priorities</MenuItem>
          {PRIORITIES.map(p => (
            <MenuItem key={p} selected={priorityFilter === p} onClick={() => { setPriorityFilter(p); setPriorityAnchor(null); }}>{p}</MenuItem>
          ))}
        </Menu>

        {/* Assignee (user) filter */}
        <Button variant="outlined" color="inherit" onClick={(e) => setAssigneeAnchor(e.currentTarget)}
          endIcon={<KeyboardArrowDownIcon />}
          sx={{ borderRadius: 2, borderColor: "divider", color: "text.primary", px: 2, textTransform: "none", fontWeight: 600, maxWidth: 220 }}>
          <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {assigneeFilter === "All" ? "Assignee" : (employeeById[assigneeFilter]?.name ?? "Assignee")}
          </Box>
        </Button>
        <Menu anchorEl={assigneeAnchor} open={!!assigneeAnchor} onClose={() => setAssigneeAnchor(null)}
          slotProps={{ paper: { sx: { maxHeight: 360 } } }}>
          <MenuItem selected={assigneeFilter === "All"} onClick={() => { setAssigneeFilter("All"); setAssigneeAnchor(null); }}>All assignees</MenuItem>
          {assigneeOptions.map(a => (
            <MenuItem key={a.id} selected={assigneeFilter === a.id} onClick={() => { setAssigneeFilter(a.id); setAssigneeAnchor(null); }}>{a.name}</MenuItem>
          ))}
          {assigneeOptions.length === 0 && <MenuItem disabled>No assignees yet</MenuItem>}
        </Menu>

        {/* Due-date range filter */}
        <Button variant="outlined" color="inherit" onClick={(e) => setDateAnchor(e.currentTarget)}
          startIcon={<CalendarMonthIcon />} endIcon={<KeyboardArrowDownIcon />}
          sx={{ borderRadius: 2, borderColor: dateActive ? "primary.main" : "divider", color: "text.primary", px: 2, textTransform: "none", fontWeight: 600 }}>
          {dateActive ? `${dueFrom ? fmt(dueFrom) : "…"} – ${dueTo ? fmt(dueTo) : "…"}` : "End date"}
        </Button>
        <Popover anchorEl={dateAnchor} open={!!dateAnchor} onClose={() => setDateAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
          <Stack gap={1.5} sx={{ p: 2, width: 240 }}>
            <TextField type="date" label="End from" value={dueFrom} onChange={e => setDueFrom(e.target.value)}
              fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="date" label="End to" value={dueTo} onChange={e => setDueTo(e.target.value)}
              fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
            <Button size="small" variant="text" disabled={!dateActive} onClick={() => { setDueFrom(""); setDueTo(""); }}>
              Clear dates
            </Button>
          </Stack>
        </Popover>

        {/* Clear all filters — only when something is active */}
        {anyFilter && (
          <Tooltip title="Clear all filters">
            <Button variant="text" color="inherit" onClick={clearAll} startIcon={<FilterAltOffIcon />}
              sx={{ textTransform: "none", fontWeight: 600, color: "text.secondary" }}>
              Clear
            </Button>
          </Tooltip>
        )}
      </Stack>

      {/* List */}
      <Stack gap={1.5}>
        {filtered.map(t => {
          const isAssignee = !!user && (t.assignees ?? []).includes(user.id);
          return (
            <TaskRow key={t.id} task={t} canManage={canManage}
              canChangeStatus={canManage || isAssignee}
              onEdit={() => openEdit(t)} onDelete={() => remove(t.id)}
              onStatusChange={(s) => changeStatus(t.id, s)} />
          );
        })}
        {filtered.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
            <TaskAltIcon sx={{ fontSize: 40, opacity: 0.4 }} />
            <Typography sx={{ mt: 1 }}>{tasks.length === 0 ? "No tasks yet — add your first one." : "No tasks match your search."}</Typography>
          </Box>
        )}
      </Stack>

      {filtered.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5 }}>
          Showing 1 to {filtered.length} of {tasks.length} tasks
        </Typography>
      )}

      <TaskDrawer open={drawerOpen} initial={editing} projects={projects}
        busy={creating || updating} onClose={() => setDrawerOpen(false)} onSave={save} />
    </Box>
  );
}
