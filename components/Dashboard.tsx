"use client";

import React, { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import Box from "@mui/material/Box";
import { alpha, useTheme } from "@mui/material/styles";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
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
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WorkOutlinedIcon from "@mui/icons-material/WorkOutlined";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import FlagCircleIcon from "@mui/icons-material/FlagCircle";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

import { ProjectCard } from "./ProjectCard";
import { TicketForm } from "./TicketsPanel";
import { StatCard, computeStatTrend } from "./common";
import { DonutChart, TrendLineChart } from "./charts";
import { fetchProjectsIndex, createTicketApi, fetchDashboardBaseline } from "@/lib/api";
import { withLiveStats } from "@/lib/businessLogic";
import { todayISO, addDays, diffDays } from "@/lib/dateUtils";
import { roleCan } from "@/lib/data";
import { DASHBOARD_COLORS } from "@/lib/theme";
import type { CreateTicketInput } from "@/lib/types";
import type { Actor, DashboardBaseline, ProjectIndexRow, ProjectType, ProjectWithLiveStats } from "@/lib/types";

type BucketKey = "In Progress" | "Completed";

// Two accordions: In Progress (everything not finished yet — delayed or
// not, that distinction still shows via each ProjectCard's own "delayed"
// badge) and Completed (every task done). No separate "Delayed"
// accordion and no separate "On Track" accordion.
const BUCKETS: { key: BucketKey; label: string; icon: ElementType; color: string }[] = [
  { key: "In Progress", label: "In Progress Projects", icon: HourglassBottomIcon, color: "warning.main" },
  { key: "Completed", label: "Completed Projects", icon: CheckCircleIcon, color: "success.main" },
];

type HealthKey = "On Track" | "Delayed" | "Completed";

// Matches ProjectCard's own badge exactly (project.delayed > 0 → red "N
// delayed" chip, otherwise green "On track") — this used to be a stricter,
// separate definition (only counting the project's own end date as blown),
// which silently demoted a project with real overdue tasks to a middling
// "At Risk" bucket the donut showed instead of "Delayed". A project's
// target end date having passed still counts too, for the same reason.
function classifyHealth(p: ProjectWithLiveStats, today: string): HealthKey {
  if (p.total > 0 && p.completed === p.total) return "Completed";
  if (p.delayed > 0 || p.endDate < today) return "Delayed";
  return "On Track";
}

type TrendRange = "month" | "quarter" | "year";
const TREND_RANGE_CONFIG: Record<TrendRange, { points: number; stepDays: number; fmt: Intl.DateTimeFormatOptions }> = {
  month: { points: 5, stepDays: 7, fmt: { month: "short", day: "2-digit" } },
  quarter: { points: 6, stepDays: 14, fmt: { month: "short", day: "2-digit" } },
  year: { points: 6, stepDays: 60, fmt: { month: "short", year: "2-digit" } },
};

function formatCheckpoint(iso: string, fmt: Intl.DateTimeFormatOptions): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { ...fmt, timeZone: "UTC" });
}

function dateBadge(iso: string): { month: string; day: string } {
  const d = new Date(iso + "T00:00:00Z");
  return { month: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase(), day: String(d.getUTCDate()).padStart(2, "0") };
}

type DateScope = "all" | "month" | "quarter" | "year";

// Real overlap-based filter (project.startDate..endDate intersects the
// selected calendar period), not a decorative dropdown — "all" skips
// filtering entirely.
function periodBounds(scope: DateScope, todayISOStr: string): [string, string] | null {
  if (scope === "all") return null;
  const [y, m] = todayISOStr.split("-").map(Number);
  const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (scope === "month") {
    const end = lastDayOf(y, m);
    return [`${y}-${String(m).padStart(2, "0")}-01`, `${y}-${String(m).padStart(2, "0")}-${String(end).padStart(2, "0")}`];
  }
  if (scope === "quarter") {
    const qStart = Math.floor((m - 1) / 3) * 3 + 1;
    const qEnd = qStart + 2;
    const end = lastDayOf(y, qEnd);
    return [`${y}-${String(qStart).padStart(2, "0")}-01`, `${y}-${String(qEnd).padStart(2, "0")}-${String(end).padStart(2, "0")}`];
  }
  // Indian financial year: Apr 1 – Mar 31, not the calendar year.
  const fyStartYear = m >= 4 ? y : y - 1;
  return [`${fyStartYear}-04-01`, `${fyStartYear + 1}-03-31`];
}

// "FY26-27" for any date between 2026-04-01 and 2027-03-31 — derived from
// today's date, not hardcoded, so the label rolls forward on its own each
// April instead of needing a yearly code change.
function currentFiscalYearLabel(todayISOStr: string): string {
  const [y, m] = todayISOStr.split("-").map(Number);
  const fyStartYear = m >= 4 ? y : y - 1;
  return `FY${String(fyStartYear).slice(-2)}-${String(fyStartYear + 1).slice(-2)}`;
}

