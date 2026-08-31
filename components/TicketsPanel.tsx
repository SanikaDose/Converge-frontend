"use client";

import React, { useCallback, useEffect, useMemo, useState, type ElementType } from "react";
import Box from "@mui/material/Box";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Checkbox from "@mui/material/Checkbox";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import FlagCircleIcon from "@mui/icons-material/FlagCircle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import ChecklistIcon from "@mui/icons-material/Checklist";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import { OrgSelect, OrgMultiSelect, StatusChip, EmployeeAvatar, EmployeeAvatarStack } from "./common";
import { TEMPLATE, roleCan, genId, VIEW_ONLY_HINT } from "@/lib/data";
import { fmt } from "@/lib/dateUtils";
import { useGetTicketsQuery, useCreateTicketMutation, useUpdateTicketMutation } from "@/store/api/ticketsApi";
import { useStatusHex, DASHBOARD_COLORS } from "@/lib/theme";
import type { CreateTicketInput } from "@/lib/types";
import type { Actor, ChecklistItem, Priority, StatusColorKey, Ticket, TicketStatus } from "@/lib/types";

/** "10 Aug 2026, 14:32" — action-point stamps need the time, matching TaskCard's fmtStamp. */
function fmtStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const TICKET_STATUS: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed"];
const TICKET_STATUS_COLOR: Record<TicketStatus, StatusColorKey> = { Open: "red", "In Progress": "amber", Resolved: "green", Closed: "slate" };

// Urgency, as a color — drives each row's left accent bar so a list of
// tickets can be triaged by edge color before reading a single word.
const PRIORITY_COLOR: Record<Priority, StatusColorKey> = { Critical: "red", High: "orange", Medium: "amber", Low: "slate" };

/** Translucent wash of `hex` — the shading used for every tinted band and pill here. */
const tint = (hex: string, pct: number) => `color-mix(in srgb, ${hex} ${pct}%, transparent)`;

type BucketKey = "Raised" | "Completed";

// Two ticket buckets — "Raised" folds Open and In Progress together
// (neither is done yet), "Completed" folds Resolved and Closed (neither
// needs further action). No separate "In Progress" accordion.
const BUCKETS: { key: BucketKey; label: string; hint: string; icon: ElementType; tone: StatusColorKey; match: (t: Ticket) => boolean }[] = [
  { key: "Raised", label: "Raised Tickets", hint: "Still need action", icon: FlagCircleIcon, tone: "red", match: (t) => t.status === "Open" || t.status === "In Progress" },
  { key: "Completed", label: "Completed", hint: "Resolved & closed", icon: CheckCircleIcon, tone: "green", match: (t) => t.status === "Resolved" || t.status === "Closed" },
];

export interface ProjectOption { id: string; name: string }

