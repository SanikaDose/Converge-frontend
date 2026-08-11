"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { TicketsPanel } from "@/components/TicketsPanel";
import { StatCard, computeStatTrend } from "@/components/common";
import { fetchProjectsIndex, fetchTickets, fetchDashboardBaseline } from "@/lib/api";
import { DASHBOARD_COLORS } from "@/lib/theme";
import { useAppContext } from "@/context/AppContext";
import type { DashboardBaseline, ProjectIndexRow, Ticket } from "@/lib/types";

export default function TicketsPage() {
  const { actor } = useAppContext();
  const [projects, setProjects] = useState<ProjectIndexRow[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [baseline, setBaseline] = useState<DashboardBaseline | null>(null);

  const loadTickets = useCallback(async () => {
    try { setTickets(await fetchTickets()); } catch { setTickets([]); }
  }, []);
  const load = useCallback(async () => {
    try { setProjects(await fetchProjectsIndex()); } catch { setProjects([]); }
    await loadTickets();
  }, [loadTickets]);
  useEffect(() => { load(); }, [load]);

  // Baseline is a real snapshot captured once per backend session (see
  // Dashboard.tsx's identical pattern) — fetched once, not on every
  // refresh, so the "vs last month" comparison stays stable.
  useEffect(() => { fetchDashboardBaseline().then(setBaseline).catch(() => setBaseline(null)); }, []);

  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === "Open" || t.status === "In Progress").length;
    const resolved = tickets.filter(t => t.status === "Resolved" || t.status === "Closed").length;
    const resolutionPct = total ? Math.round((resolved / total) * 100) : 0;
    return { total, open, resolved, resolutionPct };
  }, [tickets]);

  const trends = useMemo(() => baseline ? {
    total: computeStatTrend(stats.total, baseline.totalTickets, "", "up"),
    resolved: computeStatTrend(stats.resolved, baseline.resolvedTickets, "", "up"),
    resolutionPct: computeStatTrend(stats.resolutionPct, baseline.ticketResolutionPct, "%", "up"),
    open: computeStatTrend(stats.open, baseline.openTickets, "", "down"),
  } : null, [baseline, stats]);

  return (
    <Box>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={ConfirmationNumberIcon} label="Total Tickets" value={stats.total} color={DASHBOARD_COLORS.blue} trend={trends?.total} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={CheckCircleIcon} label="Resolved" value={stats.resolved} color={DASHBOARD_COLORS.green} trend={trends?.resolved} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={DonutLargeIcon} label="Resolution Rate" value={`${stats.resolutionPct}%`} color={DASHBOARD_COLORS.violet} trend={trends?.resolutionPct} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={WarningAmberIcon} label="Open Tickets" value={stats.open}
            color={stats.open > 0 ? DASHBOARD_COLORS.red : DASHBOARD_COLORS.green} trend={trends?.open} tint={stats.open > 0} />
        </Grid>
      </Grid>

      <TicketsPanel
        actor={actor}
        projects={projects.map(p => ({ id: p.id, name: p.name }))}
        refreshKey={0}
        onChanged={loadTickets}
      />
    </Box>
  );
}
