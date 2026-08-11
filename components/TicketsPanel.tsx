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
import { OrgSelect, StatusChip, EmployeeAvatar } from "./common";
import { TEMPLATE, roleCan, genId } from "@/lib/data";
import { fmt } from "@/lib/dateUtils";
import { fetchTickets, createTicketApi, updateTicketApi } from "@/lib/api";
import { useStatusHex } from "@/lib/theme";
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

type BucketKey = "Raised" | "Completed";

// Two ticket buckets — "Raised" folds Open and In Progress together
// (neither is done yet), "Completed" folds Resolved and Closed (neither
// needs further action). No separate "In Progress" accordion.
const BUCKETS: { key: BucketKey; label: string; icon: ElementType; color: string; match: (t: Ticket) => boolean }[] = [
  { key: "Raised", label: "Raised Tickets", icon: FlagCircleIcon, color: "error.main", match: (t) => t.status === "Open" || t.status === "In Progress" },
  { key: "Completed", label: "Completed", icon: CheckCircleIcon, color: "success.main", match: (t) => t.status === "Resolved" || t.status === "Closed" },
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
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
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
          <OrgSelect label="Assign to" value={assignedTo} onChange={setAssignedTo} />
          <TextField select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} fullWidth>
            <MenuItem value="Low">Low</MenuItem><MenuItem value="Medium">Medium</MenuItem><MenuItem value="High">High</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canSubmit || busy} startIcon={busy ? <CircularProgress size={16} /> : <AddIcon />}
          onClick={() => onSubmit({ title: title.trim(), description: description.trim(), projectId, phase: phase || null, assignedTo, priority })}>
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

  return (
    <Accordion
      expanded={expanded} onChange={() => setExpanded(v => !v)} disableGutters
      sx={{
        bgcolor: "background.default", border: "1px solid", borderColor: "divider",
        borderRadius: "10px !important", overflow: "hidden", "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon fontSize="small" />}
        sx={{ px: 1.75, minHeight: 58, "& .MuiAccordionSummary-content": { display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, my: 1, flexWrap: "wrap" } }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">#{ticket.seq}</Typography>
            <Typography variant="body2">{ticket.title}</Typography>
            {ticket.priority === "High" && <Chip label="High" size="small" color="error" variant="outlined" sx={{ height: 18 }} />}
            <EmployeeAvatar employeeId={ticket.assignedTo} size={20} />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.4 }}>
            {ticket.projectName}{ticket.phase ? ` · ${ticket.phase}` : ""} · Raised {fmt(ticket.createdAt)}
            {ticket.resolvedAt ? ` · ${ticket.status === "Closed" ? "Closed" : "Resolved"} ${fmt(ticket.resolvedAt)}` : ""}
          </Typography>
        </Box>
        <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
          {canUpdate ? (
            <Select size="small" value={ticket.status} onChange={(e: SelectChangeEvent) => onUpdate(ticket.id, { status: e.target.value as TicketStatus })}
              MenuProps={{ onClick: (e) => e.stopPropagation() }} sx={{ minWidth: 140 }}>
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
          sx={{ mb: 2, bgcolor: "background.paper", "& .MuiInputBase-input": { fontSize: 13 } }}
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

        <Paper variant="outlined" sx={{ bgcolor: "background.paper", borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
          <Stack direction="row" alignItems="center" gap={1.25} sx={{ px: 2, py: 1.5 }}>
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
                    sx={{ bgcolor: "background.default", "& .MuiInputBase-input": { fontSize: 14, py: 0.6 } }}
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
                sx={{ bgcolor: "background.default", "& .MuiInputBase-input": { fontSize: 14 } }}
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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Record<BucketKey, boolean>>({ Raised: true, Completed: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await fetchTickets();
      // Tickets stored before these two columns existed come back without
      // them; normalize once here so no render path has to guard.
      setTickets(fetched.map(t => ({ ...t, actionPoints: t.actionPoints ?? [], resolvedAt: t.resolvedAt ?? null })));
    } catch { setTickets([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const addTicket = async (payload: CreateTicketInput) => {
    if (!roleCan(role, "raiseTicket")) return;
    setBusy(true);
    try {
      const ticket = await createTicketApi(payload);
      setTickets(prev => [ticket, ...prev]);
      setShowForm(false);
      onChanged?.();
    } catch (e) {
      console.error(e);
    }
    setBusy(false);
  };

  const updateTicket = async (id: string, updates: Partial<Ticket>) => {
    if (!roleCan(role, "updateTicketStatus")) return;
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    try {
      // Reconcile with what the server actually saved — resolvedAt is stamped
      // there, so an optimistic-only update would leave the closing date blank
      // until the next reload.
      const saved = await updateTicketApi(id, updates);
      setTickets(prev => prev.map(t => t.id === id
        ? { ...t, ...saved, actionPoints: saved.actionPoints ?? [], resolvedAt: saved.resolvedAt ?? null }
        : t));
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

  const openCount = tickets.filter(t => t.status !== "Closed" && t.status !== "Resolved").length;

  return (
    <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 3, p: 2.25, mb: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} sx={{ mb: 1.75 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Reported issues</Typography>
          <Typography variant="caption" color="text.secondary">{openCount} open{tickets.length ? ` of ${tickets.length}` : ""}</Typography>
        </Box>
        {roleCan(role, "raiseTicket") && <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setShowForm(true)} disabled={!projects.length}>Raise ticket</Button>}
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={18} /></Box>
      ) : tickets.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
          {projects.length === 0 ? "Add a project first, then issues can be raised against it." : "No issues reported yet."}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {BUCKETS.map(({ key, label, icon: Icon, color }) => (
            <Accordion key={key} expanded={!!expanded[key]} onChange={() => setExpanded(e => ({ ...e, [key]: !e[key] }))}
              disableGutters sx={{ bgcolor: "background.default", border: "1px solid", borderColor: "divider", "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Icon sx={{ fontSize: 18, color }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
                  <Chip label={grouped[key].length} size="small" />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                {grouped[key].length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 1 }}>No tickets here.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {grouped[key].map(t => <TicketRow key={t.id} ticket={t} canUpdate={roleCan(role, "updateTicketStatus")} onUpdate={updateTicket} />)}
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}

      {showForm && roleCan(role, "raiseTicket") && (
        <TicketForm projects={projects} busy={busy} onClose={() => setShowForm(false)} onSubmit={addTicket} />
      )}
    </Box>
  );
}
