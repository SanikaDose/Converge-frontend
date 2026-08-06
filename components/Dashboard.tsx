"use client";

import React, { useCallback, useEffect, useMemo, useState, type ElementType } from "react";
import Box from "@mui/material/Box";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import CircularProgress from "@mui/material/CircularProgress";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import WorkOutlinedIcon from "@mui/icons-material/WorkOutlined";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";

import { ProjectCard } from "./ProjectCard";
import { TicketsPanel } from "./TicketsPanel";
import { StatCard } from "./common";
import { fetchProjectsIndex } from "@/lib/api";
import { withLiveStats } from "@/lib/businessLogic";
import { todayISO } from "@/lib/dateUtils";
import { roleCan } from "@/lib/data";
import type { Actor, ProjectIndexRow, ProjectWithLiveStats } from "@/lib/types";

type BucketKey = "In Progress" | "Completed";

// Two accordions: In Progress (everything not finished yet — delayed or
// not, that distinction still shows via each ProjectCard's own "delayed"
// badge) and Completed (every task done). No separate "Delayed"
// accordion and no separate "On Track" accordion.
const BUCKETS: { key: BucketKey; label: string; icon: ElementType; color: string }[] = [
  { key: "In Progress", label: "In Progress Projects", icon: HourglassBottomIcon, color: "warning.main" },
  { key: "Completed", label: "Completed Projects", icon: CheckCircleIcon, color: "success.main" },
];

export function Dashboard({ actor, onOpen, refreshKey, onNew }: {
  actor: Actor;
  onOpen: (id: string) => void;
  refreshKey: number;
  onNew: () => void;
}) {
  const { role } = actor;
  const [projectsRaw, setProjectsRaw] = useState<ProjectIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [myOnly, setMyOnly] = useState(false);
  const [expanded, setExpanded] = useState<Record<BucketKey, boolean>>({ "In Progress": true, "Completed": true });
  const today = todayISO();

  const load = useCallback(async () => {
    setLoading(true);
    try { setProjectsRaw(await fetchProjectsIndex()); } catch { setProjectsRaw([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  // Recompute bucket/delayed-count against *today's* date on every render
  // instead of trusting the write-time snapshot — see businessLogic's
  // withLiveStats for why (a task can silently cross its deadline without
  // anyone touching the project).
  const projects = useMemo<ProjectWithLiveStats[]>(() => projectsRaw.map(p => withLiveStats(p, today)), [projectsRaw, today]);

  // Roles from an earlier 5-role simulation (Project Manager/Team Lead/
  // Team Member) that no longer exist in the current Admin/Developer set
  // — kept as a forward-compatible check for when roles are reintroduced,
  // so it's compared as a plain string rather than the current AppRole union.
  const showMyToggle = ["Project Manager", "Team Lead", "Team Member"].includes(role as string);
  const scoped = useMemo(() => {
    if (!showMyToggle || !myOnly || !actor.id) return projects;
    return projects.filter(p => p.owner === actor.id);
  }, [projects, showMyToggle, myOnly, actor.id]);

  const filtered = scoped.filter(p =>
    !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.customer.toLowerCase().includes(query.toLowerCase())
  );

  const grouped = useMemo(() => {
    const g: Record<BucketKey, ProjectWithLiveStats[]> = { "In Progress": [], "Completed": [] };
    filtered.forEach(p => {
      const isCompleted = p.total > 0 && p.completed === p.total;
      (isCompleted ? g["Completed"] : g["In Progress"]).push(p);
    });
    return g;
  }, [filtered]);

  const portfolio = useMemo(() => {
    const totalDelayed = projects.reduce((a, p) => a + (p.delayed || 0), 0);
    const avgPct = projects.length ? Math.round(projects.reduce((a, p) => a + (p.pct || 0), 0) / projects.length) : 0;
    const completedCount = projects.filter(p => p.total > 0 && p.completed === p.total).length;
    return { count: projects.length, totalDelayed, avgPct, completedCount };
  }, [projects]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Typography variant="h4">Project Portfolio</Typography>
        {roleCan(role, "createProject") && <Button variant="contained" startIcon={<AddIcon />} onClick={onNew}>New project</Button>}
      </Stack>

      <Grid container spacing={1.5} sx={{ mt: 2, mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={WorkOutlinedIcon} label="Active Projects" value={portfolio.count} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={CheckCircleIcon} label="Completed" value={portfolio.completedCount} color="success.main" />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={DonutLargeIcon} label="Avg. Completion" value={`${portfolio.avgPct}%`} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={WarningAmberIcon} label="Delayed Tasks" value={portfolio.totalDelayed}
            color={portfolio.totalDelayed > 0 ? "error.main" : "success.main"} />
        </Grid>
      </Grid>

      <TicketsPanel actor={actor} projects={projects.map(p => ({ id: p.id, name: p.name }))} refreshKey={refreshKey} />

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ my: 2.5 }}>
        <TextField
          fullWidth size="small" placeholder="Search by project or customer…" value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        {showMyToggle && (
          <FormControlLabel sx={{ whiteSpace: "nowrap" }} control={
            <Checkbox size="small" checked={myOnly} disabled={!actor.id} onChange={(e) => setMyOnly(e.target.checked)} />
          } label="My projects" />
        )}
        <Tooltip title="Refresh"><IconButton onClick={load}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : projects.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 7, border: "1px dashed", borderColor: "divider", borderRadius: 3, color: "text.secondary" }}>
          <WarningAmberIcon sx={{ fontSize: 22 }} />
          <Typography sx={{ mt: 1.5 }}>No projects yet. Add your first project to generate its 12-phase plan.</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {BUCKETS.map(({ key, label, icon: Icon, color }) => (
            <Accordion key={key} expanded={!!expanded[key]} onChange={() => setExpanded(e => ({ ...e, [key]: !e[key] }))}
              disableGutters sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Icon sx={{ fontSize: 19, color }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{label}</Typography>
                  <Chip label={grouped[key].length} size="small" />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                {grouped[key].length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 1.5 }}>
                    {query || myOnly ? "No projects match your filters." : `No ${label.toLowerCase()}.`}
                  </Typography>
                ) : (
                  <Grid container spacing={1.75}>
                    {grouped[key].map(p => (
                      <Grid key={p.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                        <ProjectCard project={p} onOpen={onOpen} />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}
    </Box>
  );
}
