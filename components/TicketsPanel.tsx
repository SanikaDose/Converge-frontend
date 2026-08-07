"use client";

import React, { useCallback, useEffect, useMemo, useState, type ElementType } from "react";
import Box from "@mui/material/Box";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
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
import { OrgSelect, StatusChip, EmployeeAvatar } from "./common";
import { TEMPLATE, roleCan } from "@/lib/data";
import { fetchTickets, createTicketApi, updateTicketApi } from "@/lib/api";
import type { CreateTicketInput } from "@/lib/types";
import type { Actor, Priority, StatusColorKey, Ticket, TicketStatus } from "@/lib/types";

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

function TicketRow({ ticket, canUpdate, onUpdate }: {
  ticket: Ticket;
  canUpdate: boolean;
  onUpdate: (id: string, updates: Partial<Ticket>) => void;
}) {
  const color = TICKET_STATUS_COLOR[ticket.status];
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5, bgcolor: "background.default", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5, flexWrap: "wrap" }}>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="caption" color="text.secondary">#{ticket.seq}</Typography>
          <Typography variant="body2">{ticket.title}</Typography>
          {ticket.priority === "High" && <Chip label="High" size="small" color="error" variant="outlined" sx={{ height: 18 }} />}
          <EmployeeAvatar employeeId={ticket.assignedTo} size={20} />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.4 }}>
          {ticket.projectName}{ticket.phase ? ` · ${ticket.phase}` : ""} · Raised {ticket.createdAt}
        </Typography>
      </Box>
      {canUpdate ? (
        <Select size="small" value={ticket.status} onChange={(e: SelectChangeEvent) => onUpdate(ticket.id, { status: e.target.value as TicketStatus })} sx={{ minWidth: 140 }}>
          {TICKET_STATUS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </Select>
      ) : <StatusChip label={ticket.status} color={color} />}
    </Box>
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
    try { setTickets(await fetchTickets()); } catch { setTickets([]); }
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
    try { await updateTicketApi(id, updates); onChanged?.(); } catch (e) { console.error(e); }
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