export function TicketForm({ projects, onClose, onSubmit, busy }: {
  projects: ProjectOption[];
  onClose: () => void;
  onSubmit: (payload: CreateTicketInput) => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [phase, setPhase] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>("Medium");
  const canSubmit = title.trim() && projectId;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Raise a ticket</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField label="Problem / title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth
          placeholder="e.g. Camera trigger drift on Station 2" />
        <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth
          multiline minRows={3} placeholder="Details, steps to reproduce, impact…" />
        <TextField select label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)} fullWidth>
          {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
        </TextField>
        <TextField select label="Phase (optional)" value={phase} onChange={(e) => setPhase(e.target.value)} fullWidth>
          <MenuItem value="">No specific phase — applies to whole project</MenuItem>
          {TEMPLATE.map(p => <MenuItem key={p.phase} value={p.phase}>{p.phase}</MenuItem>)}
        </TextField>
        <Stack direction="row" spacing={2}>
          <OrgMultiSelect label="Assign to" value={assignees} onChange={setAssignees} />
          <TextField select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} fullWidth>
            <MenuItem value="Low">Low</MenuItem><MenuItem value="Medium">Medium</MenuItem><MenuItem value="High">High</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canSubmit || busy} startIcon={busy ? <CircularProgress size={16} /> : <AddIcon />}
          onClick={() => onSubmit({ title: title.trim(), description: description.trim(), projectId, phase: phase || null, assignees, priority })}>
          {busy ? "Raising…" : "Raise ticket"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * One ticket, as a Material UI Accordion — collapsed shows just enough to
 * scan the list (seq, title, priority, assignee, status); expanding it
 * reveals a description textarea and an "Action taken" checklist, styled
 * and behaved exactly like TaskCard's description field + "Critical
 * points" section so both features read as one consistent pattern.
 */
function TicketRow({ ticket, canUpdate, onUpdate }: {
  ticket: Ticket;
  canUpdate: boolean;
  onUpdate: (id: string, updates: Partial<Ticket>) => void;
}) {
  const STATUS_HEX = useStatusHex();
  const color = TICKET_STATUS_COLOR[ticket.status];
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState(ticket.description || "");
  const [newPoint, setNewPoint] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => { setDescription(ticket.description || ""); }, [ticket.description]);

  const actionPoints = ticket.actionPoints ?? [];
  const doneCount = actionPoints.filter(c => c.done).length;

  const addPoint = () => {
    const text = newPoint.trim();
    if (!text || !canUpdate) return;
    const now = new Date().toISOString();
    onUpdate(ticket.id, { actionPoints: [...actionPoints, { id: genId("act"), text, done: false, createdAt: now, updatedAt: now }] });
    setNewPoint("");
  };
  const togglePoint = (id: string) =>
    onUpdate(ticket.id, { actionPoints: actionPoints.map(c => c.id === id ? { ...c, done: !c.done, updatedAt: new Date().toISOString() } : c) });
  const savePointText = (id: string) => {
    const text = editText.trim();
    if (!text) return;
    onUpdate(ticket.id, { actionPoints: actionPoints.map(c => c.id === id ? { ...c, text, updatedAt: new Date().toISOString() } : c) });
    setEditingId(null);
    setEditText("");
  };
  // Same rule as a task's critical points — a ticked point is the record
  // that the work happened, so it stays put. Untick first to delete.
  const removePoint = (id: string) => {
    const item = actionPoints.find(c => c.id === id);
    if (!item || item.done) return;
    onUpdate(ticket.id, { actionPoints: actionPoints.filter(c => c.id !== id) });
  };

  // Two maps on purpose: STATUS_HEX is tuned to read as *text* on a tint of
  // itself, DASHBOARD_COLORS to read as a solid fill. The edge bar and status
  // dot are fills — STATUS_HEX_LIGHT's amber (#9a5b00) goes brown as a bar.
  const statusHex = STATUS_HEX[color];
  const statusFill = DASHBOARD_COLORS[color];
  const priorityHex = STATUS_HEX[PRIORITY_COLOR[ticket.priority]];
  const priorityFill = DASHBOARD_COLORS[PRIORITY_COLOR[ticket.priority]];
  const urgent = ticket.priority === "High" || ticket.priority === "Critical";
  const settled = ticket.status === "Resolved" || ticket.status === "Closed";

  return (
    <Accordion
      expanded={expanded} onChange={() => setExpanded(v => !v)} disableGutters
      sx={{
        bgcolor: "background.paper", border: "1px solid", borderColor: "divider",
        // Priority reads as a left edge bar; the faint wash off it keeps the
        // cue legible without shouting on a list of a dozen rows.
        borderLeft: `3px solid ${priorityFill}`,
        borderRadius: "10px !important", overflow: "hidden",
        "&:before": { display: "none" },
        transition: "border-color .16s ease, box-shadow .16s ease",
        // Settled tickets recede — the eye should land on what's still open.
        opacity: settled && !expanded ? 0.82 : 1,
        "&:hover": { borderColor: tint(priorityFill, 55), borderLeftColor: priorityFill, boxShadow: `0 2px 10px ${tint(priorityFill, 18)}` },
        "&.Mui-expanded": { borderColor: tint(priorityFill, 45), boxShadow: `0 3px 14px ${tint(priorityFill, 15)}` },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon fontSize="small" />}
        sx={{
          px: 1.75, minHeight: 58,
          background: `linear-gradient(90deg, ${tint(priorityFill, 7)}, transparent 45%)`,
          "& .MuiAccordionSummary-content": { display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, my: 1, flexWrap: "wrap" },
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {/* Status as a dot: color without spending a chip's worth of width. */}
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: statusFill, boxShadow: `0 0 0 3px ${tint(statusFill, 20)}`, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>#{ticket.seq}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, textDecoration: settled ? "line-through" : "none", textDecorationColor: tint(statusHex, 60) }}>
              {ticket.title}
            </Typography>
            {urgent && (
              <Chip label={ticket.priority} size="small"
                sx={{ height: 19, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3, color: priorityHex, bgcolor: tint(priorityHex, 15), border: "1px solid", borderColor: tint(priorityHex, 35) }} />
            )}
            {actionPoints.length > 0 && (
              <Chip label={`${doneCount}/${actionPoints.length}`} size="small"
                icon={<ChecklistIcon sx={{ fontSize: 13, ml: 0.6 }} />}
                sx={{
                  height: 19, fontSize: 10.5, fontWeight: 700,
                  color: doneCount === actionPoints.length ? STATUS_HEX.green : "text.secondary",
                  bgcolor: doneCount === actionPoints.length ? tint(STATUS_HEX.green, 15) : "action.selected",
                  "& .MuiChip-icon": { color: "inherit" },
                }} />
            )}
            {(ticket.assignees?.length ? ticket.assignees : (ticket.assignedTo ? [ticket.assignedTo] : [])).length > 0
              ? <EmployeeAvatarStack employeeIds={ticket.assignees?.length ? ticket.assignees : [ticket.assignedTo as string]} size={20} />
              : <EmployeeAvatar employeeId={null} size={20} />}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.4 }}>
            {ticket.projectName}{ticket.phase ? ` · ${ticket.phase}` : ""} · Raised {fmt(ticket.createdAt)}
            {ticket.resolvedAt ? ` · ${ticket.status === "Closed" ? "Closed" : "Resolved"} ${fmt(ticket.resolvedAt)}` : ""}
          </Typography>
        </Box>
        <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
          {canUpdate ? (
            <Select size="small" value={ticket.status} onChange={(e: SelectChangeEvent) => onUpdate(ticket.id, { status: e.target.value as TicketStatus })}
              MenuProps={{ onClick: (e) => e.stopPropagation() }}
              sx={{
                minWidth: 140, fontWeight: 600, color: statusHex, bgcolor: tint(statusHex, 10),
                "& .MuiOutlinedInput-notchedOutline": { borderColor: tint(statusHex, 35) },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: tint(statusHex, 60) },
                "& .MuiSelect-icon": { color: statusHex },
              }}>
              {TICKET_STATUS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          ) : <StatusChip label={ticket.status} color={color} />}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ px: 1.75, pt: 0, pb: 2 }}>
        <TextField
          value={description} onChange={(e) => setDescription(e.target.value)}
          onBlur={() => canUpdate && description !== (ticket.description || "") && onUpdate(ticket.id, { description })}
          placeholder={canUpdate ? "Add a description for this issue…" : "No description added."}
          disabled={!canUpdate} multiline minRows={1} maxRows={4} fullWidth
          sx={{ mb: 2, bgcolor: "background.default", "& .MuiInputBase-input": { fontSize: 13 } }}
        />

        {/* Same shape as TaskCard's "Plan → / Started / Finished" strip: the
            dates that bracket the work, colored only once there's an outcome. */}
        <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mb: 2, fontSize: 11.5, color: "text.secondary" }}>
          <span>Raised {fmt(ticket.createdAt)}</span>
          {ticket.resolvedAt && (
            <span style={{ color: ticket.status === "Closed" ? STATUS_HEX.slate : STATUS_HEX.green }}>
              {ticket.status === "Closed" ? "Closed" : "Resolved"} {fmt(ticket.resolvedAt)}
            </span>
          )}
        </Stack>

        <Paper variant="outlined" sx={{ bgcolor: "background.default", borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
          <Stack direction="row" alignItems="center" gap={1.25} sx={{ px: 2, py: 1.5, bgcolor: "action.hover" }}>
            <ChecklistIcon sx={{ fontSize: 19, color: "text.secondary" }} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
              Action taken
            </Typography>
            {actionPoints.length > 0 && (
              <Chip
                label={`${doneCount}/${actionPoints.length}`} size="small"
                sx={{
                  height: 21, fontSize: 11, fontWeight: 700,
                  color: doneCount === actionPoints.length ? STATUS_HEX.green : "text.secondary",
                  bgcolor: doneCount === actionPoints.length
                    ? `color-mix(in srgb, ${STATUS_HEX.green} 18%, transparent)`
                    : "action.selected",
                }}
              />
            )}
          </Stack>

          {actionPoints.map(item => {
            const isEditing = editingId === item.id;
            return (
              <Stack key={item.id} direction="row" alignItems="center" gap={1}
                sx={{ px: 2, py: 1, borderTop: "1px solid", borderColor: "divider", bgcolor: isEditing ? "action.hover" : "transparent" }}>
                <Checkbox size="small" checked={item.done} disabled={!canUpdate || isEditing} onChange={() => togglePoint(item.id)} sx={{ p: 0.5, ml: -0.5 }} />

                {isEditing ? (
                  <TextField
                    value={editText} onChange={(e) => setEditText(e.target.value)}
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

                {canUpdate && (
                  <Stack direction="row" gap={0.25} sx={{ flexShrink: 0 }}>
                    {isEditing ? (
                      <>
                        <Tooltip title="Save">
                          <span>
                            <IconButton size="small" disabled={!editText.trim()} onClick={() => savePointText(item.id)} sx={{ color: STATUS_HEX.green }}>
                              <CheckIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Cancel">
                          <IconButton size="small" onClick={() => { setEditingId(null); setEditText(""); }} sx={{ color: "text.secondary" }}>
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <Tooltip title="Edit point">
                          <IconButton size="small" onClick={() => { setEditingId(item.id); setEditText(item.text); }} sx={{ color: "text.secondary" }}>
                            <EditIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={item.done ? "Completed points are kept as a record — untick it first to delete" : "Delete point"}>
                          <span>
                            <IconButton size="small" disabled={item.done} onClick={() => removePoint(item.id)} sx={{ color: "text.secondary" }}>
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

          {canUpdate ? (
            <Box sx={{ px: 1.5, py: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
              <TextField
                value={newPoint} onChange={(e) => setNewPoint(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPoint(); } }}
                placeholder="Add an action taken, then press Enter"
                size="small" fullWidth
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start"><AddCircleOutlineIcon sx={{ fontSize: 20, color: "primary.main" }} /></InputAdornment>,
                    endAdornment: newPoint.trim() ? (
                      <InputAdornment position="end"><Button size="small" onClick={addPoint} sx={{ fontSize: 12, minWidth: 0 }}>Add</Button></InputAdornment>
                    ) : null,
                  },
                }}
                sx={{ bgcolor: "background.paper", "& .MuiInputBase-input": { fontSize: 14 } }}
              />
            </Box>
          ) : actionPoints.length === 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ display: "block", px: 2, pb: 1.75 }}>
              No action taken yet.
            </Typography>
          )}
        </Paper>
      </AccordionDetails>
    </Accordion>
  );
}

/**
 * Tickets are loaded from /api/tickets on mount, then held in React
 * state; create/update calls hit the mock API (so the in-memory store
 * stays consistent for the process lifetime) and the local list updates
 * optimistically from the response. Grouped into two accordions — Raised
 * (Open + In Progress) and Completed (Resolved + Closed) — matching the
 * dashboard's binary project accordion pattern.
 */
export function TicketsPanel({ actor, projects, refreshKey, onChanged }: {
  actor: Actor;
  projects: ProjectOption[];
  refreshKey: number;
  /** Fires after a ticket is successfully created or updated — lets a parent (e.g. the Tickets page's KPI row) refetch its own ticket-derived stats instead of going stale. */
  onChanged?: () => void;
}) {
  const { role } = actor;
  const STATUS_HEX = useStatusHex();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<Record<BucketKey, boolean>>({ Raised: true, Completed: false });

  // Normalisation of legacy rows now lives in the endpoint's
  // transformResponse, so every consumer of this query gets it.
  const { data, isFetching, refetch } = useGetTicketsQuery();
  const tickets: Ticket[] = useMemo(() => data ?? [], [data]);
  const loading = isFetching;
  useEffect(() => { if (refreshKey) refetch(); }, [refreshKey, refetch]);

  const [createTicketMutation, { isLoading: busy }] = useCreateTicketMutation();
  const [updateTicketMutation] = useUpdateTicketMutation();

  const addTicket = async (payload: CreateTicketInput) => {
    if (!roleCan(role, "raiseTicket")) return;
    try {
      await createTicketMutation(payload).unwrap();
      setShowForm(false);
      onChanged?.();
    } catch (e) {
      console.error(e);
    }
  };

  // Optimistic update and server reconcile both live in the mutation's
  // onQueryStarted — see ticketsApi. Every view reading getTickets (this
  // panel, the navbar bell, the Tickets page KPIs) updates from one place.
  const updateTicket = async (id: string, updates: Partial<Ticket>) => {
    if (!roleCan(role, "updateTicketStatus")) return;
    try {
      await updateTicketMutation({ id, patch: updates }).unwrap();
      onChanged?.();
    } catch (e) { console.error(e); }
  };

  const grouped = useMemo(() => {
    const g: Record<BucketKey, Ticket[]> = { Raised: [], Completed: [] };
    tickets.forEach(t => {
      const bucket = BUCKETS.find(b => b.match(t));
      (g[bucket?.key || "Raised"]).push(t);
    });
    return g;
  }, [tickets]);

  // One tally per status, so the header can show the actual mix rather than
  // a single "n open" number that hides where everything is sitting.
  const byStatus = useMemo(() => {
    const counts: Record<TicketStatus, number> = { Open: 0, "In Progress": 0, Resolved: 0, Closed: 0 };
    tickets.forEach(t => { counts[t.status] += 1; });
    return counts;
  }, [tickets]);
  const openCount = byStatus.Open + byStatus["In Progress"];
  const canRaiseTicket = roleCan(role, "raiseTicket");

  return (
    <Box sx={{
      bgcolor: "background.paper", border: "1px solid", borderColor: "divider",
      borderRadius: 3, mb: 2.5, overflow: "hidden",
    }}>
      {/* Titled header band — a tinted strip and an icon tile give the panel a
          top edge to sit under, instead of a heading floating on flat paper. */}
      <Stack
        direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}
        sx={{
          px: 2.25, py: 1.75, borderBottom: "1px solid", borderColor: "divider",
          background: `linear-gradient(135deg, ${tint(STATUS_HEX.red, 9)}, ${tint(STATUS_HEX.violet, 6)} 55%, transparent)`,
        }}
      >
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: 2, flexShrink: 0,
            display: "grid", placeItems: "center",
            color: STATUS_HEX.red, bgcolor: tint(STATUS_HEX.red, 14),
            border: "1px solid", borderColor: tint(STATUS_HEX.red, 28),
          }}>
            <ConfirmationNumberIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>Reported issues</Typography>
            {tickets.length > 0 ? (
              <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap" sx={{ mt: 0.4 }}>
                {([
                  ["Open", byStatus.Open, DASHBOARD_COLORS.red],
                  ["In progress", byStatus["In Progress"], DASHBOARD_COLORS.amber],
                  ["Done", byStatus.Resolved + byStatus.Closed, DASHBOARD_COLORS.green],
                ] as const).map(([label, n, hex]) => (
                  <Stack key={label} direction="row" alignItems="center" gap={0.6}>
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: n ? hex : "text.disabled" }} />
                    <Typography variant="caption" sx={{ color: n ? "text.secondary" : "text.disabled", fontWeight: 600 }}>
                      {n} {label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary">Nothing reported yet</Typography>
            )}
          </Box>
        </Stack>
        {/* Shown disabled rather than removed for a read-only User — see VIEW_ONLY_HINT. */}
        <Tooltip title={canRaiseTicket ? "" : VIEW_ONLY_HINT}>
          <span>
            <Button variant="contained" size="small" startIcon={<AddIcon />}
              onClick={() => setShowForm(true)} disabled={!canRaiseTicket || !projects.length}>
              Raise ticket
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <Box sx={{ p: 2.25 }}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={18} /></Box>
      ) : tickets.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
          {projects.length === 0 ? "Add a project first, then issues can be raised against it." : "No issues reported yet."}
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {BUCKETS.map(({ key, label, hint, icon: Icon, tone }) => {
            const hex = STATUS_HEX[tone];
            const fill = DASHBOARD_COLORS[tone];
            const count = grouped[key].length;
            return (
              <Accordion key={key} expanded={!!expanded[key]} onChange={() => setExpanded(e => ({ ...e, [key]: !e[key] }))}
                disableGutters sx={{
                  bgcolor: "background.default", border: "1px solid", borderColor: "divider",
                  borderLeft: `3px solid ${count ? fill : "transparent"}`,
                  borderRadius: "12px !important", overflow: "hidden", "&:before": { display: "none" },
                }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{
                  px: 2, minHeight: 56,
                  background: `linear-gradient(90deg, ${tint(hex, count ? 11 : 0)}, transparent 55%)`,
                  "& .MuiAccordionSummary-content": { alignItems: "center", my: 1 },
                }}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Icon sx={{ fontSize: 19, color: count ? fill : "text.disabled" }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
                    <Chip label={count} size="small" sx={{
                      height: 20, minWidth: 26, fontSize: 11.5, fontWeight: 700,
                      color: count ? hex : "text.disabled",
                      bgcolor: count ? tint(hex, 16) : "action.selected",
                    }} />
                    <Typography variant="caption" sx={{ color: "text.disabled", display: { xs: "none", sm: "block" } }}>{hint}</Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 1.5, pt: 0.5, pb: 1.75 }}>
                  {count === 0 ? (
                    <Typography variant="body2" color="text.disabled" sx={{ py: 1.5, textAlign: "center" }}>No tickets here.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {grouped[key].map(t => <TicketRow key={t.id} ticket={t} canUpdate={roleCan(role, "updateTicketStatus")} onUpdate={updateTicket} />)}
                    </Stack>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}
      </Box>

      {showForm && roleCan(role, "raiseTicket") && (
        <TicketForm projects={projects} busy={busy} onClose={() => setShowForm(false)} onSubmit={addTicket} />
      )}
    </Box>
  );
}