function deadlineChip(plannedFinish: string, today: string): { label: string; hex: string } {
  const diff = diffDays(plannedFinish, today);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, hex: DASHBOARD_COLORS.red };
  if (diff === 0) return { label: "Due today", hex: DASHBOARD_COLORS.orange };
  if (diff <= 7) return { label: `In ${diff} day${diff > 1 ? "s" : ""}`, hex: DASHBOARD_COLORS.orange };
  return { label: `In ${diff} days`, hex: DASHBOARD_COLORS.blue };
}

/** Card shell shared by the three analytics widgets — title + optional header action + content. */
function AnalyticsCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{
      bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 2.25,
      height: "100%", display: "flex", flexDirection: "column",
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.75, flexShrink: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{title}</Typography>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

export function Dashboard({ actor, onOpen, refreshKey, onNew }: {
  actor: Actor;
  onOpen: (id: string) => void;
  refreshKey: number;
  onNew: () => void;
}) {
  const { role } = actor;
  const theme = useTheme();
  const [projectsRaw, setProjectsRaw] = useState<ProjectIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [myOnly, setMyOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"All" | ProjectType>("All");
  const [dateScope, setDateScope] = useState<DateScope>("all");
  const [expanded, setExpanded] = useState<Record<BucketKey, boolean>>({ "In Progress": true, "Completed": true });
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [baseline, setBaseline] = useState<DashboardBaseline | null>(null);
  const [trendRange, setTrendRange] = useState<TrendRange>("month");
  const [deadlineFilter, setDeadlineFilter] = useState<"upcoming" | "overdue">("upcoming");
  const today = todayISO();

  const load = useCallback(async () => {
    setLoading(true);
    try { setProjectsRaw(await fetchProjectsIndex()); } catch { setProjectsRaw([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  // Baseline is a real snapshot captured once per server session (see
  // mockDb.getDashboardBaseline) — fetched once here too, not on every
  // refresh, so the "vs last month" comparison stays stable.
  useEffect(() => { fetchDashboardBaseline().then(setBaseline).catch(() => setBaseline(null)); }, []);

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

  const period = periodBounds(dateScope, today);
  const filtered = scoped.filter(p =>
    (!query || p.name.toLowerCase().includes(query.toLowerCase()) || p.customer.toLowerCase().includes(query.toLowerCase())) &&
    (typeFilter === "All" || p.type === typeFilter) &&
    (!period || (p.startDate <= period[1] && p.endDate >= period[0]))
  ).sort((a, b) => b.startDate.localeCompare(a.startDate));

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

  const trends = useMemo(() => baseline ? {
    active: computeStatTrend(portfolio.count, baseline.activeProjects, "", "up"),
    completed: computeStatTrend(portfolio.completedCount, baseline.completedProjects, "", "up"),
    avg: computeStatTrend(portfolio.avgPct, baseline.avgCompletionPct, "%", "up"),
    delayed: computeStatTrend(portfolio.totalDelayed, baseline.delayedTasks, "", "down"),
  } : null, [baseline, portfolio]);

  const health = useMemo(() => {
    const counts: Record<HealthKey, number> = { "On Track": 0, "Delayed": 0, "Completed": 0 };
    projects.forEach(p => { counts[classifyHealth(p, today)] += 1; });
    return counts;
  }, [projects, today]);

  const healthLegend: { key: HealthKey; color: string }[] = [
    { key: "On Track", color: DASHBOARD_COLORS.green },
    { key: "Delayed", color: DASHBOARD_COLORS.red },
    { key: "Completed", color: DASHBOARD_COLORS.slate },
  ];

  // Real historical trend: for each checkpoint date, what % of every
  // task across the portfolio already has an actualFinish on or before
  // that date. No fabricated numbers — derived entirely from stored task
  // completion dates.
  const trendPoints = useMemo(() => {
    const cfg = TREND_RANGE_CONFIG[trendRange];
    const totalTasks = projects.reduce((a, p) => a + (p.taskLite?.length || 0), 0);
    if (!totalTasks) return [];
    const out: { label: string; value: number }[] = [];
    for (let i = cfg.points - 1; i >= 0; i--) {
      const checkpoint = addDays(today, -cfg.stepDays * i);
      let done = 0;
      projects.forEach(p => (p.taskLite || []).forEach(t => { if (t.actualFinish && t.actualFinish <= checkpoint) done += 1; }));
      out.push({ label: formatCheckpoint(checkpoint, cfg.fmt), value: Math.round((done / totalTasks) * 100) });
    }
    return out;
  }, [projects, today, trendRange]);

  const upcomingDeadlines = useMemo(() => {
    const items: { taskName: string; projectId: string; projectName: string; plannedFinish: string }[] = [];
    projects.forEach(p => (p.taskLite || []).forEach(t => {
      if (t.status !== "Completed") items.push({ taskName: t.name, projectId: p.id, projectName: p.name, plannedFinish: t.plannedFinish });
    }));
    items.sort((a, b) => a.plannedFinish.localeCompare(b.plannedFinish));
    return items;
  }, [projects]);

  const overdueDeadlines = useMemo(
    () => upcomingDeadlines.filter(d => diffDays(d.plannedFinish, today) < 0),
    [upcomingDeadlines, today],
  );
  const upcomingOnlyDeadlines = useMemo(
    () => upcomingDeadlines.filter(d => diffDays(d.plannedFinish, today) >= 0),
    [upcomingDeadlines, today],
  );

  const projectOptions = useMemo(() => projects.map(p => ({ id: p.id, name: p.name })), [projects]);

  const raiseTicket = async (payload: CreateTicketInput) => {
    if (!roleCan(role, "raiseTicket")) return;
    setTicketBusy(true);
    try {
      await createTicketApi(payload);
      setShowTicketForm(false);
    } catch (e) {
      console.error(e);
    }
    setTicketBusy(false);
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
        <Box>
          {/* <Typography variant="h4">Project Portfolio</Typography> */}
          <Typography color="text.primary" sx={{ mt: 0.15 }}>Track all projects, progress, and overall portfolio health.</Typography>
        </Box>
        <Stack direction="row" spacing={1.25}>
          {roleCan(role, "raiseTicket") && (
            <Button variant="outlined" startIcon={<FlagCircleIcon />} onClick={() => setShowTicketForm(true)} disabled={!projectOptions.length}>
              Raise ticket
            </Button>
          )}
          {roleCan(role, "createProject") && <Button variant="contained" startIcon={<AddIcon />} onClick={onNew}>New project</Button>}
        </Stack>
      </Stack>

      <Grid container spacing={1.5} sx={{ mt: 2.5, mb: 1.5 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard icon={WorkOutlinedIcon} label="Active Projects" value={portfolio.count} color={DASHBOARD_COLORS.blue} trend={trends?.active} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard icon={TrendingUpIcon} label="On Track" value={health["On Track"]} color={DASHBOARD_COLORS.green} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard icon={CheckCircleIcon} label="Completed" value={portfolio.completedCount} color={DASHBOARD_COLORS.green} trend={trends?.completed} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard icon={ErrorOutlineIcon} label="Delayed Projects" value={health["Delayed"]}
            color={health["Delayed"] > 0 ? DASHBOARD_COLORS.red : DASHBOARD_COLORS.green} tint={health["Delayed"] > 0} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard icon={DonutLargeIcon} label="Avg. Completion" value={`${portfolio.avgPct}%`} color={DASHBOARD_COLORS.violet} trend={trends?.avg} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard icon={WarningAmberIcon} label="Delayed Tasks" value={portfolio.totalDelayed}
            color={portfolio.totalDelayed > 0 ? DASHBOARD_COLORS.red : DASHBOARD_COLORS.green} trend={trends?.delayed} tint={portfolio.totalDelayed > 0} />
        </Grid>
      </Grid>

      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <AnalyticsCard title="Projects by Status">
            {/* flex:1 + centered so the donut+legend row sits in the middle
                of whatever height this card ends up matching in the grid row,
                instead of top-aligning and leaving bare space below it. */}
            <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center" }}>
              <Stack direction="row" alignItems="center" spacing={5} sx={{ width: "100%" }}>
                <DonutChart
                  segments={healthLegend.filter(h => health[h.key] > 0).map(h => ({ value: health[h.key], color: h.color }))}
                  centerValue={projects.length}
                  centerLabel="Total"
                  size={190}
                  strokeRatio={0.18}
                />
                <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
                  {healthLegend.map(h => {
                    const count = health[h.key];
                    const pct = projects.length ? Math.round((count / projects.length) * 100) : 0;
                    return (
                      <Stack key={h.key} direction="row" alignItems="center" spacing={1.25}>
                        <Box sx={{ width: 11, height: 11, borderRadius: "50%", bgcolor: h.color, flexShrink: 0 }} />
                        <Typography variant="body1" sx={{ flex: 1, fontWeight: 500 }} noWrap>{h.key}</Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 700 }}>{count} ({pct}%)</Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </Stack>
            </Box>
          </AnalyticsCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <AnalyticsCard
            title="Average Completion Trend"
            action={
              <Select size="small" value={trendRange} onChange={(e: SelectChangeEvent) => setTrendRange(e.target.value as TrendRange)}
                sx={{ fontSize: 13, "& .MuiSelect-select": { py: 0.5 } }}>
                <MenuItem value="month" sx={{ fontSize: 13 }}>This Month</MenuItem>
                <MenuItem value="quarter" sx={{ fontSize: 13 }}>This Quarter</MenuItem>
                <MenuItem value="year" sx={{ fontSize: 13 }}>This Year</MenuItem>
              </Select>
            }
          >
            {trendPoints.length ? (
              <>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
                  <Box sx={{ width: 14, height: 2.5, borderRadius: 1, bgcolor: theme.palette.primary.main }} />
                  <Typography variant="caption" color="text.secondary">Avg. Completion %</Typography>
                </Stack>
                <TrendLineChart points={trendPoints} />
              </>
            ) : (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>Not enough data yet.</Typography>
            )}
          </AnalyticsCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <AnalyticsCard
            title="Deadline"
            action={
              <ToggleButtonGroup size="small" exclusive value={deadlineFilter}
                onChange={(_e, v: "upcoming" | "overdue" | null) => v && setDeadlineFilter(v)}
                sx={{ "& .MuiToggleButton-root": { fontSize: 11.5, px: 1.25, py: 0.25 } }}>
                <ToggleButton value="upcoming">Upcoming</ToggleButton>
                <ToggleButton value="overdue">Overdue</ToggleButton>
              </ToggleButtonGroup>
            }
          >
            {(() => {
              const list = deadlineFilter === "overdue" ? overdueDeadlines : upcomingOnlyDeadlines;
              if (list.length === 0) {
                return (
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                    {deadlineFilter === "overdue" ? "No overdue tasks — you're all caught up." : "Nothing upcoming right now."}
                  </Typography>
                );
              }
              return (
              <Stack spacing={1.25}>
                {list.slice(0, 3).map((d, i) => {
                  const badge = dateBadge(d.plannedFinish);
                  const chip = deadlineChip(d.plannedFinish, today);
                  return (
                    <Box key={i} onClick={() => onOpen(d.projectId)} sx={{
                      display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer",
                      p: 1, borderRadius: 2, "&:hover": { bgcolor: "action.hover" },
                    }}>
                      <Box sx={{
                        width: 42, textAlign: "center", flexShrink: 0, borderRadius: 1.5, overflow: "hidden",
                        border: "1px solid", borderColor: alpha(chip.hex, 0.25),
                      }}>
                        <Box sx={{ bgcolor: alpha(chip.hex, 0.16), py: 0.3 }}>
                          <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: chip.hex, lineHeight: 1.3 }}>{badge.month}</Typography>
                        </Box>
                        <Box sx={{ bgcolor: "background.paper", py: 0.35 }}>
                          <Typography sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2, color: chip.hex }}>{badge.day}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{d.taskName}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>{d.projectName}</Typography>
                      </Box>
                      <Chip label={chip.label} size="small" variant="outlined" sx={{
                        flexShrink: 0, fontSize: 10.5, color: chip.hex, borderColor: chip.hex, bgcolor: alpha(chip.hex, 0.1),
                      }} />
                    </Box>
                  );
                })}
              </Stack>
              );
            })()}
          </AnalyticsCard>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ my: 2.5 }}>
        <TextField
          fullWidth size="small" placeholder="Search by project or customer…" value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <Select size="small" value={typeFilter} onChange={(e: SelectChangeEvent) => setTypeFilter(e.target.value as "All" | ProjectType)}
          sx={{ minWidth: 150, flexShrink: 0 }}>
          <MenuItem value="All">All Projects</MenuItem>
          <MenuItem value="Product">Product</MenuItem>
          <MenuItem value="Solution">Solution</MenuItem>
        </Select>
        <Select size="small" value={dateScope} onChange={(e: SelectChangeEvent) => setDateScope(e.target.value as DateScope)}
          startAdornment={<InputAdornment position="start"><CalendarMonthIcon fontSize="small" sx={{ ml: 0.5 }} /></InputAdornment>}
          sx={{ minWidth: 160, flexShrink: 0 }}>
          <MenuItem value="all">All Time</MenuItem>
          <MenuItem value="month">This Month</MenuItem>
          <MenuItem value="quarter">This Quarter</MenuItem>
          <MenuItem value="year">{currentFiscalYearLabel(today)}</MenuItem>
        </Select>
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
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flex: 1, minWidth: 0, pr: 1 }}>
                  <Icon sx={{ fontSize: 19, color }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{label}</Typography>
                  <Chip label={grouped[key].length} size="small" />
                  <Box sx={{ flex: 1 }} />
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

      {showTicketForm && roleCan(role, "raiseTicket") && (
        <TicketForm projects={projectOptions} busy={ticketBusy} onClose={() => setShowTicketForm(false)} onSubmit={raiseTicket} />
      )}
    </Box>
  );
}
